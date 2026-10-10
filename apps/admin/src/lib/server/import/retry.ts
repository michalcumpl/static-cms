import {
  type ImageReference,
  type ImportReport,
  type LeftOut,
  oldPath,
  pageKey,
  pageUnchanged,
  type RetryPage,
  type RetrySource,
  readPagesForRetry,
} from "@webmio/import";
import { blockFactory, escapeInline, type NodeType, type Weekday } from "@webmio/model";
import { languageName } from "@webmio/render";
import { upgradeSite } from "@webmio/templates";
import { and, desc, eq } from "drizzle-orm";
import { sayIn } from "../../i18n/translate";
import { type Locale, type Said, said } from "../../i18n/types";
import type { Db } from "../db/index";
import {
  type ImportProgress,
  importRetries,
  imports,
  pageOrigins,
  type RetryAdded,
  type RetryImage,
  type RetryState,
  type retryKinds,
  versions,
} from "../db/schema";
import { newId } from "../ids";
import { mediaItem, uploadImage } from "../media";
import { primaryLanguage, projectLanguages, readSite, saveSite } from "../site-documents";
import { fetchPage, siteRobots, withStyles } from "./crawl";
import { fetchImages } from "./images";
import { IMPORT_DEADLINE_MS, onImportQueue, projectImport } from "./job";
import { runLanguageImport } from "./language";
import type { SafeFetchOptions } from "./safe-fetch";

// Retrying what an import left out (import-review-actions design decisions 2 and 3): fetch what
// failed (or the next pages), read it, merge it into the saved document, and save once.

/** Pages "Import the next pages" reads at a time. */
export const RETRY_PAGES = 20;

export type RetryKind = (typeof retryKinds)[number];

export interface RetryOptions extends SafeFetchOptions {
  /** The language of the messages. */
  locale?: Locale;
  /** Called just before saving (tests: the owner saving meanwhile). */
  beforeSave?: () => void;
}

export type StartRetryResult = { ok: true; retryId: string } | { ok: false; message: Said };

/** What a retry of each kind would try: nothing for imports made before retries. */
export function retryOffers(state: RetryState | null | undefined): {
  again: boolean;
  next: number;
} {
  if (!state) return { again: false, next: 0 };
  return {
    again: state.unreachable.length > 0 || state.failedImages.length > 0,
    next: state.queue.length,
  };
}

/** A project's running retry, or its last one. */
export function projectRetry(db: Db, projectId: string) {
  const imp = projectImport(db, projectId);
  if (!imp) return undefined;
  return db
    .select()
    .from(importRetries)
    .where(eq(importRetries.importId, imp.id))
    .orderBy(desc(importRetries.startedAt))
    .get();
}

/** Starts a retry of the project's import, or says why it can't. */
export function startRetry(
  db: Db,
  projectId: string,
  userId: string,
  kind: RetryKind,
  options: RetryOptions = {},
  /** For `language`: the language to import. */
  lang = "",
): StartRetryResult {
  const imp = projectImport(db, projectId);
  if (imp?.state !== "done") return { ok: false, message: said("server.import.retryNothing") };
  if (imp.reviewDismissed) return { ok: false, message: said("server.import.retryClosed") };
  if (kind === "language") {
    if (projectLanguages(db, projectId).some((l) => l.lang === lang)) {
      return {
        ok: false,
        message: said("server.languages.alreadyHas", { language: languageName(lang) }),
      };
    }
    if (!imp.retryState?.languages?.some((l) => l.lang === lang)) {
      return { ok: false, message: said("server.import.retryNothing") };
    }
  } else {
    const offers = retryOffers(imp.retryState);
    if (kind === "again" ? !offers.again : offers.next === 0) {
      return { ok: false, message: said("server.import.retryNothing") };
    }
  }
  const running = db
    .select({ id: importRetries.id })
    .from(importRetries)
    .where(and(eq(importRetries.importId, imp.id), eq(importRetries.state, "running")))
    .get();
  if (running) return { ok: false, message: said("server.import.retryRunning") };

  const retryId = newId("rt");
  db.insert(importRetries)
    .values({
      id: retryId,
      importId: imp.id,
      userId,
      kind,
      lang: kind === "language" ? lang : null,
      state: "running",
      progress: { phase: "pages", done: 0, total: 1 },
      startedAt: new Date(),
    })
    .run();
  onImportQueue(() =>
    kind === "language"
      ? runLanguageImport(db, retryId, imp.id, lang, options)
      : runRetry(db, retryId, imp.id, kind, options),
  );
  return { ok: true, retryId };
}

