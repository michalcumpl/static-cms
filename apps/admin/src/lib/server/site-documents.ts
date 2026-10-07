import { randomUUID } from "node:crypto";
import {
  applySharedFields,
  copyPageInto,
  migrateSite,
  type Problem,
  type TranslationPage,
  translationStatus,
  translationSummary,
  validateSite,
} from "@webmio/model";
import { isLanguageCode, languageName } from "@webmio/render";
import { and, eq, sql } from "drizzle-orm";
import { type Said, said } from "$lib/i18n";
import type { Db } from "./db/index";
import { projects, siteDocuments, versions } from "./db/schema";
import { starterSite } from "./demo";
import { newId } from "./ids";

/** The language new projects are created in, and their primary language. */
export const DEFAULT_LANG = "cs";

export interface SiteSnapshot {
  document: unknown;
  /** Opaque; changes on every accepted save. */
  version: string;
  /** The stored version row this document comes from (for publishing). */
  versionId: string;
  problems: Problem[];
}

export type SaveResult =
  | { ok: true; version: string; problems: Problem[] }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "invalid"; problems: Problem[] };

/** A stored document's row and its current, upgraded document. */
function currentDocument(db: Db, projectId: string, lang: string) {
  const row = db
    .select({
      version: siteDocuments.version,
      versionId: siteDocuments.currentVersionId,
      document: versions.document,
    })
    .from(siteDocuments)
    .innerJoin(versions, eq(versions.id, siteDocuments.currentVersionId))
    .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, lang)))
    .get();
  return row ? { ...row, document: migrateSite(row.document) } : undefined;
}

/** The project's primary language, or undefined when there is no such project. */
export function primaryLanguage(db: Db, projectId: string): string | undefined {
  return db
    .select({ lang: projects.primaryLang })
    .from(projects)
    .where(eq(projects.id, projectId))
    .get()?.lang;
}

/**
 * A project's current document in a language (the primary when none is given), its version and
 * its problems, or undefined if there is none. Documents stored in an older format are upgraded
 * here, on every read; the upgrade is stored by the next save, which the returned (stored)
 * version allows. Another language gets the primary's shared fields (languages design.md
 * decision 1).
 */
export function readSite(db: Db, projectId: string, lang?: string): SiteSnapshot | undefined {
  const primary = primaryLanguage(db, projectId);
  if (primary === undefined) return undefined;
  const wanted = lang ?? primary;
  const row = currentDocument(db, projectId, wanted);
  if (!row) return undefined;
  let document = row.document;
  if (wanted !== primary) {
    const source = currentDocument(db, projectId, primary);
    if (source) document = applySharedFields(source.document, document);
  }
  return {
    document,
    version: row.version,
    versionId: row.versionId,
    problems: validateSite(document).problems,
  };
}

/**
 * Saves a project's document in a language (the primary when none is given) based on
 * `baseVersion`. Structurally broken documents are refused; site-rule problems are saved and
 * returned. The version check and the write happen in one transaction, so two saves on the same
 * base can't both succeed. Other languages are never changed.
 */
export function saveSite(
  db: Db,
  projectId: string,
  userId: string | null,
  document: unknown,
  baseVersion: string,
  lang?: string,
  options: { restoredFrom?: string } = {},
): SaveResult {
  const { problems } = validateSite(document);
  const broken = problems.filter((p) => p.category === "structure" && p.severity === "error");
  if (broken.length > 0) return { ok: false, reason: "invalid", problems: broken };
  const wanted = lang ?? primaryLanguage(db, projectId);
  if (wanted === undefined) return { ok: false, reason: "conflict" };

  const version = randomUUID();
  const versionId = newId("v");
  const accepted = db.transaction((tx) => {
    const doc = tx
      .select({ id: siteDocuments.id })
      .from(siteDocuments)
      .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, wanted)))
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
        restoredFrom: options.restoredFrom ?? null,
      })
      .run();
    return true;
  });
  return accepted ? { ok: true, version, problems } : { ok: false, reason: "conflict" };
}

export interface ProjectLanguage {
  lang: string;
  name: string;
  primary: boolean;
  /** Part of publishes; always true for the primary. */
  published: boolean;
}

