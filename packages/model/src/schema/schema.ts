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

/** How a block looks; the first value is the default (block-variants design decision 1). */
export const HERO_LAYOUTS = ["beside", "cover"] as const;
export const SERVICES_LAYOUTS = ["cards", "list", "accordion"] as const;
export const TEAM_LAYOUTS = ["cards", "list"] as const;
export const GALLERY_IMAGE_FITS = ["fill", "whole"] as const;

/** What a collection block shows: its whole collection, or the items it chose. */
export const COLLECTION_SHOW = ["all", "chosen"] as const;

/** The days of the week, Monday first, as `opening_day` nodes name them. */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const INLINE_MARKS: readonly NodeType[] = ["strong", "emphasis", "link", "internal_link"];
const LINK_TYPES: readonly NodeType[] = ["page_link", "external_link"];

/** The properties every collection block has (business-collections design decision 2). */
const COLLECTION_BLOCK = {
  heading: { type: "text", allow_newlines: false },
  show: { type: "string", values: COLLECTION_SHOW, default: "all" },
  /** `item_ref` nodes; used only when `show` is `chosen`. */
  chosen: { type: "node_array", node_types: ["item_ref"] },
} as const;

/**
 * The site document schema, in Svedit's schema format, so the editor can pass it
 * to Svedit unchanged.
 */
export const siteSchema = {
  site: {
    kind: "document",
    properties: {
      schema_version: { type: "integer", min: 1, default: 9 },
      name: { type: "string" },
      lang: { type: "string" },
      base_url: { type: "string" },
      description: { type: "string" },
      favicon: { type: "node_array", node_types: ["image"] },
      share_image: { type: "node_array", node_types: ["image"] },
      logo: { type: "node_array", node_types: ["image"] },
      header_show_name: { type: "boolean", default: true },
      allow_ai_search: { type: "boolean", default: true },
      allow_ai_training: { type: "boolean", default: true },
      theme: { type: "node", node_types: ["theme"] },
      nav: { type: "node", node_types: ["nav"] },
      business: { type: "node", node_types: ["business"] },
      /** The site's collections: each item is held once, and blocks show it. */
      services: {
        type: "node_array",
        node_types: ["service_item"],
        default_node_type: "service_item",
      },
      team: { type: "node_array", node_types: ["person"], default_node_type: "person" },
      testimonials: {
        type: "node_array",
        node_types: ["testimonial"],
        default_node_type: "testimonial",
      },
      faqs: { type: "node_array", node_types: ["faq_item"], default_node_type: "faq_item" },
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
      /** Pairs the page with its counterparts in the project's other languages. */
      translation_key: { type: "string" },
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
          "faq",
          "figures",
          "steps",
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
      layout: { type: "string", values: HERO_LAYOUTS, default: "beside" },
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
      ...COLLECTION_BLOCK,
      layout: { type: "string", values: SERVICES_LAYOUTS, default: "cards" },
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
      image_fit: { type: "string", values: GALLERY_IMAGE_FITS, default: "fill" },
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
      ...COLLECTION_BLOCK,
      layout: { type: "string", values: TEAM_LAYOUTS, default: "cards" },
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
      /** A location of the business, or "" for all of them. */
      location_id: { type: "string" },
    },
  },
  opening_hours: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      /** A location of the business, or "" for all of them. */
      location_id: { type: "string" },
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
  testimonials: { kind: "block", properties: COLLECTION_BLOCK },
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
  faq: { kind: "block", properties: COLLECTION_BLOCK },
  faq_item: {
    kind: "block",
    properties: {
      question: { type: "text", allow_newlines: false },
      answer: { type: "text", mark_types: INLINE_MARKS, allow_newlines: true },
    },
  },
  /** Key figures: short values with a label each (figures-and-steps design decision 1). */
  figures: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      items: { type: "node_array", node_types: ["figure"], default_node_type: "figure" },
    },
  },
  figure: {
    kind: "block",
    properties: {
      value: { type: "text", allow_newlines: false },
      label: { type: "text", allow_newlines: false },
    },
  },
  /** Numbered steps; the numbers come from the order, so they aren't stored. */
  steps: {
    kind: "block",
    properties: {
      heading: { type: "text", allow_newlines: false },
      items: { type: "node_array", node_types: ["step"], default_node_type: "step" },
    },
  },
  step: {
    kind: "block",
    properties: {
      title: { type: "text", allow_newlines: false },
      text: { type: "text", mark_types: INLINE_MARKS, allow_newlines: true },
    },
  },
  /** Points a collection block at one item of its collection, by the item's node ID. */
  item_ref: {
    kind: "block",
    properties: {
      item_id: { type: "string" },
    },
  },
  business: {
    kind: "block",
    properties: {
      name: { type: "string" },
      business_type: { type: "string", values: BUSINESS_TYPES, default: "LocalBusiness" },
      show_in_footer: { type: "boolean", default: true },
      /** The business's places, the main one first (business-locations design decision 1). */
      locations: { type: "node_array", node_types: ["location"], default_node_type: "location" },
      social: { type: "node_array", node_types: ["social_link"] },
    },
  },
  location: {
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
      hours_note: { type: "string" },
      days: { type: "node_array", node_types: ["opening_day"] },
    },
  },
  /** A social profile of the business; its kind comes from the address (`socialKind`). */
  social_link: {
    kind: "block",
    properties: {
      url: { type: "string" },
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
