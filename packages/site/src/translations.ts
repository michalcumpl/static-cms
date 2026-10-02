// Pages across a project's languages (language-tools design.md decisions 1 and 3): which pages
// pair up, which still need translating, and copying a page into another language.
import { type PropertyDef, siteSchema } from "./schema/schema.js";
import { uniqueSlug } from "./slug.js";

type LooseNode = { id: string; type: string; [key: string]: unknown };
type LooseDoc = { document_id: string; nodes: Record<string, LooseNode> };
type Range = { start_offset: number; end_offset: number; node_id: string };
type List = { nodes: string[]; marks: Range[]; annotations: Range[] };

/** A page of one language, as the translation tools see it. */
export interface TranslationPage {
  /** Pairs the page with its counterparts in other languages. */
  key: string;
  pageId: string;
  title: string;
  slug: string;
  home: boolean;
}

const doc = (value: unknown) => value as LooseDoc;
const siteOf = (d: LooseDoc) =>
  d.nodes[d.document_id] as LooseNode & { pages: List; nav: string; home_page_id: string };

/** A document's pages in site order. */
export function translationSummary(document: unknown): TranslationPage[] {
  const d = doc(document);
  const site = siteOf(d);
  if (!site) return [];
  return site.pages.nodes.flatMap((pageId) => {
    const page = d.nodes[pageId];
    if (page?.type !== "page") return [];
    return [
      {
        key: String(page.translation_key ?? pageId),
        pageId,
        title: String(page.title ?? ""),
        slug: String(page.slug ?? ""),
        home: pageId === site.home_page_id,
      },
    ];
  });
}

export interface TranslationStatus {
  /** Pages of the other language whose title (or slug, except home) is still the primary's. */
  untranslated: TranslationPage[];
  /** Pages of the primary language without a counterpart in the other one. */
  missing: TranslationPage[];
}

/**
 * What a language still needs compared with the primary: its pages not translated yet, and the
 * primary's pages it doesn't have. A hint for owners, never a validation problem.
 */
export function translationStatus(primary: unknown, other: unknown): TranslationStatus {
  const primaryPages = translationSummary(primary);
  const otherPages = translationSummary(other);
  const byKey = new Map(primaryPages.map((page) => [page.key, page]));
  const otherKeys = new Set(otherPages.map((page) => page.key));
  return {
    untranslated: otherPages.filter((page) => {
      const original = byKey.get(page.key);
      if (!original) return false;
      // The home page's slug isn't part of its address, so only its title tells.
      return page.title === original.title || (!page.home && page.slug === original.slug);
    }),
    missing: primaryPages.filter((page) => !otherKeys.has(page.key)),
  };
}

export type CopyResult =
  | { ok: true; document: unknown; pageId: string }
  | { ok: false; reason: "not-found"; message: string }
  | { ok: false; reason: "exists"; message: string; title: string };

/** Every node a page holds: its blocks and their contents, marks and annotations included. */
function subtreeOf(d: LooseDoc, rootId: string): string[] {
  const seen = new Set<string>();
  const visit = (id: unknown) => {
    if (typeof id !== "string" || seen.has(id)) return;
    const node = d.nodes[id];
    if (!node) return;
    seen.add(id);
    const properties = (siteSchema as Record<string, { properties: Record<string, PropertyDef> }>)[
      node.type
    ]?.properties;
    for (const [name, def] of Object.entries(properties ?? {})) {
      const value = node[name] as Partial<List> | string | undefined;
      if (def.type === "node") visit(value);
      if (typeof value !== "object" || value === null) continue;
      for (const child of value.nodes ?? []) visit(child);
      for (const range of [...(value.marks ?? []), ...(value.annotations ?? [])]) {
        visit(range.node_id);
      }
    }
  };
  visit(rootId);
  return [...seen];
}

