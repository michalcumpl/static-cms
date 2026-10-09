import { upgradeSite } from "@webmio/templates";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../db/index";
import { siteDocuments, versions } from "../db/schema";
import { primaryLanguage, readSite, type SaveResult, saveSite } from "../site-documents";
import { projectImport } from "./job";

// Marking imported images decorative (import-review-actions design decision 4): the images the
// import (or a retry) placed that still have no description, never the owner's own.

type Node = { id: string; type: string; alt?: string; decorative?: boolean };
type Doc = { nodes: Record<string, Node> };

/** The node IDs of the images the import and its retries placed. */
function importedImageIds(db: Db, projectId: string): Set<string> {
  const imp = projectImport(db, projectId);
  if (!imp) return new Set();
  const lang = primaryLanguage(db, projectId) ?? "";
  // Imports made before retries: the project's first version is the import's.
  const versionId =
    imp.importVersionId ??
    db
      .select({ id: versions.id })
      .from(versions)
      .innerJoin(siteDocuments, eq(siteDocuments.id, versions.documentId))
      .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, lang)))
      .orderBy(asc(versions.createdAt))
      .get()?.id;
  const row = versionId
    ? db.select().from(versions).where(eq(versions.id, versionId)).get()
    : undefined;
  const ids = new Set(imp.retryState?.importedImages ?? []);
  if (row) {
    const doc = upgradeSite(row.document) as Doc;
    for (const node of Object.values(doc.nodes)) if (node.type === "image") ids.add(node.id);
  }
  return ids;
}

/** The imported images in the saved document still without a description. */
export function undescribedImportedImages(db: Db, projectId: string): string[] {
  const doc = readSite(db, projectId)?.document as Doc | undefined;
  if (!doc) return [];
  const imported = importedImageIds(db, projectId);
  return Object.values(doc.nodes)
    .filter(
      (n) => n.type === "image" && imported.has(n.id) && !n.decorative && !(n.alt ?? "").trim(),
    )
    .map((n) => n.id);
}

export type DecorativeResult = SaveResult | { ok: false; reason: "nothing" };

/** Marks the imported images without a description decorative, as one saved version. */
export function markImportedImagesDecorative(
  db: Db,
  projectId: string,
  userId: string,
): DecorativeResult {
  const snapshot = readSite(db, projectId);
  const ids = undescribedImportedImages(db, projectId);
  if (!snapshot || ids.length === 0) return { ok: false, reason: "nothing" };
  const doc = structuredClone(snapshot.document) as Doc;
  for (const id of ids) {
    const node = doc.nodes[id];
    if (node) node.decorative = true;
  }
  return saveSite(db, projectId, userId, doc, snapshot.version);
}
