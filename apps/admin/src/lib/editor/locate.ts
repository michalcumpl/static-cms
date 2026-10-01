import type { DocumentPath, Selection } from "svedit";
import { editorSchema } from "./schema";
import { isFixedListProperty } from "./structure";

type Doc = {
  document_id: string;
  nodes: Record<string, Record<string, unknown> & { type: string }>;
};

export interface NodeLocation {
  /** Path from the site root to the node, e.g. `[site_1, "pages", 0, "blocks", 2]`. */
  path: DocumentPath;
  /** ID of the page the node is on, when it is inside one (or is one). */
  pageId?: string;
  /** Type of the node whose property holds this node (undefined for the root). */
  parentType?: string;
}

/**
 * Finds where a node sits in the site tree (following `node` and `node_array` properties
 * from the root). Marks, the theme and unreachable nodes have no place on a page.
 */
export function locateNode(doc: Doc, nodeId: string): NodeLocation | undefined {
  let parentType: string | undefined;
  const visit = (path: DocumentPath, id: string, seen: Set<string>): DocumentPath | undefined => {
    if (id === nodeId) return path;
    if (seen.has(id)) return undefined;
    seen.add(id);
    const node = doc.nodes[id];
    const properties = node ? editorSchema[node.type]?.properties : undefined;
    for (const [name, def] of Object.entries(properties ?? {})) {
      const value = node?.[name];
      if (def.type === "node" && typeof value === "string") {
        const found = visit([...path, name], value, seen);
        if (found) {
          if (value === nodeId) parentType = node?.type;
          return found;
        }
      } else if (def.type === "node_array") {
        const ids = (value as { nodes?: string[] } | undefined)?.nodes ?? [];
        for (const [index, child] of ids.entries()) {
          const found = visit([...path, name, index], child, seen);
          if (found) {
            if (child === nodeId) parentType = node?.type;
            return found;
          }
        }
      }
    }
    return undefined;
  };
  const path = visit([doc.document_id], doc.document_id, new Set());
  if (!path) return undefined;
  const pages = (doc.nodes[doc.document_id]?.pages as { nodes?: string[] } | undefined)?.nodes;
  const pageId = path[1] === "pages" && typeof path[2] === "number" ? pages?.[path[2]] : undefined;
  return {
    path,
    ...(pageId === undefined ? {} : { pageId }),
    ...(parentType === undefined ? {} : { parentType }),
  };
}

/** Where a mark (a link, bold, italic) sits: the text holding it and the marked range. */
export interface MarkLocation {
  /** Path from the site root to the text property, e.g. `[site_1, "pages", 0, …, "content"]`. */
  path: DocumentPath;
  start: number;
  end: number;
  pageId?: string;
}

/**
 * Finds the text a mark belongs to. Marks aren't reached through node properties but through
 * the ranges of a text, so `locateNode` never finds them.
 */
export function locateMark(doc: Doc, markId: string): MarkLocation | undefined {
  const visit = (path: DocumentPath, id: string, seen: Set<string>): MarkLocation | undefined => {
    if (seen.has(id)) return undefined;
    seen.add(id);
    const node = doc.nodes[id];
    const properties = node ? editorSchema[node.type]?.properties : undefined;
    for (const [name, def] of Object.entries(properties ?? {})) {
      const value = node?.[name];
      if (def.type === "text") {
        const marks = (
          value as { marks?: { node_id: string; start_offset: number; end_offset: number }[] }
        )?.marks;
        const range = marks?.find((m) => m.node_id === markId);
        if (range) {
          return { path: [...path, name], start: range.start_offset, end: range.end_offset };
        }
      } else if (def.type === "node" && typeof value === "string") {
        const found = visit([...path, name], value, seen);
        if (found) return found;
      } else if (def.type === "node_array") {
        const ids = (value as { nodes?: string[] } | undefined)?.nodes ?? [];
        for (const [index, child] of ids.entries()) {
          const found = visit([...path, name, index], child, seen);
          if (found) return found;
        }
      }
    }
    return undefined;
  };
  const found = visit([doc.document_id], doc.document_id, new Set());
  if (!found) return undefined;
  const pages = (doc.nodes[doc.document_id]?.pages as { nodes?: string[] } | undefined)?.nodes;
  const pageId =
    found.path[1] === "pages" && typeof found.path[2] === "number"
      ? pages?.[found.path[2]]
      : undefined;
  return pageId === undefined ? found : { ...found, pageId };
}

