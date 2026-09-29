// Workspaces, members and roles (specs/accounts: "Workspaces and roles"). Plain data rules,
// usable from routes and from the admin command alike.
import { and, asc, eq } from "drizzle-orm";
import type { Db, DbOrTx } from "./db/index";
import { memberships, projects, type Role, users, workspaces } from "./db/schema";
import { newId } from "./ids";

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: Role;
  projects: { id: string; name: string }[];
}

/** The workspaces a user belongs to, with their role and each workspace's projects. */
export function listWorkspaces(db: Db, userId: string): WorkspaceSummary[] {
  const rows = db
    .select({ id: workspaces.id, name: workspaces.name, role: memberships.role })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(workspaces.name))
    .all();
  return rows.map((w) => ({
    ...w,
    projects: db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.workspaceId, w.id))
      .orderBy(asc(projects.name))
      .all(),
  }));
}

/** The user's role in a workspace, or undefined when they aren't a member. */
export function roleIn(db: DbOrTx, userId: string, workspaceId: string): Role | undefined {
  return db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.workspaceId, workspaceId)))
    .get()?.role;
}

export interface ProjectAccess {
  project: { id: string; name: string };
  workspace: { id: string; name: string };
  role: Role;
}

/** A project with its workspace and the user's role, or undefined for non-members. */
export function projectAccess(
  db: Db,
  userId: string,
  projectId: string,
): ProjectAccess | undefined {
  const row = db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      role: memberships.role,
    })
    .from(projects)
    .innerJoin(workspaces, eq(workspaces.id, projects.workspaceId))
    .innerJoin(
      memberships,
      and(eq(memberships.workspaceId, workspaces.id), eq(memberships.userId, userId)),
    )
    .where(eq(projects.id, projectId))
    .get();
  if (!row) return undefined;
  return {
    project: { id: row.projectId, name: row.projectName },
    workspace: { id: row.workspaceId, name: row.workspaceName },
    role: row.role,
  };
}

export function createWorkspace(db: Db, name: string, ownerId: string): string {
  const id = newId("w");
  db.transaction((tx) => {
    tx.insert(workspaces).values({ id, name, createdAt: new Date() }).run();
    tx.insert(memberships)
      .values({ workspaceId: id, userId: ownerId, role: "owner", createdAt: new Date() })
      .run();
  });
  return id;
}

/** Adds a member, or updates the role of an existing one (used by invitations). */
export function addMember(db: DbOrTx, workspaceId: string, userId: string, role: Role): void {
  db.insert(memberships)
    .values({ workspaceId, userId, role, createdAt: new Date() })
    .onConflictDoUpdate({ target: [memberships.workspaceId, memberships.userId], set: { role } })
    .run();
}

export interface Member {
  userId: string;
  email: string;
  role: Role;
}

export function listMembers(db: Db, workspaceId: string): Member[] {
  return db
    .select({ userId: users.id, email: users.email, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.workspaceId, workspaceId))
    .orderBy(asc(users.email))
    .all();
}

export type MemberChange =
  | { ok: true }
  | { ok: false; reason: "forbidden" | "not-found" | "last-owner" };

function ownerCount(db: Db, workspaceId: string): number {
  return db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.role, "owner")))
    .all().length;
}

/** Checks that `actorId` owns the workspace and that `userId` is a member. */
function checkChange(
  db: Db,
  actorId: string,
  workspaceId: string,
  userId: string,
): MemberChange & { targetRole?: Role } {
  if (roleIn(db, actorId, workspaceId) !== "owner") return { ok: false, reason: "forbidden" };
  const targetRole = roleIn(db, userId, workspaceId);
  if (!targetRole) return { ok: false, reason: "not-found" };
  return { ok: true, targetRole };
}

/** Owners change roles; a workspace always keeps at least one owner. */
export function changeRole(
  db: Db,
  actorId: string,
  workspaceId: string,
  userId: string,
  role: Role,
): MemberChange {
  const check = checkChange(db, actorId, workspaceId, userId);
  if (!check.ok) return check;
  if (check.targetRole === "owner" && role !== "owner" && ownerCount(db, workspaceId) === 1) {
    return { ok: false, reason: "last-owner" };
  }
  db.update(memberships)
    .set({ role })
    .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId)))
    .run();
  return { ok: true };
}

/** Owners remove members; the last owner can't be removed. */
export function removeMember(
  db: Db,
  actorId: string,
  workspaceId: string,
  userId: string,
): MemberChange {
  const check = checkChange(db, actorId, workspaceId, userId);
  if (!check.ok) return check;
  if (check.targetRole === "owner" && ownerCount(db, workspaceId) === 1) {
    return { ok: false, reason: "last-owner" };
  }
  db.delete(memberships)
    .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId)))
    .run();
  return { ok: true };
}
