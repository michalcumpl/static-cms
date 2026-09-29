import type { NodeType } from "./types.js";

/** Property definition in Svedit's schema language. */
export type PropertyDef =
  | { type: "string"; values?: readonly string[]; default?: string }
  | { type: "integer"; min?: number; max?: number; default?: number }
  | { type: "boolean"; default?: boolean }
  | {
      type: "text";
      mark_types?: readonly NodeType[];
      annotation_types?: readonly NodeType[];
      allow_newlines?: boolean;
    }
  | { type: "node"; node_types: readonly NodeType[] }
  | {
      type: "node_array";
      node_types: readonly NodeType[];
      mark_types?: readonly NodeType[];
      annotation_types?: readonly NodeType[];
      default_node_type?: NodeType;
    };

export interface NodeSchema {
  kind: "document" | "block" | "text" | "mark" | "annotation";
  properties: Record<string, PropertyDef>;
}

const INLINE_MARKS: readonly NodeType[] = ["strong", "emphasis", "link", "internal_link"];
const LINK_TYPES: readonly NodeType[] = ["page_link", "external_link"];

/**
 * The site document schema, in Svedit's schema format, so the editor can pass it
 * to Svedit unchanged.
 */
export const siteSchema = {
  site: {
    kind: "document",
    properties: {
      schema_version: { type: "integer", min: 1, default: 1 },
      name: { type: "string" },
      lang: { type: "string" },
      base_url: { type: "string" },
      theme: { type: "node", node_types: ["theme"] },
      nav: { type: "node", node_types: ["nav"] },
      pages: { type: "node_array", node_types: ["page"], default_node_type: "page" },
    },
  },
  theme: {
    kind: "block",
    properties: {
      color_primary: { type: "string" },
      color_secondary: { type: "string" },
      color_background: { type: "string" },
      color_text: { type: "string" },
      font_heading: { type: "string" },
      font_body: { type: "string" },
      radius: { type: "string" },
      content_width: { type: "string" },
    },
  },
  nav: {
    kind: "block",
    properties: {
      items: { type: "node_array", node_types: LINK_TYPES, default_node_type: "page_link" },
    },
  },
  page_link: {
    kind: "block",
    properties: {
      label: { type: "text", allow_newlines: false },
      page_id: { type: "string" },
    },
  },
  external_link: {
    kind: "block",
    properties: {
      label: { type: "text", allow_newlines: false },
      url: { type: "string" },
    },
  },
  page: {
    kind: "document",
    properties: {
      title: { type: "string" },
      slug: { type: "string" },
      seo_description: { type: "string" },
      blocks: {
        type: "node_array",
        node_types: ["hero", "rich_text", "services"],
        default_node_type: "rich_text",
      },
    },
  },
  hero: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      text: { type: "text", mark_types: ["strong", "emphasis"], allow_newlines: false },
      image: { type: "node_array", node_types: ["image"] },
      action: { type: "node_array", node_types: LINK_TYPES },
    },
  },
  rich_text: {
    kind: "block",
    properties: {
      body: {
        type: "node_array",
        node_types: ["paragraph", "subheading", "list"],
        default_node_type: "paragraph",
      },
    },
  },
  paragraph: {
    kind: "text",
    properties: {
      content: { type: "text", mark_types: INLINE_MARKS, allow_newlines: true },
    },
  },
  subheading: {
    kind: "text",
    properties: {
      content: { type: "text", allow_newlines: false },
      level: { type: "integer", min: 2, max: 3, default: 2 },
    },
  },
  list: {
    kind: "block",
    properties: {
      items: { type: "node_array", node_types: ["list_item"], default_node_type: "list_item" },
    },
  },
  list_item: {
    kind: "text",
    properties: {
      content: { type: "text", mark_types: INLINE_MARKS, allow_newlines: false },
    },
  },
  services: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      items: {
        type: "node_array",
        node_types: ["service_item"],
        default_node_type: "service_item",
      },
    },
  },
  service_item: {
    kind: "block",
    properties: {
      name: { type: "text", allow_newlines: false },
      description: { type: "text", mark_types: INLINE_MARKS, allow_newlines: true },
      price: { type: "text", allow_newlines: false },
    },
  },
  image: {
    kind: "block",
    properties: {
      src: { type: "string" },
      alt: { type: "string" },
      decorative: { type: "boolean", default: false },
      width: { type: "integer", min: 0, default: 0 },
      height: { type: "integer", min: 0, default: 0 },
    },
  },
  strong: { kind: "mark", properties: {} },
  emphasis: { kind: "mark", properties: {} },
  link: { kind: "mark", properties: { href: { type: "string" } } },
  internal_link: { kind: "mark", properties: { page_id: { type: "string" } } },
} as const satisfies Record<NodeType, NodeSchema>;

export type SiteSchema = typeof siteSchema;

export const nodeTypes = Object.keys(siteSchema) as NodeType[];

export function isNodeType(type: unknown): type is NodeType {
  return typeof type === "string" && Object.hasOwn(siteSchema, type);
}
