import { randomUUID } from "node:crypto";
import { migrateSite, type Problem, validateSite } from "@static-cms/site";
import { and, eq } from "drizzle-orm";
import type { Db } from "./db/index";
import { projects, siteDocuments, versions } from "./db/schema";
import { starterSite } from "./demo";
import { newId } from "./ids";

/** Until Milestone 5 every project has exactly one document, in this language. */
export const DEFAULT_LANG = "cs";

export interface SiteSnapshot {
  document: unknown;
  /** Opaque; changes on every accepted save. */
  version: string;
  problems: Problem[];
}

export type SaveResult =
  | { ok: true; version: string; problems: Problem[] }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "invalid"; problems: Problem[] };

/**
 * A project's current document, its version and its problems, or undefined if there is none.
 * Documents stored in an older format are upgraded here, on every read; the upgrade is stored
 * by the next save, which the returned (stored) version allows.
 */
export function readSite(db: Db, projectId: string): SiteSnapshot | undefined {
  const row = db
    .select({ version: siteDocuments.version, document: versions.document })
    .from(siteDocuments)
    .innerJoin(versions, eq(versions.id, siteDocuments.currentVersionId))
    .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, DEFAULT_LANG)))
    .get();
  if (!row) return undefined;
  const document = migrateSite(row.document);
  return { document, version: row.version, problems: validateSite(document).problems };
}

/**
 * Saves a project's document based on `baseVersion`. Structurally broken documents are
 * refused; site-rule problems are saved and returned. The version check and the write
 * happen in one transaction, so two saves on the same base can't both succeed.
 */
export function saveSite(
  db: Db,
  projectId: string,
  userId: string | null,
  document: unknown,
  baseVersion: string,
): SaveResult {
  const { problems } = validateSite(document);
  const broken = problems.filter((p) => p.category === "structure" && p.severity === "error");
  if (broken.length > 0) return { ok: false, reason: "invalid", problems: broken };

  const version = randomUUID();
  const versionId = newId("v");
  const accepted = db.transaction((tx) => {
    const doc = tx
      .select({ id: siteDocuments.id })
      .from(siteDocuments)
      .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, DEFAULT_LANG)))
      .get();
    if (!doc) return false;
    const updated = tx
      .update(siteDocuments)
      .set({ version, currentVersionId: versionId })
      .where(and(eq(siteDocuments.id, doc.id), eq(siteDocuments.version, baseVersion)))
      .run();
    if (updated.changes === 0) return false;
    tx.insert(versions)
      .values({
        id: versionId,
        documentId: doc.id,
        version,
        document,
        createdAt: new Date(),
        createdBy: userId,
      })
      .run();
    return true;
  });
  return accepted ? { ok: true, version, problems } : { ok: false, reason: "conflict" };
}

/** Creates a project with its first document (the starter site, named after the project). */
export function createProject(
  db: Db,
  workspaceId: string,
  name: string,
  document: unknown = starterSite(name),
  createdBy: string | null = null,
): string {
  const projectId = newId("p");
  const documentId = newId("d");
  const versionId = newId("v");
  const version = randomUUID();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(projects).values({ id: projectId, workspaceId, name, createdAt: now }).run();
    tx.insert(siteDocuments)
      .values({
        id: documentId,
        projectId,
        lang: DEFAULT_LANG,
        version,
        currentVersionId: versionId,
      })
      .run();
    tx.insert(versions)
      .values({ id: versionId, documentId, version, document, createdAt: now, createdBy })
      .run();
  });
  return projectId;
}

/** Number of stored versions of a project's document (for tests and, later, history). */
export function versionCount(db: Db, projectId: string): number {
  return db
    .select({ id: versions.id })
    .from(versions)
    .innerJoin(siteDocuments, eq(siteDocuments.id, versions.documentId))
    .where(eq(siteDocuments.projectId, projectId))
    .all().length;
}
