import {
  type ImageReference,
  type ImportedPageSummary,
  type ImportReport,
  type LeftOut,
  menuLinks,
  oldPath,
  pageKey,
  pageLanguage,
  readPagesForRetry,
  type SourcePage,
  versionHome,
} from "@webmio/import";
import { blockFactory, escapeInline, validateSite } from "@webmio/model";
import { LANGUAGES, languageName } from "@webmio/render";
import { TEMPLATE_RELEASES } from "@webmio/templates";
import { and, eq } from "drizzle-orm";
import { sayIn } from "../../i18n/translate";
import { type Said, said } from "../../i18n/types";
import type { Db } from "../db/index";
import {
  type ImportProgress,
  importRetries,
  imports,
  pageOrigins,
  type RetryAdded,
  type RetryState,
  siteDocuments,
} from "../db/schema";
import { mediaItem, uploadImage } from "../media";
import { createLanguage, projectLanguages, readSite } from "../site-documents";
import { crawl, fetchPage, siteRobots } from "./crawl";
import { fetchImages } from "./images";
import { FAILURES, IMPORT_DEADLINE_MS } from "./job";
import {
  type Doc,
  hoursDays,
  idMaker,
  idsOf,
  listOf,
  type Node,
  owned,
  type RetryOptions,
} from "./retry";
import type { SafeFetchOptions } from "./safe-fetch";

// Importing another language version of the old site from the review (import-languages).

/** A language version the review offers to import: its language and its home address. */
export interface LanguageOffer {
  lang: string;
  url: string;
}

/** Links without `hreflang` fetched to read their language, at most. */
const MAX_LANGUAGE_FETCHES = 5;

/**
 * The language versions the old home page links (import-languages design decision 1): each
 * named by its `hreflang`, or else by the `lang` of the page it leads to, one per language at its
 * shortest address. `offers` keeps those the admin offers other than `primary`; `langOf` names
 * every link whose language was found, for the report.
 */
export async function languagesOnOffer(
  home: SourcePage,
  primary: string,
  options: SafeFetchOptions = {},
): Promise<{ offers: LanguageOffer[]; langOf: Map<string, string> }> {
  const homeUrl = new URL(home.url);
  const links = menuLinks(home.html, homeUrl).languages.filter(
    (link) => pageKey(new URL(link.url)) !== pageKey(homeUrl),
  );
  const langOf = new Map<string, string>();
  const unnamed = links.filter((link) => !link.lang).slice(0, MAX_LANGUAGE_FETCHES);
  if (unnamed.length > 0) {
    const rules = { homeUrl, homeLang: "", allowed: await siteRobots(homeUrl, options) };
    for (const link of unnamed) {
      const page = await fetchPage(new URL(link.url), rules, options);
      const lang = page.ok ? pageLanguage(page.html) : "";
      if (lang) langOf.set(link.url, lang);
    }
  }
  for (const link of links) if (link.lang) langOf.set(link.url, link.lang);

  const byLang = new Map<string, string>();
  for (const [url, lang] of langOf) {
    const known = byLang.get(lang);
    if (!known || new URL(url).pathname.length < new URL(known).pathname.length)
      byLang.set(lang, url);
  }
  const offers = [...byLang]
    .filter(([lang]) => lang !== primary && lang in LANGUAGES)
    .map(([lang, url]) => ({ lang, url }));
  return { offers, langOf };
}

type PrimaryPage = RetryState["pages"][number];

/**
 * Pairs a version's pages with the primary's imported pages (import-languages design decision
 * 3): the home pages always (each list's first), others when either links the other as another
 * language, the first pair winning. A link to the primary's home doesn't pair another page.
 * Returns the primary page ID by each version page's `pageKey`.
 */
