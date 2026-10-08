import { COLLECTION_NAMES, type CollectionName } from "@webmio/model";
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

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/**
 * A field of the business settings: the business's own (name, type), or a location's, which
 * comes with the location's ID; a day's hours lead to that day's first time field.
 */
export type BusinessField =
  | "name"
  | "business_type"
  | "street"
  | "postal_code"
  | "city"
  | "country"
  | "phone"
  | "email"
  | "map_url"
  | "hours_note"
  | `hours_${Weekday}`;

const BUSINESS_FIELDS: readonly string[] = ["name", "business_type"];

const LOCATION_FIELDS: readonly string[] = [
  "name",
  "street",
  "postal_code",
  "city",
  "country",
  "phone",
  "email",
  "map_url",
  "hours_note",
];

/** A field of the Theme tab. */
export type ThemeField =
  | "color_primary"
  | "color_secondary"
  | "color_background"
  | "color_text"
  | "font_heading"
  | "font_body"
  | "radius"
  | "content_width"
  | "logo"
  | "header_show_name";

const THEME_FIELDS: readonly string[] = [
  "color_primary",
  "color_secondary",
  "color_background",
  "color_text",
  "font_heading",
  "font_body",
  "radius",
  "content_width",
];

/** Where a problem is fixed in the settings column: a page's field, the site's or the business's. */
export type SettingsTarget =
  | { tab: "page"; pageId: string | undefined; field: PageField }
  | { tab: "site"; field: SiteField }
  | { tab: "business"; field: BusinessField; locationId?: string }
  | { tab: "theme"; field: ThemeField };

const PAGE_FIELDS: readonly string[] = ["title", "slug", "seo_description", "share_image"];
const SITE_FIELDS: readonly string[] = ["name", "description", "favicon", "share_image"];

/**
 * The settings field a problem is about:
 * - a page's title, slug, SEO description or share image, on that page;
 * - the site's home page, shown on the current page (so `pageId` is undefined);
 * - the site's name, description, favicon or share image;
 * - the theme's colours, fonts and lengths, the logo and the header switch (Theme tab).
 *
 * Problems of a share image itself lead to its description (alt text) when they're about the
 * description, and to the image otherwise; problems of the favicon's or logo's image lead to it.
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
  if (node?.type === "theme") {
    // A contrast problem names the pair's first colour; anything else its own field.
    const field =
      property !== undefined && THEME_FIELDS.includes(property) ? property : "color_primary";
    return { tab: "theme", field: field as ThemeField };
  }
  if (node?.type === "site") {
    if (property === "home_page_id") return { tab: "page", pageId: undefined, field: "home" };
    if (property === "logo" || property === "header_show_name") {
      return { tab: "theme", field: property };
    }
    if (property !== undefined && SITE_FIELDS.includes(property)) {
      return { tab: "site", field: property as SiteField };
    }
    return undefined;
  }
  if (node?.type === "business") {
    if (property !== undefined && BUSINESS_FIELDS.includes(property)) {
      return { tab: "business", field: property as BusinessField };
    }
    return { tab: "business", field: "name" };
  }
  if (node?.type === "location") {
    const field =
      property !== undefined && LOCATION_FIELDS.includes(property) ? property : "hours_mon";
    return { tab: "business", field: field as BusinessField, locationId: nodeId };
  }
  // A day, or a time range, leads to that day's hours in its location.
  const owner = (list: string, id: string) =>
    Object.values(doc.nodes).find((candidate) =>
      (candidate as unknown as Record<string, { nodes?: string[] }>)?.[list]?.nodes?.includes(id),
    ) as unknown as { id: string; day?: Weekday } | undefined;
  if (node?.type === "opening_day") {
    const location = owner("days", nodeId);
    const day = (node as unknown as { day: Weekday }).day;
    return { tab: "business", field: `hours_${day}`, locationId: location?.id };
  }
  if (node?.type === "time_range") {
    const day = owner("ranges", nodeId);
    const location = day ? owner("days", day.id) : undefined;
    return day?.day
      ? { tab: "business", field: `hours_${day.day}`, locationId: location?.id }
      : undefined;
  }
  if (node?.type !== "image") return undefined;
  const aboutAlt = property === "alt";
  const site = doc.nodes[doc.document_id] as unknown as
    | {
        favicon?: { nodes: string[] };
        share_image?: { nodes: string[] };
        logo?: { nodes: string[] };
        pages?: { nodes: string[] };
      }
    | undefined;
  if (site?.favicon?.nodes.includes(nodeId)) return { tab: "site", field: "favicon" };
  if (site?.logo?.nodes.includes(nodeId)) return { tab: "theme", field: "logo" };
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

/** The element ID of a business settings field, or of a location's, for focusing it. */
export function businessFieldElementId(field: BusinessField, locationId?: string): string {
  return locationId ? `business-settings-${locationId}-${field}` : `business-settings-${field}`;
}

