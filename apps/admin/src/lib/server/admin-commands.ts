// What `pnpm admin …` does (specs/accounts: "Admin command"). Relative imports only, so the
// command can run outside SvelteKit.
import { and, eq, isNull } from "drizzle-orm";
import { sayIn } from "../i18n/translate";
import { createLoginLink, normalizeEmail } from "./auth";
import type { Db } from "./db/index";
import { memberships, users, workspaces } from "./db/schema";
import { newId } from "./ids";
import { importsSettled, readImport, startImport } from "./import/job";
import type { SafeFetchOptions } from "./import/safe-fetch";
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

/** A line of output, for printing (the command) or collecting (tests). */
export type Log = (line: string) => void;

/**
 * Imports a website into a workspace (site-import spec, "Admin command"), as the workspace's
 * first owner: prints the progress, what was imported and left out, and the project's address.
 * The person running it vouches that the content may be used.
 */
export async function importSiteCommand(
  db: Db,
  workspaceId: string,
  address: string,
  origin: string,
  log: Log,
  options: SafeFetchOptions = {},
): Promise<{ ok: true; projectId: string } | { ok: false }> {
  const owner = db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.role, "owner")))
    .get();
  if (!owner) {
    log(`No workspace ${workspaceId} with an owner.`);
    return { ok: false };
  }
  const started = startImport(
    db,
    { workspaceId, userId: owner.userId, address, confirmed: true, locale: "en" },
    options,
  );
  if (!started.ok) {
    log(sayIn("en", started.message));
    return { ok: false };
  }
  let last = "";
  const timer = setInterval(() => {
    const progress = readImport(db, started.importId, owner.userId)?.progress;
    const line = progress ? `${progress.phase}: ${progress.done} of ${progress.total}` : "";
    if (line && line !== last) log((last = line));
  }, 250);
  await importsSettled();
  clearInterval(timer);
  const row = readImport(db, started.importId, owner.userId);
  if (row?.state !== "done" || !row.projectId || !row.report) {
    log(`The import failed: ${row?.error ?? "unknown error"}`);
    return { ok: false };
  }
  const { report } = row;
  log(
    `Imported ${report.pages.length} pages, ${report.images} images, ${report.questions} questions, ${report.socialProfiles} social profiles.`,
  );
  for (const page of report.pages) {
    log(`  ${page.oldPath} → ${page.slug ? `/${page.slug}/` : "/"}  ${page.title}`);
  }
  if (report.leftOut.length > 0) log("Left out:");
  for (const item of report.leftOut) {
    log(
      `  ${item.reason}${item.page ? ` on ${item.page}` : ""}${item.detail ? `: ${item.detail}` : ""}`,
    );
  }
  log(`Project: ${origin}/p/${row.projectId}/`);
  return { ok: true, projectId: row.projectId };
}
