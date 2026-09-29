import { slugify, uniqueSlug } from "./slug.js";
import { SCHEMA_VERSION } from "./validate/domain.js";

type RawNode = { type?: unknown; [key: string]: unknown };

/**
 * Upgrades a stored site document to the current schema version. Version 1 made the first
 * page home, with an empty slug; version 2 names the home page and gives every page a slug.
 * Anything that isn't a version-1 site is returned unchanged, for validation to judge.
 * The input is not modified.
 */
export function migrateSite(doc: unknown): unknown {
  if (!isObject(doc) || typeof doc.document_id !== "string" || !isObject(doc.nodes)) return doc;
  const nodes = doc.nodes as Record<string, RawNode>;
  const site = nodes[doc.document_id];
  if (!isObject(site) || site.type !== "site" || site.schema_version !== 1) return doc;
  const pageIds = isObject(site.pages) && Array.isArray(site.pages.nodes) ? site.pages.nodes : [];

  const upgraded: Record<string, RawNode> = { ...nodes };
  upgraded[doc.document_id] = {
    ...site,
    schema_version: SCHEMA_VERSION,
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
