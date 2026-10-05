// A language's saved versions (version-history design.md decision 1): listing them with their
// marks, reading one for its preview, and restoring one as a new version.
import { applySharedFields, migrateSite, type Problem } from "@static-cms/site";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { Db } from "./db/index";
import {
  projectHosting,
  publishDocuments,
  publishes,
  siteDocuments,
  users,
  versions,
} from "./db/schema";
import { primaryLanguage, readSite, saveSite } from "./site-documents";

export interface VersionEntry {
  id: string;
  savedAt: Date;
  /** The email of the member who saved it, or null for a removed account or the system. */
  savedBy: string | null;
  /** Saved by the admin itself (a format upgrade), not by a member. */
  system: boolean;
  current: boolean;
  /** Part of the publish the live site shows. */
  live: boolean;
  /** Part of an earlier successful publish. */
  published: boolean;
  /** The version a restore copied. */
  restoredFrom: { id: string; savedAt: Date } | null;
}

const PAGE = 50;

function documentOf(db: Db, projectId: string, lang: string) {
  return db
    .select({ id: siteDocuments.id, currentVersionId: siteDocuments.currentVersionId })
    .from(siteDocuments)
    .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, lang)))
    .get();
}

/**
 * A language's versions, newest first, `limit` at a time; `before` (a version ID) continues
 * below that version. `more` says whether older ones exist.
 */
export function listVersions(
  db: Db,
  projectId: string,
  lang: string,
  options: { before?: string; limit?: number } = {},
): { versions: VersionEntry[]; more: boolean } | undefined {
  const doc = documentOf(db, projectId, lang);
  if (!doc) return undefined;
  const limit = options.limit ?? PAGE;
  const cursor = options.before
    ? db
        .select({ createdAt: versions.createdAt, rowid: sql<number>`rowid` })
        .from(versions)
        .where(and(eq(versions.id, options.before), eq(versions.documentId, doc.id)))
        .get()
    : undefined;
  const rows = db
    .select({
      id: versions.id,
      createdAt: versions.createdAt,
      savedBy: users.email,
      system: versions.system,
      restoredFrom: versions.restoredFrom,
      rowid: sql<number>`${versions}.rowid`,
    })
    .from(versions)
    .leftJoin(users, eq(users.id, versions.createdBy))
    .where(
      and(
        eq(versions.documentId, doc.id),
        cursor
          ? or(
              lt(versions.createdAt, cursor.createdAt),
              and(
                eq(versions.createdAt, cursor.createdAt),
                lt(sql`${versions}.rowid`, cursor.rowid),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(versions.createdAt), desc(sql`${versions}.rowid`))
    .limit(limit + 1)
    .all();
  const page = rows.slice(0, limit);

  const published = new Set(
    db
      .select({ versionId: publishDocuments.versionId })
      .from(publishDocuments)
      .innerJoin(publishes, eq(publishes.id, publishDocuments.publishId))
      .where(
        and(
          eq(publishes.projectId, projectId),
          eq(publishes.state, "ready"),
          eq(publishDocuments.lang, lang),
        ),
      )
      .all()
      .map((row) => row.versionId),
  );
  const livePublishId = db
    .select({ id: projectHosting.livePublishId })
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get()?.id;
  const live = livePublishId
    ? db
        .select({ versionId: publishDocuments.versionId })
        .from(publishDocuments)
        .where(and(eq(publishDocuments.publishId, livePublishId), eq(publishDocuments.lang, lang)))
        .get()?.versionId
    : undefined;
  const sourceIds = page.flatMap((row) => (row.restoredFrom ? [row.restoredFrom] : []));
  const sources = new Map(
    sourceIds.length === 0
      ? []
      : db
          .select({ id: versions.id, createdAt: versions.createdAt })
          .from(versions)
          .where(inArray(versions.id, sourceIds))
          .all()
          .map((row) => [row.id, row.createdAt] as const),
  );

  return {
    versions: page.map((row) => {
      const sourceAt = row.restoredFrom ? sources.get(row.restoredFrom) : undefined;
      return {
        id: row.id,
        savedAt: row.createdAt,
        savedBy: row.savedBy ?? null,
        system: row.system,
        current: row.id === doc.currentVersionId,
        live: row.id === live,
        published: published.has(row.id) && row.id !== live,
        restoredFrom:
          row.restoredFrom && sourceAt ? { id: row.restoredFrom, savedAt: sourceAt } : null,
      };
    }),
    more: rows.length > limit,
  };
}

/** A stored version of one of the project's documents, with its language. */
function storedVersion(db: Db, projectId: string, versionId: string) {
  return db
    .select({
      lang: siteDocuments.lang,
      document: versions.document,
      createdAt: versions.createdAt,
    })
    .from(versions)
    .innerJoin(siteDocuments, eq(siteDocuments.id, versions.documentId))
    .where(and(eq(versions.id, versionId), eq(siteDocuments.projectId, projectId)))
    .get();
}

/**
 * A version for its preview: upgraded, and for a language other than the primary with the
 * primary's current shared fields, as restoring it would give. Undefined for versions of other
 * projects.
 */
export function readVersion(
  db: Db,
  projectId: string,
  versionId: string,
): { lang: string; document: unknown; savedAt: Date } | undefined {
  const row = storedVersion(db, projectId, versionId);
  if (!row) return undefined;
  let document = migrateSite(row.document);
  if (row.lang !== primaryLanguage(db, projectId)) {
    const primary = readSite(db, projectId);
    if (primary) document = applySharedFields(primary.document, document);
  }
  return { lang: row.lang, document, savedAt: row.createdAt };
}

export type RestoreResult =
  | { ok: true; lang: string; version: string }
  | { ok: false; reason: "not-found" | "conflict" }
  | { ok: false; reason: "invalid"; problems: Problem[] };

/**
 * Restores a version of a language: its (upgraded) document becomes a new version, recording
 * where it came from. Nothing else changes, so restoring is itself undoable.
 */
export function restoreVersion(
  db: Db,
  projectId: string,
  versionId: string,
  userId: string | null,
  /** The language's version the restore is based on; the current one when not given. */
  baseVersion?: string,
): RestoreResult {
  const row = storedVersion(db, projectId, versionId);
  if (!row) return { ok: false, reason: "not-found" };
  const current = readSite(db, projectId, row.lang);
  if (!current) return { ok: false, reason: "not-found" };
  const result = saveSite(
    db,
    projectId,
    userId,
    migrateSite(row.document),
    baseVersion ?? current.version,
    row.lang,
    { restoredFrom: versionId },
  );
  if (result.ok) return { ok: true, lang: row.lang, version: result.version };
  return result.reason === "invalid"
    ? { ok: false, reason: "invalid", problems: result.problems }
    : { ok: false, reason: "conflict" };
}
