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
export type PageField = "title" | "slug" | "seo_description" | "home";

const PAGE_FIELDS: readonly string[] = ["title", "slug", "seo_description"];

/**
 * The page settings field a problem is about: a page's title, slug or SEO description, or the
 * site's home page (shown on the current page, so `pageId` is undefined).
 */
export function pageSettingsTarget(
  doc: Doc,
  nodeId: string,
  property: string | undefined,
): { pageId: string | undefined; field: PageField } | undefined {
  const node = doc.nodes[nodeId];
  if (node?.type === "page" && property !== undefined && PAGE_FIELDS.includes(property)) {
    return { pageId: nodeId, field: property as PageField };
  }
  if (node?.type === "site" && property === "home_page_id") {
    return { pageId: undefined, field: "home" };
  }
  return undefined;
}

/** The element ID of a page settings field, for focusing it from elsewhere. */
export function pageFieldElementId(field: PageField): string {
  return `page-settings-${field}`;
}