export type Node = { id: string; type: string; [key: string]: unknown };
export type Doc = { document_id: string; nodes: Record<string, Node> };
export type List = { nodes: string[]; marks: unknown[]; annotations: unknown[] };

export const listOf = (node: Node | undefined, field: string): List => {
  const value = node?.[field] as List | undefined;
  if (value && Array.isArray(value.nodes)) return value;
  const created = { nodes: [], marks: [], annotations: [] };
  if (node) node[field] = created;
  return created;
};

/** A node list's IDs, without adding the list when the node has none. */
export const idsOf = (node: Node | undefined, field: string): string[] =>
  (node?.[field] as List | undefined)?.nodes ?? [];

/** The days the main location's hours name: a schedule naming them shows the hours. */
export function hoursDays(doc: Doc, site: Node): Set<Weekday> {
  const business = doc.nodes[String(site.business)];
  const location = doc.nodes[idsOf(business, "locations")[0] ?? ""];
  return new Set(
    idsOf(location, "days")
      .map((id) => doc.nodes[id])
      .filter((day) => idsOf(day, "ranges").length > 0)
      .map((day) => day?.day as Weekday),
  );
}

/** New node IDs the document doesn't have, tagged so they never meet an editor's. */
export function idMaker(doc: Doc): (type: NodeType) => string {
  const tag = Math.random().toString(36).slice(2, 8);
  let n = 0;
  return (type) => {
    let id: string;
    do id = `${type}_${tag}${++n}`;
    while (doc.nodes[id]);
    return id;
  };
}

/** A node and the nodes it owns (through node lists and marks), except `keep`. */
export function owned(
  doc: Doc,
  id: string,
  keep: ReadonlySet<string>,
  out = new Set<string>(),
): Set<string> {
  const node = doc.nodes[id];
  if (!node || out.has(id) || keep.has(id)) return out;
  out.add(id);
  const visit = (value: unknown, key: string): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (key === "nodes" && typeof item === "string") owned(doc, item, keep, out);
        else visit(item, "");
      }
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        if (k === "node_id" && typeof v === "string") owned(doc, v, keep, out);
        else visit(v, k);
      }
    }
  };
  for (const [k, v] of Object.entries(node)) if (k !== "id") visit(v, k);
  return out;
}

const textOf = (value: unknown) => (value as { content?: string } | undefined)?.content ?? "";