/** The element ID of a Theme tab field, for focusing it from elsewhere. */
export function themeFieldElementId(field: ThemeField): string {
  return `theme-settings-${field}`;
}

/**
 * The element ID of the Settings tab field a problem leads to, or undefined when the problem
 * belongs elsewhere (a page's settings, the theme).
 */
export function settingsFieldId(target: SettingsTarget | undefined): string | undefined {
  if (target?.tab === "site") return siteFieldElementId(target.field);
  if (target?.tab === "business") return businessFieldElementId(target.field, target.locationId);
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

/** The panel section that lists each collection (offer-and-about decision 1). */
export const LIST_SECTIONS: Record<CollectionName, "offer" | "about"> = {
  services: "offer",
  faqs: "offer",
  team: "about",
  testimonials: "about",
  projects: "offer",
};

/** An item's first field, where a problem about the whole item leads. */
const FIRST_FIELDS: Record<CollectionName, string> = {
  services: "name",
  faqs: "question",
  team: "name",
  testimonials: "quote",
  projects: "name",
};

/** A field of an item in a list form: one of its texts, its image (`image`) or its description. */
export interface ListTarget {
  section: "offer" | "about";
  collection: CollectionName;
  index: number;
  itemId: string;
  /** A text property of the item, `image`, or `image-alt` (the image's description). */
  field: string;
}

/** The element ID of an item's field in a list form, as `?focus=` and the problems name it. */
export function listFieldId(section: string, itemId: string, field: string): string {
  return `${section}-${itemId}-${field}`;
}

/**
 * The list form field a problem is about (offer-and-about decision 7): a text of an item of a
 * collection, or the item's image and its description. Undefined for anything else.
 */
export function listTarget(
  doc: Doc,
  nodeId: string,
  property: string | undefined,
): ListTarget | undefined {
  const site = doc.nodes[doc.document_id] as Record<string, { nodes?: string[] }> | undefined;
  const isImage = doc.nodes[nodeId]?.type === "image";
  for (const collection of COLLECTION_NAMES) {
    const items = site?.[collection]?.nodes ?? [];
    let index = items.indexOf(nodeId);
    let field = property ?? FIRST_FIELDS[collection];
    if (index < 0 && isImage) {
      index = items.findIndex((id) => {
        const item = doc.nodes[id];
        const images = item?.[item.type === "project" ? "cover" : "image"];
        return (images as { nodes?: string[] } | undefined)?.nodes?.includes(nodeId);
      });
      field = property === "alt" ? "image-alt" : "image";
    }
    const itemId = items[index];
    if (itemId !== undefined) {
      return { section: LIST_SECTIONS[collection], collection, index, itemId, field };
    }
  }
  return undefined;
}

/** The fields of each collection's items in the list forms. */
const ITEM_FIELDS: Record<CollectionName, readonly string[]> = {
  services: ["name", "description", "price", "slug", "body"],
  faqs: ["question", "answer"],
  team: ["name", "role", "text", "image"],
  testimonials: ["quote", "name", "detail", "image"],
  projects: [
    "name",
    "category_id",
    "summary",
    "body",
    "facts",
    "image",
    "photos",
    "video_url",
    "slug",
  ],
};

/** The list form field an element ID (`?focus=`) names, in the section `section`. */
export function listTargetOfFieldId(
  doc: Doc,
  section: string,
  fieldId: string,
): ListTarget | undefined {
  if (!fieldId.startsWith(`${section}-`)) return undefined;
  const rest = fieldId.slice(section.length + 1);
  // Item IDs can hold dashes, so the field is found from the end.
  const field = ["image-alt", ...Object.values(ITEM_FIELDS).flat()].find((f) =>
    rest.endsWith(`-${f}`),
  );
  if (!field) return undefined;
  const itemId = rest.slice(0, -(field.length + 1));
  const target = listTarget(doc, itemId, field === "image-alt" ? undefined : field);
  return target?.section === section ? { ...target, field } : undefined;
}
