import { slugify, uniqueSlug } from "./slug.js";

type RawNode = { type?: unknown; [key: string]: unknown };
type RawDoc = { document_id: string; nodes: Record<string, RawNode> };

/**
 * Upgrades a stored site document to the current schema version, one version at a time.
 * Version 2 names the home page and gives every page a slug; version 3 adds the site's
 * description, favicon, share image and AI crawler switches, and each page's share image.
 * Anything that isn't a site of an older version is returned unchanged, for validation to
 * judge. The input is not modified.
 */
export function migrateSite(doc: unknown): unknown {
  if (!isObject(doc) || typeof doc.document_id !== "string" || !isObject(doc.nodes)) return doc;
  let current = doc as RawDoc & Record<string, unknown>;
  if (siteOf(current)?.schema_version === 1) current = toVersion2(current);
  if (siteOf(current)?.schema_version === 2) current = toVersion3(current);
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