export function pairPages(
  pages: readonly SourcePage[],
  primary: readonly PrimaryPage[],
): Map<string, string> {
  const key = (href: string) => pageKey(new URL(href));
  const [home, ...others] = pages;
  const [primaryHome, ...candidates] = primary;
  const pairs = new Map<string, string>();
  if (!home || !primaryHome) return pairs;
  pairs.set(key(home.url), primaryHome.pageId);
  const claimed = new Set([primaryHome.pageId]);
  for (const page of others) {
    const own = key(page.url);
    const links = new Set(menuLinks(page.html, page.url).languages.map((l) => key(l.url)));
    const match = candidates.find(
      (c) =>
        !claimed.has(c.pageId) &&
        (links.has(key(c.url)) || (c.alternates ?? []).some((a) => key(a) === own)),
    );
    if (match) {
      pairs.set(own, match.pageId);
      claimed.add(match.pageId);
    }
  }
  return pairs;
}

/**
 * Imports another language version of the old site as a new, hidden language of the project
 * (import-languages design decisions 2 to 5): its pages paired with the primary's, its menu and
 * names, its questions on the primary's items, saved as the language's first version.
 */
export async function runLanguageImport(
  db: Db,
  retryId: string,
  importId: string,
  lang: string,
  options: RetryOptions,
): Promise<void> {
  const locale = options.locale ?? "en";
  const progress = (value: ImportProgress) =>
    db.update(importRetries).set({ progress: value }).where(eq(importRetries.id, retryId)).run();
  const fail = (message: Said) =>
    db
      .update(importRetries)
      .set({ state: "failed", error: sayIn(locale, message), finishedAt: new Date() })
      .where(eq(importRetries.id, retryId))
      .run();
  const alreadyHas = said("server.languages.alreadyHas", { language: languageName(lang) });
  const deadline = AbortSignal.timeout(IMPORT_DEADLINE_MS);
  const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
  const fetching = { ...options, signal };
  try {
    const imp = db.select().from(imports).where(eq(imports.id, importId)).get();
    const state = imp?.retryState;
    const projectId = imp?.projectId;
    const offer = state?.languages?.find((l) => l.lang === lang);
    if (!imp || !state || !projectId || !offer) {
      fail(said("server.import.retryNothing"));
      return;
    }
    if (projectLanguages(db, projectId).some((l) => l.lang === lang)) {
      fail(alreadyHas);
      return;
    }
    const start = readSite(db, projectId);
    if (!start) {
      fail(said("server.import.retryNothing"));
      return;
    }
    const primary = start.document as Doc;
    const primarySite = primary.nodes[primary.document_id] as Node;

    // 1. The version's pages, from its own home page; the primary's pages it meets are dropped.
    const crawled = await crawl(offer.url, {
      ...fetching,
      onProgress: (done, total) => progress({ phase: "pages", done, total }),
    });
    if (!crawled.ok) {
      fail(FAILURES[crawled.failure]);
      return;
    }
    const pages = crawled.pages;
    const home = pages[0];
    if (!home) {
      fail(said("server.import.retryNothing"));
      return;
    }
    const homeUrl = new URL(home.url);
    const named = versionHome(home, lang);

    // 2. Pairs with the primary's pages that are still there.
    const pairs = pairPages(pages, state.pages);
    for (const [key, pageId] of pairs) if (!primary.nodes[pageId]) pairs.delete(key);
    const questionItems = (url: string, index: number, count: number) => {
      const pageId = pairs.get(pageKey(new URL(url)));
      const block = idsOf(primary.nodes[pageId ?? ""], "blocks")
        .map((id) => primary.nodes[id])
        .filter((n) => n?.type === "faq")[index];
      if (!block) return undefined;
      const items =
        block.show === "chosen"
          ? idsOf(block, "chosen").map((id) => String(primary.nodes[id]?.item_id ?? ""))
          : idsOf(primarySite, "faqs");
      return items.length === count ? items : undefined;
    };
    const base = {
      siteName: named.name,
      homeUrl: homeUrl.href,
      takenSlugs: [],
      knownPages: new Map(),
      lang,
      hoursDays: hoursDays(primary, primarySite),
      home: { url: home.url, title: named.homeTitle, heading: named.name, text: named.tagline },
      questions: questionItems,
    };
    const refs = readPagesForRetry(pages, { ...base, newId: idMaker(primary) }).images;

    // 3. Images: those the import brought are reused, the others fetched.
    const media: Record<string, string> = {};
    const toFetch: ImageReference[] = [];
    for (const ref of refs) {
      const known = ref.candidates.map((c) => state.media[c]).find(Boolean);
      if (known) media[ref.id] = known;
      else toFetch.push(ref);
    }
    const fetched = await fetchImages(toFetch, {
      ...fetching,
      onProgress: (done, total) => progress({ phase: "images", done, total }),
    });
    progress({ phase: "building", done: 0, total: 1 });
    const sizes = new Map<string, { width: number; height: number }>();
    const uploaded = new Map<string, string>();
    for (const [refId, name] of fetched.byReference) {
      let key = uploaded.get(name);
      if (!key) {
        const bytes = fetched.files.get(name);
        if (!bytes) continue;
        const result = await uploadImage(db, projectId, imp.userId, { name, bytes });
        if (!result.ok) continue;
        key = result.media.key;
        uploaded.set(name, key);
        sizes.set(key, { width: result.media.width, height: result.media.height });
      }
      media[refId] = key;
    }
    const sizeOf = (key: string) => {
      const known = sizes.get(key) ?? mediaItem(db, projectId, key);
      if (known) sizes.set(key, { width: known.width, height: known.height });
      return known;
    };

    // 4. The document: the primary's copy, its pages and menu replaced by the version's.
    const doc = structuredClone(primary);
    const site = doc.nodes[doc.document_id] as Node;
    site.lang = lang;
    const newId = idMaker(doc);
    const read = readPagesForRetry(pages, {
      ...base,
      newId,
      images: new Map(Object.entries(media)),
    });
    const keep = new Set(idsOf(site, "faqs"));
    const nav = doc.nodes[String(site.nav)];
    for (const id of [...idsOf(site, "pages"), ...idsOf(nav, "items")]) {
      for (const gone of owned(doc, id, keep)) delete doc.nodes[gone];
    }
    listOf(nav, "items").nodes = [];
    const pageIds: string[] = [];
    for (const page of read.pages) {
      for (const node of page.nodes) {
        if (node.type === "image") {
          const size = sizeOf(String(node.src));
          node.width = size?.width ?? 0;
          node.height = size?.height ?? 0;
        }
        doc.nodes[node.id] = node as Node;
      }
      const pair = pairs.get(pageKey(new URL(page.url)));
      const translationKey = pair ? primary.nodes[pair]?.translation_key : undefined;
      doc.nodes[page.page.id] = {
        ...(page.page as Node),
        translation_key: translationKey ?? page.page.translation_key,
      };
      pageIds.push(page.page.id);
      for (const item of page.translated) {
        doc.nodes[item.id] = { ...doc.nodes[item.id], ...(item as Node) };
      }
    }
    listOf(site, "pages").nodes = pageIds;
    site.home_page_id = pageIds[0] ?? "";
    for (const field of ["services_page_id", "projects_page_id"]) {
      if (!doc.nodes[String(site[field] ?? "")]) site[field] = "";
    }
    site.name = named.name || site.name;
    site.description = named.description || site.description;
    const business = doc.nodes[String(site.business)];
    if (business && named.businessName) business.name = named.businessName;

    // The version's own menu, of the pages read.
    const slugByKey = new Map(
      read.pages.map((p) => [pageKey(new URL(p.url)), String(p.page.slug)]),
    );
    const idBySlug = new Map(read.pages.map((p) => [String(p.page.slug), p.page.id]));
    const factory = blockFactory({
      add: (type, props, id = newId(type)) => {
        doc.nodes[id] = { id, type, ...props };
        return id;
      },
      pageId: (slug) => {
        const id = idBySlug.get(slug);
        if (!id) throw new Error(`No page with the slug "${slug}".`);
        return id;
      },
    });
    const menuLink = (label: string, url: URL) => {
      const slug = slugByKey.get(pageKey(url));
      return slug === undefined ? [] : [factory.link({ label: escapeInline(label), page: slug })];
    };
    const items = listOf(nav, "items").nodes;
    for (const entry of menuLinks(home.html, homeUrl).menu) {
      if (!("items" in entry)) {
        items.push(...menuLink(entry.label, entry.url));
        continue;
      }
      const links = entry.items.flatMap((l) => menuLink(l.label, l.url));
      if (links.length === 0) continue;
      const group = newId("menu_group");
      doc.nodes[group] = {
        id: group,
        type: "menu_group",
        label: factory.text(entry.label),
        items: { nodes: links, marks: [], annotations: [] },
      };
      items.push(group);
    }

    const broken = validateSite(doc, { templates: TEMPLATE_RELEASES }).problems.filter(
      (p) => p.category === "structure" && p.severity === "error",
    );
    if (broken.length > 0) {
      fail(said("server.import.retryFailed", { error: broken.map((p) => p.message).join(" ") }));
      return;
    }

    // 5. The report: the language's pages, and what it left out instead of the language.
    const failed = toFetch.filter((ref) => !fetched.byReference.has(ref.id));
    const leftOut: LeftOut[] = [
      ...crawled.leftOut.filter((l) => l.reason !== "language"),
      ...read.leftOut.filter((l) => l.reason !== "image"),
      ...failed.map((ref): LeftOut => ({ reason: "image", detail: ref.candidates[0] ?? ref.id })),
      ...(fetched.overLimit > 0
        ? [{ reason: "images-over-limit", detail: String(fetched.overLimit) } as LeftOut]
        : []),
    ].map((l) => ({ ...l, lang }));
    const report = imp.report as ImportReport | null;
    const said_ = new Set<string>();
    const nextLeftOut = [
      ...(report?.leftOut ?? []).filter((l) => !(l.reason === "language" && l.lang === lang)),
      ...leftOut,
    ].filter((item) => {
      const key = JSON.stringify([item.reason, item.page ?? "", item.detail ?? "", item.lang]);
      return !said_.has(key) && Boolean(said_.add(key));
    });
    const homePath = oldPath(homeUrl);
    const summaries: ImportedPageSummary[] = read.summaries.map((page) => ({
      ...page,
      slug: page.oldPath === homePath ? "" : page.slug,
      lang,
    }));
    const nextReport: ImportReport | null = report && {
      ...report,
      pages: [...report.pages, ...summaries],
      images: report.images + uploaded.size,
      leftOut: nextLeftOut,
    };
    const nextState = (versionId: string): RetryState => ({
      ...state,
      languages: (state.languages ?? []).filter((l) => l.lang !== lang),
      languageVersions: { ...state.languageVersions, [lang]: versionId },
    });
    const added: RetryAdded = { pages: read.pages.length, placed: uploaded.size, library: 0 };

    // 6. Saved at once, unless the language was added meanwhile.
    options.beforeSave?.();
    const saved = db.transaction((tx) => {
      const exists = tx
        .select({ id: siteDocuments.id })
        .from(siteDocuments)
        .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, lang)))
        .get();
      if (exists) return false;
      const versionId = createLanguage(tx, projectId, lang, imp.userId, doc);
      if (read.pages.length > 0) {
        tx.insert(pageOrigins)
          .values(
            read.pages.map((p) => ({
              projectId,
              lang,
              pageId: p.page.id,
              path: oldPath(new URL(p.url)),
            })),
          )
          .run();
      }
      tx.update(imports)
        .set({ report: nextReport, retryState: nextState(versionId) })
        .where(eq(imports.id, importId))
        .run();
      tx.update(importRetries)
        .set({
          state: "done",
          added,
          progress: { phase: "building", done: 1, total: 1 },
          finishedAt: new Date(),
        })
        .where(eq(importRetries.id, retryId))
        .run();
      return true;
    });
    if (!saved) fail(alreadyHas);
  } catch (error) {
    fail(said("server.import.retryFailed", { error: String(error) }));
  }
}
