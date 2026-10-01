import { slugify, uniqueSlug } from "./slug.js";

type RawNode = { type?: unknown; [key: string]: unknown };
type RawDoc = { document_id: string; nodes: Record<string, RawNode> };

/**
 * Upgrades a stored site document to the current schema version, one version at a time.
 * Version 2 names the home page and gives every page a slug; version 3 adds the site's
 * description, favicon, share image and AI crawler switches, and each page's share image;
 * version 4 adds the business details, empty, with every day closed; version 5 gives every page
 * a translation key, its own ID.
 * Anything that isn't a site of an older version is returned unchanged, for validation to
 * judge. The input is not modified.
 */
export function migrateSite(doc: unknown): unknown {
  if (!isObject(doc) || typeof doc.document_id !== "string" || !isObject(doc.nodes)) return doc;
  let current = doc as RawDoc & Record<string, unknown>;
  if (siteOf(current)?.schema_version === 1) current = toVersion2(current);
  if (siteOf(current)?.schema_version === 2) current = toVersion3(current);
  if (siteOf(current)?.schema_version === 3) current = toVersion4(current);
  if (siteOf(current)?.schema_version === 4) current = toVersion5(current);
  return current;
}

function siteOf(doc: RawDoc): RawNode | undefined {
  const site = doc.nodes[doc.document_id];
  return isObject(site) && site.type === "site" ? site : undefined;
}

function pageIdsOf(site: RawNode): unknown[] {
  return isObject(site.pages) && Array.isArray(site.pages.nodes) ? site.pages.nodes : [];
}

/** Version 1 made the first page home, with an empty slug. */
function toVersion2<T extends RawDoc>(doc: T): T {
  const nodes = doc.nodes;
  const site = siteOf(doc) as RawNode;
  const pageIds = pageIdsOf(site);
  const upgraded: Record<string, RawNode> = { ...nodes };
  upgraded[doc.document_id] = {
    ...site,
    schema_version: 2,
    home_page_id: typeof pageIds[0] === "string" ? pageIds[0] : "",
  };
  const home = typeof pageIds[0] === "string" ? nodes[pageIds[0]] : undefined;
  if (isObject(home) && home.type === "page" && home.slug === "") {
    const taken = pageIds.flatMap((id) => {
      const page = typeof id === "string" ? nodes[id] : undefined;
      return isObject(page) && typeof page.slug === "string" ? [page.slug] : [];
    });
    const base = slugify(typeof home.title === "string" ? home.title : "") || "home";
    upgraded[pageIds[0] as string] = { ...home, slug: uniqueSlug(base, taken) };
  }
  return { ...doc, nodes: upgraded };
}

/** Version 3 adds the site's metadata settings and pages' share images, all empty or on. */
function toVersion3<T extends RawDoc>(doc: T): T {
  const nodes = doc.nodes;
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...nodes };
  upgraded[doc.document_id] = {
    ...site,
    schema_version: 3,
    description: "",
    favicon: { nodes: [], marks: [], annotations: [] },
    share_image: { nodes: [], marks: [], annotations: [] },
    allow_ai_search: true,
    allow_ai_training: true,
  };
  for (const id of pageIdsOf(site)) {
    const page = typeof id === "string" ? nodes[id] : undefined;
    if (isObject(page) && page.type === "page") {
      upgraded[id as string] = { ...page, share_image: { nodes: [], marks: [], annotations: [] } };
    }
  }
  return { ...doc, nodes: upgraded };
}

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const emptyList = () => ({ nodes: [], marks: [], annotations: [] });

/**
 * Version 4 adds the business node (every field empty, the footer switch on) and its seven
 * closed days. IDs are readable and deterministic, with a suffix when one is taken.
 */
function toVersion4<T extends RawDoc>(doc: T): T {
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...doc.nodes };
  const freeId = (base: string) => {
    let id = base;
    for (let n = 2; Object.hasOwn(upgraded, id); n++) id = `${base}_${n}`;
    return id;
  };
  const dayIds = WEEK.map((day) => {
    const id = freeId(`day_${day}`);
    upgraded[id] = { id, type: "opening_day", day, ranges: emptyList() };
    return id;
  });
  const businessId = freeId("business_1");
  upgraded[businessId] = {
    id: businessId,
    type: "business",
    name: "",
    street: "",
    postal_code: "",
    city: "",
    country: "CZ",
    phone: "",
    email: "",
    map_url: "",
    business_type: "LocalBusiness",
    hours_note: "",
    show_in_footer: true,
    days: { nodes: dayIds, marks: [], annotations: [] },
  };
  upgraded[doc.document_id] = { ...site, schema_version: 4, business: businessId };
  return { ...doc, nodes: upgraded };
}

/** Version 5 pairs pages across languages: each page's translation key is its own ID. */
function toVersion5<T extends RawDoc>(doc: T): T {
  const site = siteOf(doc) as RawNode;
  const upgraded: Record<string, RawNode> = { ...doc.nodes };
  upgraded[doc.document_id] = { ...site, schema_version: 5 };
  for (const id of pageIdsOf(site)) {
    const page = typeof id === "string" ? doc.nodes[id] : undefined;
    if (isObject(page) && page.type === "page")
      upgraded[id as string] = { ...page, translation_key: id };
  }
  return { ...doc, nodes: upgraded };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