async function runRetry(
  db: Db,
  retryId: string,
  importId: string,
  kind: RetryKind,
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
  const deadline = AbortSignal.timeout(IMPORT_DEADLINE_MS);
  const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
  const fetching = { ...options, signal };
  try {
    const imp = db.select().from(imports).where(eq(imports.id, importId)).get();
    const state = imp?.retryState;
    const projectId = imp?.projectId;
    if (!imp || !state || !projectId) {
      fail(said("server.import.retryNothing"));
      return;
    }
    const lang = primaryLanguage(db, projectId) ?? "";
    // The document the retry merges into: a save after this makes the retry fail.
    const start = readSite(db, projectId);
    if (!start) {
      fail(said("server.import.retryNothing"));
      return;
    }
    const doc = structuredClone(start.document) as Doc;
    const site = doc.nodes[doc.document_id] as Node;
    const homeUrl = new URL(state.pages[0]?.url ?? imp.address);
    const rules = {
      homeUrl,
      homeLang: state.homeLang,
      allowed: await siteRobots(homeUrl, fetching),
    };

    // 1. The pages: those that didn't answer, or the next ones.
    const wanted = kind === "again" ? state.unreachable : state.queue.slice(0, RETRY_PAGES);
    const queue = kind === "again" ? state.queue : state.queue.slice(RETRY_PAGES);
    const unreachable = kind === "again" ? [] : [...state.unreachable];
    const leftOut: LeftOut[] = [];
    const known = new Set(state.pages.map((p) => pageKey(new URL(p.url))));
    const arrivedPages: { url: URL; html: string }[] = [];
    progress({ phase: "pages", done: 0, total: wanted.length });
    for (const [i, address] of wanted.entries()) {
      const result = await fetchPage(new URL(address), rules, fetching);
      if (!result.ok) {
        if (result.leftOut) leftOut.push(result.leftOut);
        if (result.leftOut?.reason === "unreachable") unreachable.push(result.address);
      } else if (!known.has(pageKey(result.url))) {
        known.add(pageKey(result.url));
        arrivedPages.push(result);
      }
      progress({ phase: "pages", done: i + 1, total: wanted.length });
    }
    const newSources: RetrySource[] = await withStyles(arrivedPages, fetching);

    const pageNodes = (site.pages as List | undefined)?.nodes ?? [];
    const base = {
      siteName: String(site.name ?? ""),
      homeUrl: homeUrl.href,
      takenSlugs: pageNodes.map((id) => String(doc.nodes[id]?.slug ?? "")),
      knownPages: new Map(
        state.pages.flatMap((p) => {
          const page = doc.nodes[p.pageId];
          return page
            ? [[p.url, { pageId: p.pageId, slug: String(page.slug ?? "") }] as const]
            : [];
        }),
      ),
      newId: idMaker(doc),
      lang: String(site.lang ?? lang),
      hoursDays: hoursDays(doc, site),
    };
    const newRefs = readPagesForRetry(newSources, base).images;

    // 2. The images: those that failed, and the new pages'.
    const tried: RetryImage[] = kind === "again" ? state.failedImages : [];
    const refs: ImageReference[] = [...tried];
    for (const ref of newRefs) if (!refs.some((r) => r.id === ref.id)) refs.push(ref);
    const fetched = await fetchImages(refs, {
      ...fetching,
      onProgress: (done, total) => progress({ phase: "images", done, total }),
    });
    progress({ phase: "building", done: 0, total: 1 });
    const media = { ...state.media };
    const sizes = new Map<string, { width: number; height: number }>();
    const arrived = new Set<string>();
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
      arrived.add(refId);
    }
    const sizeOf = (key: string) => {
      const known = sizes.get(key) ?? mediaItem(db, projectId, key);
      if (known) sizes.set(key, { width: known.width, height: known.height });
      return known;
    };

    // 3. Pages showing an image that arrived, read again where the owner left them unchanged.
    const versionRow = db.select().from(versions).where(eq(versions.id, state.versionId)).get();
    const importDoc = versionRow ? (upgradeSite(versionRow.document) as Doc) : undefined;
    const reread = new Map<string, { pageId: string; url: string }>();
    for (const image of tried) {
      if (!arrived.has(image.id) || image.role !== "content") continue;
      for (const path of image.pages) {
        const entry = state.pages.find((p) => oldPath(new URL(p.url)) === path);
        if (!entry || !doc.nodes[entry.pageId] || !importDoc) continue;
        if (pageUnchanged(importDoc, doc, entry.pageId)) reread.set(entry.pageId, entry);
      }
    }
    const rereadPages: { url: URL; html: string; pageId: string }[] = [];
    for (const entry of reread.values()) {
      const result = await fetchPage(new URL(entry.url), rules, fetching);
      if (result.ok) rereadPages.push({ ...result, pageId: entry.pageId });
    }
    const rereadSources: RetrySource[] = (await withStyles(rereadPages, fetching)).map(
      (source, i) => {
        const pageId = rereadPages[i]?.pageId ?? "";
        const page = doc.nodes[pageId];
        return {
          ...source,
          existing: { pageId, slug: String(page?.slug ?? ""), title: String(page?.title ?? "") },
        };
      },
    );

    // 4. Read with every image known, and merge.
    const read = readPagesForRetry([...newSources, ...rereadSources], {
      ...base,
      images: new Map(Object.entries(media)),
    });
    const placedImages: string[] = [];
    for (const page of read.pages) {
      for (const node of page.nodes) {
        if (node.type !== "image") continue;
        const size = sizeOf(String(node.src));
        node.width = size?.width ?? 0;
        node.height = size?.height ?? 0;
        placedImages.push(node.id);
      }
    }
    const faqs = listOf(site, "faqs");
    const addPage = (page: RetryPage) => {
      for (const node of page.nodes) doc.nodes[node.id] = node as Node;
      doc.nodes[page.page.id] = page.page as Node;
    };
    const bySlug = () =>
      new Map(listOf(site, "pages").nodes.map((id) => [String(doc.nodes[id]?.slug ?? ""), id]));
    const factory = blockFactory({
      add: (type, props, id = base.newId(type)) => {
        doc.nodes[id] = { id, type, ...props };
        return id;
      },
      pageId: (slug) => {
        const id = bySlug().get(slug);
        if (!id) throw new Error(`No page with the slug "${slug}".`);
        return id;
      },
    });
    const menu = new Set(state.menu.map((address) => pageKey(new URL(address))));
    const added: { url: string; pageId: string }[] = [];
    for (const page of read.pages.filter((p) => !reread.has(p.page.id))) {
      addPage(page);
      listOf(site, "pages").nodes.push(page.page.id);
      faqs.nodes.push(...page.questions);
      added.push({ url: page.url, pageId: page.page.id });
      if (menu.has(pageKey(new URL(page.url)))) {
        const nav = doc.nodes[String(site.nav)];
        listOf(nav, "items").nodes.push(
          factory.link({
            label: escapeInline(String(page.page.title)),
            page: String(page.page.slug),
          }),
        );
      }
    }
    const faqIds = new Set(faqs.nodes);
    for (const page of read.pages.filter((p) => reread.has(p.page.id))) {
      const old = doc.nodes[page.page.id];
      if (!old) continue;
      // The page's old blocks go; the questions stay in the FAQ collection, and the page's
      // questions that are already there aren't added twice.
      for (const id of listOf(old, "blocks").nodes) {
        for (const gone of owned(doc, id, faqIds)) delete doc.nodes[gone];
      }
      const same = new Map<string, string>();
      for (const id of page.questions) {
        const question = textOf(page.nodes.find((n) => n.id === id)?.question);
        const existing = faqs.nodes.find((f) => textOf(doc.nodes[f]?.question) === question);
        if (existing) same.set(id, existing);
      }
      for (const node of page.nodes) {
        if (same.has(node.id)) continue;
        for (const value of Object.values(node)) {
          const list = value as List | undefined;
          if (list && Array.isArray(list.nodes))
            list.nodes = list.nodes.map((id) => same.get(id) ?? id);
        }
        doc.nodes[node.id] = node as Node;
      }
      faqs.nodes.push(...page.questions.filter((id) => !same.has(id)));
      old.blocks = page.page.blocks;
    }
    // The logo and favicon, when they arrived and the site still has none.
    for (const image of tried) {
      const key = media[image.id];
      if (!arrived.has(image.id) || !key || image.role === "content") continue;
      const slot = listOf(site, image.role);
      if (slot.nodes.length > 0) continue;
      const size = sizeOf(key);
      slot.nodes.push(
        ...factory.image({
          src: key,
          alt: image.role === "logo" ? String(site.name ?? "") : "",
          decorative: image.role === "favicon",
          width: size?.width,
          height: size?.height,
        }),
      );
      placedImages.push(...slot.nodes);
    }

    const placedKeys = new Set(placedImages.map((id) => String(doc.nodes[id]?.src ?? "")));
    const placed = [...arrived].filter((id) => placedKeys.has(media[id] ?? ""));
    const result: RetryAdded = {
      pages: added.length,
      placed: placed.length,
      library: arrived.size - placed.length,
    };

    // 5. Save once, on the document read at the start.
    let versionId = state.versionId;
    if (added.length > 0 || placedImages.length > 0) {
      options.beforeSave?.();
      const saved = saveSite(db, projectId, imp.userId, doc, start.version, lang);
      if (!saved.ok) {
        fail(
          saved.reason === "conflict"
            ? said("server.import.retryConflict")
            : said("server.import.retryFailed", {
                error: saved.problems.map((p) => p.message).join(" "),
              }),
        );
        return;
      }
      versionId = readSite(db, projectId)?.versionId ?? versionId;
    }
    if (added.length > 0) {
      db.insert(pageOrigins)
        .values(
          added.map((p) => ({ projectId, lang, pageId: p.pageId, path: oldPath(new URL(p.url)) })),
        )
        .run();
    }

    // 6. The report and what a next retry needs.
    const failedNow = refs.filter((r) => !arrived.has(r.id));
    for (const ref of failedNow)
      leftOut.push({ reason: "image", detail: ref.candidates[0] ?? ref.id });
    if (fetched.overLimit > 0)
      leftOut.push({ reason: "images-over-limit", detail: String(fetched.overLimit) });
    leftOut.push(...read.leftOut.filter((l) => l.reason !== "image"));
    if (queue.length > 0) leftOut.push({ reason: "over-limit", detail: String(queue.length) });
    const report = imp.report as ImportReport | null;
    const triedPaths = new Set(wanted.map((address) => oldPath(new URL(address))));
    const triedImages = new Set(tried.map((r) => r.candidates[0] ?? r.id));
    const kept = (report?.leftOut ?? []).filter(
      (l) =>
        // What another language left out isn't retried (import-languages).
        !(
          kind === "again" &&
          !l.lang &&
          l.reason === "unreachable" &&
          triedPaths.has(l.page ?? "")
        ) &&
        !(kind === "again" && !l.lang && l.reason === "image" && triedImages.has(l.detail ?? "")) &&
        !(kind === "again" && l.reason === "images-over-limit" && !l.lang) &&
        !(kind === "next" && l.reason === "over-limit" && !l.lang),
    );
    const reported = new Set<string>();
    const nextLeftOut = [...kept, ...leftOut].filter((item) => {
      const key = JSON.stringify([item.reason, item.page ?? "", item.detail ?? ""]);
      return !reported.has(key) && Boolean(reported.add(key));
    });
    const newQuestions = read.pages
      .filter((p) => !reread.has(p.page.id))
      .reduce((n, p) => n + p.questions.length, 0);
    const nextReport: ImportReport | null = report && {
      ...report,
      pages: [...report.pages, ...read.summaries],
      images: report.images + uploaded.size,
      questions: report.questions + newQuestions,
      leftOut: nextLeftOut,
    };
    const toRetryImage = ({ id, candidates, alt, role, pages }: ImageReference): RetryImage => ({
      id,
      candidates,
      alt,
      role,
      pages,
    });
    const nextState: RetryState = {
      ...state,
      versionId,
      unreachable,
      queue,
      failedImages: [
        ...(kind === "again" ? [] : state.failedImages),
        ...failedNow.map(toRetryImage),
      ],
      media,
      pages: [...state.pages, ...added],
      importedImages: [...(state.importedImages ?? []), ...placedImages],
    };
    db.transaction((tx) => {
      tx.update(imports)
        .set({ report: nextReport, retryState: nextState })
        .where(eq(imports.id, importId))
        .run();
      tx.update(importRetries)
        .set({
          state: "done",
          added: result,
          progress: { phase: "building", done: 1, total: 1 },
          finishedAt: new Date(),
        })
        .where(eq(importRetries.id, retryId))
        .run();
    });
  } catch (error) {
    fail(said("server.import.retryFailed", { error: String(error) }));
  }
}
