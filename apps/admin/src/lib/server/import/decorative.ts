import { upgradeSite } from "@webmio/templates";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../db/index";
import { siteDocuments, versions } from "../db/schema";
import {
  primaryLanguage,
  projectLanguages,
  readSite,
  type SaveResult,
  saveSite,
} from "../site-documents";
import { projectImport } from "./job";

// Marking imported images decorative (import-review-actions design decision 4): the images the
// import (or a retry, or a language import) placed that still have no description, never the
// owner's own.

type Node = { id: string; type: string; alt?: string; decorative?: boolean };
type Doc = { nodes: Record<string, Node> };

/**
 * The node IDs of the images the import and its retries placed in the primary language, or a
 * language import placed in its language (import-languages design decision 7).
 */
function importedImageIds(db: Db, projectId: string, lang: string): Set<string> {
  const imp = projectImport(db, projectId);
  if (!imp) return new Set();
  const primary = lang === primaryLanguage(db, projectId);
  // Imports made before retries: the project's first version is the import's.
  const versionId = primary
    ? (imp.importVersionId ??
      db
        .select({ id: versions.id })
        .from(versions)
        .innerJoin(siteDocuments, eq(siteDocuments.id, versions.documentId))
        .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, lang)))
        .orderBy(asc(versions.createdAt))
        .get()?.id)
    : imp.retryState?.languageVersions?.[lang];
  const row = versionId
    ? db.select().from(versions).where(eq(versions.id, versionId)).get()
    : undefined;
  const ids = new Set(primary ? (imp.retryState?.importedImages ?? []) : []);
  if (row) {
    const doc = upgradeSite(row.document) as Doc;
    for (const node of Object.values(doc.nodes)) if (node.type === "image") ids.add(node.id);
  }
  return ids;
}

/** The imported images in a language's saved document (the primary's) still without a description. */
export function undescribedImportedImages(db: Db, projectId: string, lang?: string): string[] {
  const wanted = lang ?? primaryLanguage(db, projectId) ?? "";
  const doc = readSite(db, projectId, wanted)?.document as Doc | undefined;
  if (!doc) return [];
  const imported = importedImageIds(db, projectId, wanted);
  return Object.values(doc.nodes)
    .filter(
      (n) => n.type === "image" && imported.has(n.id) && !n.decorative && !(n.alt ?? "").trim(),
    )
    .map((n) => n.id);
}

/** The imported images still without a description, in every language that has some. */
export function undescribedImportedByLanguage(
  db: Db,
  projectId: string,
): { lang: string; ids: string[] }[] {
  return projectLanguages(db, projectId)
    .map(({ lang }) => ({ lang, ids: undescribedImportedImages(db, projectId, lang) }))
    .filter((l) => l.ids.length > 0);
}

export type DecorativeResult = SaveResult | { ok: false; reason: "nothing" };

/**
 * Marks the imported images without a description decorative, as one saved version of each
 * language that has some. Stops at the first language saved meanwhile.
 */
export function markImportedImagesDecorative(
  db: Db,
  projectId: string,
  userId: string,
): DecorativeResult {
  let result: DecorativeResult = { ok: false, reason: "nothing" };
  for (const { lang, ids } of undescribedImportedByLanguage(db, projectId)) {
    const snapshot = readSite(db, projectId, lang);
    if (!snapshot) continue;
    const doc = structuredClone(snapshot.document) as Doc;
    for (const id of ids) {
      const node = doc.nodes[id];
      if (node) node.decorative = true;
    }
    result = saveSite(db, projectId, userId, doc, snapshot.version, lang);
    if (!result.ok) return result;
  }
  return result;
}
