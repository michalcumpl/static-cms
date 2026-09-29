// What `pnpm admin …` does (specs/accounts: "Admin command"). Relative imports only, so the
// command can run outside SvelteKit.
import { and, eq, isNull } from "drizzle-orm";
import { createLoginLink, normalizeEmail } from "./auth";
import type { Db } from "./db/index";
import { memberships, users, workspaces } from "./db/schema";
import { newId } from "./ids";
import { DEFAULT_WORKSPACE_NAME } from "./import-working-copy";
import { addMember, createWorkspace } from "./members";

export type CreateUserResult =
  | { ok: true; userId: string; workspaceId: string; joinedImported: boolean; link: string }
  | { ok: false; reason: "exists" | "invalid-email" };

/**
 * Creates a user who owns a new workspace, and a sign-in link for them. On an upgraded
 * installation, the first user instead becomes owner of the imported "Default" workspace.
 */
export function createUser(
  db: Db,
  emailInput: string,
  workspaceName: string,
  origin: string,
): CreateUserResult {
  const email = normalizeEmail(emailInput);
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return { ok: false, reason: "invalid-email" };
  if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
    return { ok: false, reason: "exists" };
  }
  const userId = newId("u");
  db.insert(users).values({ id: userId, email, createdAt: new Date() }).run();

  const imported = db
    .select({ id: workspaces.id })
    .from(workspaces)
    .leftJoin(memberships, eq(memberships.workspaceId, workspaces.id))
    .where(and(eq(workspaces.name, DEFAULT_WORKSPACE_NAME), isNull(memberships.userId)))
    .get();
  let workspaceId: string;
  if (imported) {
    addMember(db, imported.id, userId, "owner");
    workspaceId = imported.id;
  } else {
    workspaceId = createWorkspace(db, workspaceName, userId);
  }
  return {
    ok: true,
    userId,
    workspaceId,
    joinedImported: Boolean(imported),
    link: createLoginLink(db, userId, origin),
  };
}