/**
 * The selection that shows a node: the caret at the start of its first text, a node
 * selection when it is a block or item in an editable list, or its image.
 */
export function selectionFor(
  doc: Doc,
  nodeId: string,
  location: NodeLocation,
): Selection | undefined {
  const node = doc.nodes[nodeId];
  if (!node) return undefined;
  const properties = Object.entries(editorSchema[node.type]?.properties ?? {});
  const firstText = properties.find(([, def]) => def.type === "text")?.[0];
  if (firstText) {
    return { type: "text", path: [...location.path, firstText], anchor_offset: 0, focus_offset: 0 };
  }
  if (node.type === "image") return { type: "property", path: [...location.path, "src"] };
  const index = location.path.at(-1);
  const list = location.path.slice(0, -1);
  if (typeof index === "number" && !isFixedListProperty(location.parentType, list.at(-1))) {
    return { type: "node", path: list, anchor_offset: index, focus_offset: index + 1 };
  }
  return undefined;
}

/** A field of the page settings panel. */
export type PageField =
  | "title"
  | "slug"
  | "seo_description"
  | "home"
  | "share_image"
  | "share_image_alt";

/** A field of the site settings panel. */
export type SiteField = "name" | "description" | "favicon" | "share_image" | "share_image_alt";

/** Where a problem is fixed in the settings column: a page's field, or the site's. */
export type SettingsTarget =
  | { tab: "page"; pageId: string | undefined; field: PageField }
  | { tab: "site"; field: SiteField };

const PAGE_FIELDS: readonly string[] = ["title", "slug", "seo_description", "share_image"];
const SITE_FIELDS: readonly string[] = ["name", "description", "favicon", "share_image"];

/**
 * The settings field a problem is about:
 * - a page's title, slug, SEO description or share image, on that page;
 * - the site's home page, shown on the current page (so `pageId` is undefined);
 * - the site's name, description, favicon or share image.
 *
 * Problems of a share image itself lead to its description (alt text) when they're about the
 * description, and to the image otherwise; problems of the favicon's image lead to the favicon.
 */
export function settingsTarget(
  doc: Doc,
  nodeId: string,
  property: string | undefined,
): SettingsTarget | undefined {
  const node = doc.nodes[nodeId];
  if (node?.type === "page" && property !== undefined && PAGE_FIELDS.includes(property)) {
    return { tab: "page", pageId: nodeId, field: property as PageField };
  }
  if (node?.type === "site") {
    if (property === "home_page_id") return { tab: "page", pageId: undefined, field: "home" };
    if (property !== undefined && SITE_FIELDS.includes(property)) {
      return { tab: "site", field: property as SiteField };
    }
    return undefined;
  }
  if (node?.type !== "image") return undefined;
  const aboutAlt = property === "alt";
  const site = doc.nodes[doc.document_id] as unknown as
    | {
        favicon?: { nodes: string[] };
        share_image?: { nodes: string[] };
        pages?: { nodes: string[] };
      }
    | undefined;
  if (site?.favicon?.nodes.includes(nodeId)) return { tab: "site", field: "favicon" };
  if (site?.share_image?.nodes.includes(nodeId)) {
    return { tab: "site", field: aboutAlt ? "share_image_alt" : "share_image" };
  }
  for (const pageId of site?.pages?.nodes ?? []) {
    const page = doc.nodes[pageId] as unknown as { share_image?: { nodes: string[] } } | undefined;
    if (page?.share_image?.nodes.includes(nodeId)) {
      return { tab: "page", pageId, field: aboutAlt ? "share_image_alt" : "share_image" };
    }
  }
  return undefined;
}

/** The element ID of a site settings field, for focusing it from elsewhere. */
export function siteFieldElementId(field: SiteField): string {
  return `site-settings-${field}`;
}

/** The element ID of a page settings field, for focusing it from elsewhere. */
export function pageFieldElementId(field: PageField): string {
  return `page-settings-${field}`;
}
