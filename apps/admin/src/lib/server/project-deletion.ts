// Deleting, restoring and removing projects (project-deletion design decisions 1–3). Deleting
// hides a project and takes its website offline; restoring brings it back unpublished; removing
// deletes it for good, rows and image files. Removing deleted projects automatically comes with
// scheduled jobs.
import { rmSync } from "node:fs";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { type Said, said } from "$lib/i18n";
import type { Db } from "./db/index";
import { projectHosting, projects, users } from "./db/schema";
import { mediaRoot } from "./import-working-copy";
import { projectFolder } from "./media";
import { type HostingEnv, targetFor } from "./publishing/connection";
import { hostedSite, PublishError, type PublishErrorKind } from "./publishing/target";

export type DeleteResult =
  | { ok: true }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: PublishErrorKind; message: Said };

/**
 * Deletes a live project: its website first (offline at once, its custom domain freed), then its
 * hosting record, and it's marked deleted. When the hosting fails nothing changes; when a
 * Netlify site's workspace isn't connected any more, the site is left as it is.
 */
export async function deleteProject(
  db: Db,
  projectId: string,
  userId: string,
  options: HostingEnv = {},
): Promise<DeleteResult> {
  const project = db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .get();
  if (!project) return { ok: false, reason: "not-found" };
  const hosting = db
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get();
  const chosen = hosting ? targetFor(db, projectId, options) : undefined;
  if (hosting && !chosen?.ok && hosting.provider === "webmio") {
    // A website on Webmio hosting can't be left online behind the owner's back.
    return {
      ok: false,
      reason: "unreachable",
      message: said("server.webmio.unreachable"),
    };
  }
  if (hosting && chosen?.ok) {
    try {
      await chosen.value.target.deleteSite(hosting.siteId, hostedSite(hosting));
    } catch (error) {
      if (error instanceof PublishError) {
        return { ok: false, reason: error.kind, message: error.said };
      }
      throw error;
    }
  }
  db.transaction((tx) => {
    tx.delete(projectHosting).where(eq(projectHosting.projectId, projectId)).run();
    tx.update(projects)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(eq(projects.id, projectId))
      .run();
  });
  return { ok: true };
}

/** Brings a deleted project of the workspace back, unpublished. False when there is none. */
export function restoreProject(db: Db, workspaceId: string, projectId: string): boolean {
  const result = db
    .update(projects)
    .set({ deletedAt: null, deletedBy: null })
    .where(deletedIn(workspaceId, projectId))
    .run();
  return result.changes > 0;
}

/**
 * Removes a deleted project of the workspace for good: its rows through the foreign keys'
 * cascade, then its image files, after the commit. False when there is no such deleted project.
 */
export function purgeProject(
  db: Db,
  workspaceId: string,
  projectId: string,
  root = mediaRoot(),
): boolean {
  const result = db.delete(projects).where(deletedIn(workspaceId, projectId)).run();
  if (result.changes === 0) return false;
  rmSync(projectFolder(projectId, root), { recursive: true, force: true });
  return true;
}

export interface DeletedProject {
  id: string;
  name: string;
  deletedAt: Date;
  /** Who deleted it; null when that account is gone. */
  deletedBy: string | null;
}

/** The workspace's deleted projects, the most recently deleted first. */
export function deletedProjects(db: Db, workspaceId: string): DeletedProject[] {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      deletedAt: projects.deletedAt,
      deletedBy: users.email,
    })
    .from(projects)
    .leftJoin(users, eq(users.id, projects.deletedBy))
    .where(and(eq(projects.workspaceId, workspaceId), isNotNull(projects.deletedAt)))
    .orderBy(desc(projects.deletedAt))
    .all()
    .map((row) => ({ ...row, deletedAt: row.deletedAt as Date }));
}

const deletedIn = (workspaceId: string, projectId: string) =>
  and(
    eq(projects.id, projectId),
    eq(projects.workspaceId, workspaceId),
    isNotNull(projects.deletedAt),
  );
