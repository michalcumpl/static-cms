import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { media, projects, siteDocuments, versions } from "./db/schema";
import { projectFolder } from "./media";
import { listWorkspaces, projectAccess } from "./members";
import { deletedProjects, deleteProject, purgeProject, restoreProject } from "./project-deletion";
import { readSite, versionCount } from "./site-documents";
import { useTestProject } from "./test-project";

// Deleting, restoring and removing projects (project-deletion design decisions 1 and 2).

const project = useTestProject();

const listed = () => {
  const { db, owner } = project();
  return listWorkspaces(db, owner.id).flatMap((w) => w.projects.map((p) => p.id));
};

describe("deleting a project", () => {
  it("hides it from the list and from access, keeping its versions and images", async () => {
    const { db, projectId, owner } = project();
    const before = versionCount(db, projectId);
    expect(await deleteProject(db, projectId, owner.id)).toEqual({ ok: true });
    expect(listed()).not.toContain(projectId);
    expect(projectAccess(db, owner.id, projectId)).toBeUndefined();
    expect(versionCount(db, projectId)).toBe(before);
    expect(db.select().from(media).where(eq(media.projectId, projectId)).all()).not.toEqual([]);
    expect(existsSync(projectFolder(projectId))).toBe(true);
  });

  it("lists it as deleted, by whom, and refuses to delete it twice", async () => {
    const { db, projectId, owner, workspaceId } = project();
    await deleteProject(db, projectId, owner.id);
    expect(deletedProjects(db, workspaceId)).toEqual([
      expect.objectContaining({ id: projectId, name: "Pekárna U Lípy", deletedBy: owner.email }),
    ]);
    expect(await deleteProject(db, projectId, owner.id)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("restoring a project", () => {
  it("Restore by mistake: back as it was", async () => {
    const { db, projectId, owner, workspaceId } = project();
    const site = readSite(db, projectId);
    await deleteProject(db, projectId, owner.id);
    expect(restoreProject(db, workspaceId, projectId)).toBe(true);
    expect(listed()).toContain(projectId);
    expect(readSite(db, projectId)?.version).toBe(site?.version);
    expect(deletedProjects(db, workspaceId)).toEqual([]);
  });

  it("restores only a deleted project of the same workspace", async () => {
    const { db, projectId, owner } = project();
    expect(restoreProject(db, project().workspaceId, projectId)).toBe(false);
    await deleteProject(db, projectId, owner.id);
    expect(restoreProject(db, "w_other", projectId)).toBe(false);
  });
});

describe("removing a project for good", () => {
  it("Delete now: removes its rows and image files", async () => {
    const { db, projectId, owner, workspaceId } = project();
    const documentIds = db
      .select({ id: siteDocuments.id })
      .from(siteDocuments)
      .where(eq(siteDocuments.projectId, projectId))
      .all()
      .map((d) => d.id);
    await deleteProject(db, projectId, owner.id);
    expect(purgeProject(db, workspaceId, projectId)).toBe(true);
    expect(db.select().from(projects).where(eq(projects.id, projectId)).all()).toEqual([]);
    expect(db.select().from(media).where(eq(media.projectId, projectId)).all()).toEqual([]);
    for (const id of documentIds) {
      expect(db.select().from(versions).where(eq(versions.documentId, id)).all()).toEqual([]);
    }
    expect(existsSync(projectFolder(projectId))).toBe(false);
    expect(deletedProjects(db, workspaceId)).toEqual([]);
  });

  it("removes only deleted projects, and copes with a missing image folder", async () => {
    const { db, projectId, owner, workspaceId } = project();
    expect(purgeProject(db, workspaceId, projectId)).toBe(false);
    expect(listed()).toContain(projectId);
    await deleteProject(db, projectId, owner.id);
    expect(purgeProject(db, workspaceId, projectId, "/nonexistent-media-root")).toBe(true);
  });
});
