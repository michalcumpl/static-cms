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

/** The schema.org types a business can be (business-info design.md decision 1). */
export const BUSINESS_TYPES = [
  "LocalBusiness",
  "Bakery",
  "CafeOrCoffeeShop",
  "Restaurant",
  "Store",
  "HairSalon",
  "BeautySalon",
  "ProfessionalService",
  "MedicalBusiness",
  "SportsActivityLocation",
] as const;

/** The days of the week, Monday first, as `opening_day` nodes name them. */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

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
      schema_version: { type: "integer", min: 1, default: 4 },
      name: { type: "string" },
      lang: { type: "string" },
      base_url: { type: "string" },
      description: { type: "string" },
      favicon: { type: "node_array", node_types: ["image"] },
      share_image: { type: "node_array", node_types: ["image"] },
      allow_ai_search: { type: "boolean", default: true },
      allow_ai_training: { type: "boolean", default: true },
      theme: { type: "node", node_types: ["theme"] },
      nav: { type: "node", node_types: ["nav"] },
      business: { type: "node", node_types: ["business"] },
      pages: { type: "node_array", node_types: ["page"], default_node_type: "page" },
      home_page_id: { type: "string" },
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
      share_image: { type: "node_array", node_types: ["image"] },
      blocks: {
        type: "node_array",
        node_types: [
          "hero",
          "rich_text",
          "services",
          "text_with_image",
          "gallery",
          "team",
          "logos",
          "contact",
          "opening_hours",
          "call_to_action",
          "testimonials",
        ],
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
  text_with_image: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      body: {
        type: "node_array",
        node_types: ["paragraph", "list"],
        default_node_type: "paragraph",
      },
      image: { type: "node_array", node_types: ["image"] },
      image_side: { type: "string", values: ["left", "right"], default: "right" },
    },
  },
  gallery: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      items: { type: "node_array", node_types: ["gallery_item"] },
    },
  },
  gallery_item: {
    kind: "block",
    properties: {
      image: { type: "node_array", node_types: ["image"] },
      caption: { type: "text", allow_newlines: false },
    },
  },
  team: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      people: { type: "node_array", node_types: ["person"], default_node_type: "person" },
    },
  },
  person: {
    kind: "block",
    properties: {
      name: { type: "text", allow_newlines: false },
      role: { type: "text", allow_newlines: false },
      text: { type: "text", mark_types: INLINE_MARKS, allow_newlines: true },
      image: { type: "node_array", node_types: ["image"] },
    },
  },
  logos: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      items: { type: "node_array", node_types: ["logo_item"] },
    },
  },
  logo_item: {
    kind: "block",
    properties: {
      image: { type: "node_array", node_types: ["image"] },
      name: { type: "text", allow_newlines: false },
      /** A page of the site, or "" for none. At most one of `page_id` and `url` is set. */
      page_id: { type: "string" },
      /** An external address, or "" for none. */
      url: { type: "string" },
    },
  },
  contact: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      show_address: { type: "boolean", default: true },
      show_phone: { type: "boolean", default: true },
      show_email: { type: "boolean", default: true },
      show_map: { type: "boolean", default: true },
    },
  },
  opening_hours: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
    },
  },
  call_to_action: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      text: { type: "text", allow_newlines: false },
      /** One or two buttons; added and removed only through the button panel. */
      actions: { type: "node_array", node_types: LINK_TYPES },
    },
  },
  testimonials: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      items: { type: "node_array", node_types: ["testimonial"], default_node_type: "testimonial" },
    },
  },
  testimonial: {
    kind: "block",
    properties: {
      quote: { type: "text", allow_newlines: false },
      name: { type: "text", allow_newlines: false },
      /** Optional, e.g. "zákaznice od roku 2015". */
      detail: { type: "text", allow_newlines: false },
      image: { type: "node_array", node_types: ["image"] },
    },
  },
  business: {
    kind: "block",
    properties: {
      name: { type: "string" },
      street: { type: "string" },
      postal_code: { type: "string" },
      city: { type: "string" },
      country: { type: "string", default: "CZ" },
      phone: { type: "string" },
      email: { type: "string" },
      map_url: { type: "string" },
      business_type: { type: "string", values: BUSINESS_TYPES, default: "LocalBusiness" },
      hours_note: { type: "string" },
      show_in_footer: { type: "boolean", default: true },
      days: { type: "node_array", node_types: ["opening_day"] },
    },
  },
  opening_day: {
    kind: "block",
    properties: {
      day: { type: "string", values: WEEKDAYS },
      ranges: { type: "node_array", node_types: ["time_range"] },
    },
  },
  time_range: {
    kind: "block",
    properties: {
      /** `HH:MM`, 24-hour time. */
      opens: { type: "string" },
      /** `HH:MM`, 24-hour time; `24:00` is midnight at the end of the day. */
      closes: { type: "string" },
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