/** A project's languages: the primary first, then the others in the order they were added. */
export function projectLanguages(db: Db, projectId: string): ProjectLanguage[] {
  const primary = primaryLanguage(db, projectId);
  if (primary === undefined) return [];
  const rows = db
    .select({ lang: siteDocuments.lang, published: siteDocuments.published })
    .from(siteDocuments)
    .where(eq(siteDocuments.projectId, projectId))
    .orderBy(sql`rowid`)
    .all();
  const languages = rows.map((row) => ({
    lang: row.lang,
    name: languageName(row.lang),
    primary: row.lang === primary,
    published: row.lang === primary || row.published,
  }));
  return [...languages.filter((l) => l.primary), ...languages.filter((l) => !l.primary)];
}

export interface LanguageSite extends SiteSnapshot {
  lang: string;
  primary: boolean;
}

/**
 * The current document of each of a project's languages, the primary first, with shared fields
 * applied: every language (the preview) or only the published ones (publish, ZIP download).
 */
export function readLanguages(
  db: Db,
  projectId: string,
  which: "all" | "published",
): LanguageSite[] {
  return projectLanguages(db, projectId)
    .filter((language) => which === "all" || language.published)
    .flatMap((language) => {
      const site = readSite(db, projectId, language.lang);
      return site ? [{ ...site, lang: language.lang, primary: language.primary }] : [];
    });
}

/** Errors of several languages, each named by its language when there are several. */
export function languageErrors(sites: readonly LanguageSite[]): Problem[] {
  return sites.flatMap((site) =>
    site.problems
      .filter((p) => p.severity === "error")
      .map((p) =>
        sites.length > 1 ? { ...p, message: `${languageName(site.lang)}: ${p.message}` } : p,
      ),
  );
}

export type CopyPageResult =
  | { ok: true; pageId: string; title: string }
  | { ok: false; reason: "not-found" | "exists" | "conflict"; message: Said };

/**
 * Copies a page, as last saved in `from`, into the language `to` (language-tools design.md
 * decision 3), saved as one new version of `to`'s document. Other languages are untouched.
 */
export function copyPageToLanguage(
  db: Db,
  projectId: string,
  from: string,
  pageId: string,
  to: string,
  userId: string | null,
): CopyPageResult {
  const source = readSite(db, projectId, from);
  const target = readSite(db, projectId, to);
  if (!source || !target || from === to) {
    return { ok: false, reason: "not-found", message: said("server.languages.noSuchLanguage") };
  }
  return copyPageOnto(db, projectId, source.document, pageId, to, target, userId);
}

/**
 * The copy itself, onto a given snapshot of the target language: saved based on the snapshot's
 * version, so a target changed since the snapshot is a conflict and nothing is written.
 */
export function copyPageOnto(
  db: Db,
  projectId: string,
  source: unknown,
  pageId: string,
  to: string,
  target: SiteSnapshot,
  userId: string | null,
): CopyPageResult {
  const copied = copyPageInto(source, pageId, target.document, () => `n${randomUUID()}`);
  if (!copied.ok) {
    return copied.reason === "exists"
      ? {
          ok: false,
          reason: "exists",
          message: said("server.languages.pageExists", { title: copied.title }),
        }
      : { ok: false, reason: "not-found", message: said("server.languages.noSuchPage") };
  }
  const saved = saveSite(db, projectId, userId, copied.document, target.version, to);
  if (!saved.ok) {
    return {
      ok: false,
      reason: "conflict",
      message: said("server.languages.changedMeanwhile", { language: languageName(to) }),
    };
  }
  const page = (copied.document as { nodes: Record<string, { title?: string }> }).nodes[
    copied.pageId
  ];
  return { ok: true, pageId: copied.pageId, title: page?.title ?? "" };
}

export interface LanguageTranslations {
  lang: string;
  name: string;
  primary: boolean;
  pages: TranslationPage[];
  /** Compared with the primary: pages not translated yet, and the primary's missing pages. */
  untranslated: TranslationPage[];
  missing: TranslationPage[];
}

/** Every language's pages, and what each one still needs compared with the primary. */
export function projectTranslations(db: Db, projectId: string): LanguageTranslations[] {
  const sites = readLanguages(db, projectId, "all");
  const primary = sites.find((site) => site.primary);
  return sites.map((site) => {
    const status =
      primary && !site.primary
        ? translationStatus(primary.document, site.document)
        : { untranslated: [], missing: [] };
    return {
      lang: site.lang,
      name: languageName(site.lang),
      primary: site.primary,
      pages: translationSummary(site.document),
      ...status,
    };
  });
}

/** A page of one language, as the project's Pages tab lists it. */
export interface PageEntry extends TranslationPage {
  inMenu: boolean;
}