/**
 * Copies a page of `source` into `target` (language-tools design.md decision 3): its subtree
 * under new IDs from `newId`, its translation key kept, a slug unique in the target, a menu item
 * when the page is in the source's menu, and links to other pages pointed at their counterparts
 * in the target where there are some. Neither input is modified.
 */
export function copyPageInto(
  source: unknown,
  pageId: string,
  target: unknown,
  newId: () => string,
): CopyResult {
  const from = doc(source);
  const to = doc(target);
  const page = from.nodes[pageId];
  const toSite = siteOf(to);
  if (page?.type !== "page" || !toSite) {
    return { ok: false, reason: "not-found", message: "There is no such page." };
  }
  const key = String(page.translation_key ?? pageId);
  const counterpart = translationSummary(target).find((p) => p.key === key);
  if (counterpart) {
    return {
      ok: false,
      reason: "exists",
      message: `This language already has the page as "${counterpart.title}".`,
      title: counterpart.title,
    };
  }

  const ids = new Map(subtreeOf(from, pageId).map((id) => [id, newId()]));
  const mapId = (id: string) => ids.get(id) ?? id;
  // Links to other pages point at their counterparts in the target, by translation key.
  const targetByKey = new Map(translationSummary(target).map((p) => [p.key, p.pageId]));
  const counterpartOf = (sourcePageId: string) => {
    const sourcePage = from.nodes[sourcePageId];
    const sourceKey = sourcePage?.type === "page" ? String(sourcePage.translation_key) : undefined;
    return (sourceKey && targetByKey.get(sourceKey)) || sourcePageId;
  };

  const nodes: Record<string, LooseNode> = { ...to.nodes };
  for (const [oldId, id] of ids) {
    const original = from.nodes[oldId] as LooseNode;
    const copy: LooseNode = structuredClone(original);
    copy.id = id;
    const properties = (siteSchema as Record<string, { properties: Record<string, PropertyDef> }>)[
      copy.type
    ]?.properties;
    for (const [name, def] of Object.entries(properties ?? {})) {
      const value = copy[name] as Partial<List> | string | undefined;
      if (def.type === "node" && typeof value === "string") copy[name] = mapId(value);
      if (typeof value !== "object" || value === null) continue;
      if (value.nodes) value.nodes = value.nodes.map(mapId);
      for (const range of [...(value.marks ?? []), ...(value.annotations ?? [])]) {
        range.node_id = mapId(range.node_id);
      }
    }
    if (
      (copy.type === "page_link" || copy.type === "internal_link" || copy.type === "logo_item") &&
      typeof copy.page_id === "string" &&
      copy.page_id !== ""
    ) {
      copy.page_id = counterpartOf(copy.page_id);
    }
    nodes[id] = copy;
  }

  const newPageId = mapId(pageId);
  const taken = translationSummary(target).map((p) => p.slug);
  const copiedPage = nodes[newPageId] as LooseNode;
  copiedPage.slug = uniqueSlug(String(page.slug), taken);
  copiedPage.translation_key = key;

  const site = { ...toSite, pages: { ...toSite.pages, nodes: [...toSite.pages.nodes, newPageId] } };
  nodes[to.document_id] = site;

  const fromNav = from.nodes[siteOf(from).nav] as LooseNode & { items: List };
  const inMenu = fromNav.items.nodes.some(
    (id) => from.nodes[id]?.type === "page_link" && from.nodes[id]?.page_id === pageId,
  );
  const toNav = nodes[toSite.nav] as (LooseNode & { items: List }) | undefined;
  if (inMenu && toNav) {
    const itemId = newId();
    nodes[itemId] = {
      id: itemId,
      type: "page_link",
      label: { content: String(page.title), marks: [], annotations: [] },
      page_id: newPageId,
    };
    nodes[toNav.id] = {
      ...toNav,
      items: { ...toNav.items, nodes: [...toNav.items.nodes, itemId] },
    };
  }
  return { ok: true, document: { ...to, nodes }, pageId: newPageId };
}