/** A language's saved pages in site order, with whether each is in the menu. */
export function languagePages(db: Db, projectId: string, lang: string): PageEntry[] | undefined {
  const site = readLanguages(db, projectId, "all").find((s) => s.lang === lang);
  if (!site) return undefined;
  const doc = site.document as {
    document_id: string;
    nodes: Record<
      string,
      { type?: string; nav?: string; page_id?: string; items?: { nodes: string[] } }
    >;
  };
  const nav = doc.nodes[doc.nodes[doc.document_id]?.nav ?? ""];
  const inMenu = new Set(
    (nav?.items?.nodes ?? []).flatMap((id) => {
      const item = doc.nodes[id];
      return item?.type === "page_link" && item.page_id ? [item.page_id] : [];
    }),
  );
  return translationSummary(site.document).map((page) => ({
    ...page,
    inMenu: inMenu.has(page.pageId),
  }));
}

export type LanguageChange =
  | { ok: true }
  | { ok: false; reason: "not-found" | "exists" | "not-offered" | "primary"; message: Said };

/**
 * Adds a language as a copy of the primary's current document (same nodes and IDs, so pages
 * stay paired), hidden until published. The copy is the new document's first version.
 */
export function addLanguage(
  db: Db,
  projectId: string,
  lang: string,
  userId: string | null,
): LanguageChange {
  if (!isLanguageCode(lang)) {
    return {
      ok: false,
      reason: "not-offered",
      message: said("server.languages.notOffered", { lang }),
    };
  }
  const primary = primaryLanguage(db, projectId);
  const source = primary === undefined ? undefined : currentDocument(db, projectId, primary);
  if (!source)
    return { ok: false, reason: "not-found", message: said("server.languages.noSuchProject") };
  if (projectLanguages(db, projectId).some((l) => l.lang === lang)) {
    return {
      ok: false,
      reason: "exists",
      message: said("server.languages.alreadyHas", { language: languageName(lang) }),
    };
  }
  const doc = source.document as { document_id: string; nodes: Record<string, object> };
  const copy = {
    ...doc,
    nodes: { ...doc.nodes, [doc.document_id]: { ...doc.nodes[doc.document_id], lang } },
  };
  const documentId = newId("d");
  const versionId = newId("v");
  const version = randomUUID();
  db.transaction((tx) => {
    tx.insert(siteDocuments)
      .values({
        id: documentId,
        projectId,
        lang,
        published: false,
        version,
        currentVersionId: versionId,
      })
      .run();
    tx.insert(versions)
      .values({
        id: versionId,
        documentId,
        version,
        document: copy,
        createdAt: new Date(),
        createdBy: userId,
      })
      .run();
  });
  return { ok: true };
}

/** Publishes or hides a language other than the primary. */
export function setLanguagePublished(
  db: Db,
  projectId: string,
  lang: string,
  published: boolean,
): LanguageChange {
  if (primaryLanguage(db, projectId) === lang) {
    return { ok: false, reason: "primary", message: said("server.languages.primaryPublished") };
  }
  const result = db
    .update(siteDocuments)
    .set({ published })
    .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, lang)))
    .run();
  return result.changes > 0
    ? { ok: true }
    : { ok: false, reason: "not-found", message: said("server.languages.noSuchLanguage") };
}

/** Removes a language other than the primary, with its versions. */
export function removeLanguage(db: Db, projectId: string, lang: string): LanguageChange {
  if (primaryLanguage(db, projectId) === lang) {
    return { ok: false, reason: "primary", message: said("server.languages.primaryKept") };
  }
  const result = db
    .delete(siteDocuments)
    .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, lang)))
    .run();
  return result.changes > 0
    ? { ok: true }
    : { ok: false, reason: "not-found", message: said("server.languages.noSuchLanguage") };
}

/** Creates a project with its first document (the starter site, named after the project). */
export function createProject(
  db: Db,
  workspaceId: string,
  name: string,
  document: unknown = starterSite(name),
  createdBy: string | null = null,
  /** The project's primary language; the admin creates projects in Czech (example-sites). */
  primaryLang: string = DEFAULT_LANG,
): string {
  const projectId = newId("p");
  const documentId = newId("d");
  const versionId = newId("v");
  const version = randomUUID();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(projects)
      .values({ id: projectId, workspaceId, name, primaryLang, createdAt: now })
      .run();
    tx.insert(siteDocuments)
      .values({
        id: documentId,
        projectId,
        lang: primaryLang,
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
