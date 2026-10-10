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
export const HERO_LAYOUTS = ["beside", "cover", "slideshow"] as const;
export const SERVICES_LAYOUTS = ["cards", "list", "accordion"] as const;
export const TEAM_LAYOUTS = ["cards", "list"] as const;
export const GALLERY_IMAGE_FITS = ["fill", "whole"] as const;
export const CARDS_LAYOUTS = ["below", "over"] as const;
/** A contact form's kinds: a message, or a request to be called back. */
export const CONTACT_FORM_KINDS = ["contact", "callback"] as const;

/** What a collection block shows: its whole collection, or the items it chose. */
export const COLLECTION_SHOW = ["all", "chosen"] as const;

/** The days of the week, Monday first, as `opening_day` nodes name them. */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const INLINE_MARKS: readonly NodeType[] = ["strong", "emphasis", "link", "internal_link"];
const LINK_TYPES: readonly NodeType[] = ["page_link", "external_link"];

/**
 * The properties every page block has: `hidden` keeps the block in its page but off the website
 * (template-system design decision 4).
 */
const PAGE_BLOCK = {
  hidden: { type: "boolean", default: false },
} as const;

/** The properties every collection block has (business-collections design decision 2). */
const COLLECTION_BLOCK = {
  ...PAGE_BLOCK,
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
      schema_version: { type: "integer", min: 1, default: 13 },
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
      /** The ID of the site's template (see `@webmio/templates`), such as `standard`. */
      template: { type: "string" },
      /** The release of the template the site was last upgraded to. */
      template_release: { type: "integer", min: 1, default: 1 },
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
      projects: { type: "node_array", node_types: ["project"], default_node_type: "project" },
      project_categories: {
        type: "node_array",
        node_types: ["project_category"],
        default_node_type: "project_category",
      },
      /** The page listing the services, under which each service has a page; "" for none. */
      services_page_id: { type: "string" },
      /** The page listing the projects, under which each project has a page; "" for none. */
      projects_page_id: { type: "string" },
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
      items: {
        type: "node_array",
        node_types: [...LINK_TYPES, "menu_group"],
        default_node_type: "page_link",
      },
    },
  },
  /** Links under one label in the menu; one level deep, the label isn't a link. */
  menu_group: {
    kind: "block",
    properties: {
      label: { type: "text", allow_newlines: false },
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
          "projects",
          "cards",
          "videos",
          "jobs",
          "contact_form",
        ],
        default_node_type: "rich_text",
      },
    },
  },
  hero: {
    kind: "block",
    properties: {
      ...PAGE_BLOCK,
      heading: { type: "text", allow_newlines: false },
      text: { type: "text", mark_types: ["strong", "emphasis"], allow_newlines: false },
      image: { type: "node_array", node_types: ["image"] },
      action: { type: "node_array", node_types: LINK_TYPES },
      layout: { type: "string", values: HERO_LAYOUTS, default: "beside" },
      /** The slides of the `slideshow` look (hero-slideshow design decision 1). */
      slides: { type: "node_array", node_types: ["slide"], default_node_type: "slide" },
    },
  },
  /** A slide of a hero slideshow: a photo, a title and a link, like a card's. */
  slide: {
    kind: "block",
    properties: {
      image: { type: "node_array", node_types: ["image"] },
      title: { type: "text", allow_newlines: false },
      /** An `https` MP4 file on Vimeo played over the photo while the slide shows, or "". */
      clip_url: { type: "string" },
      /** A page, or a service or project with its own page, or "" for none. */
      target_id: { type: "string" },
      /** An outside address, or "" for none. */
      url: { type: "string" },
    },
  },
  rich_text: {
    kind: "block",
    properties: {
      ...PAGE_BLOCK,
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
      /** The service's address under the services' listing page (collection-pages). */
      slug: { type: "string" },
      /** The text of the service's page, shown there in place of the description. */
      body: {
        type: "node_array",
        node_types: ["paragraph", "subheading", "list"],
        default_node_type: "paragraph",
      },
    },
  },
  text_with_image: {
    kind: "block",
    properties: {
      ...PAGE_BLOCK,
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
      ...PAGE_BLOCK,
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
      ...PAGE_BLOCK,
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
      ...PAGE_BLOCK,
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
      ...PAGE_BLOCK,
      heading: { type: "text", allow_newlines: false },
      /** A location of the business, or "" for all of them. */
      location_id: { type: "string" },
    },
  },
  call_to_action: {
    kind: "block",
    properties: {
      ...PAGE_BLOCK,
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
      ...PAGE_BLOCK,
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
      ...PAGE_BLOCK,
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
  /** Shows the site's projects (collection-pages design decision 3). */
  projects: {
    kind: "block",
    properties: {
      ...COLLECTION_BLOCK,
      /** A project category, or "" for every category. */
      category_id: { type: "string" },
      /** At most this many projects; 0 for all of them. */
      limit: { type: "integer", min: 0, default: 0 },
    },
  },
  project: {
    kind: "block",
    properties: {
      name: { type: "text", allow_newlines: false },
      /** A project category, or "" for none. */
      category_id: { type: "string" },
      summary: { type: "text", allow_newlines: false },
      body: {
        type: "node_array",
        node_types: ["paragraph", "subheading", "list"],
        default_node_type: "paragraph",
      },
      facts: { type: "node_array", node_types: ["fact"], default_node_type: "fact" },
      cover: { type: "node_array", node_types: ["image"] },
      photos: { type: "node_array", node_types: ["gallery_item"] },
      /** An `https` address of the project's video, or "". */
      video_url: { type: "string" },
      /** The project's address under the projects' listing page. */
      slug: { type: "string" },
    },
  },
  project_category: {
    kind: "block",
    properties: {
      name: { type: "text", allow_newlines: false },
    },
  },
  /** A label and a value, such as "Client" and "Národní technické muzeum". */
  fact: {
    kind: "block",
    properties: {
      label: { type: "text", allow_newlines: false },
      value: { type: "text", allow_newlines: false },
    },
  },
  /** Cards: an image, a title, a text and a link each (cards design decision 1). */
  cards: {
    kind: "block",
    properties: {
      ...PAGE_BLOCK,
      heading: { type: "text", allow_newlines: false },
      /** `below`: the image, then the title and text; `over`: the title over the image. */
      layout: { type: "string", values: CARDS_LAYOUTS, default: "below" },
      items: { type: "node_array", node_types: ["card"], default_node_type: "card" },
    },
  },
  card: {
    kind: "block",
    properties: {
      image: { type: "node_array", node_types: ["image"] },
      title: { type: "text", allow_newlines: false },
      text: { type: "text", mark_types: INLINE_MARKS, allow_newlines: true },
      /** A page, or a service or project with its own page, or "" for none. */
      target_id: { type: "string" },
      /** An outside address, or "" for none. At most one of `target_id` and `url` is set. */
      url: { type: "string" },
    },
  },
  /** YouTube and Vimeo videos, played only when the visitor asks (video design decision 1). */
  videos: {
    kind: "block",
    properties: {
      ...PAGE_BLOCK,
      heading: { type: "text", allow_newlines: false },
      items: { type: "node_array", node_types: ["video"], default_node_type: "video" },
    },
  },
  video: {
    kind: "block",
    properties: {
      /** The address of a YouTube or Vimeo video (`videoEmbed`). */
      url: { type: "string" },
      title: { type: "text", allow_newlines: false },
      caption: { type: "text", allow_newlines: false },
      poster: { type: "node_array", node_types: ["image"] },
    },
  },
  /**
   * A form visitors send messages or callback requests with (contact-form design decision 1):
   * its kind decides the fields; messages go to `recipient`, or the main location's email.
   */
  contact_form: {
    kind: "block",
    properties: {
      ...PAGE_BLOCK,
      form_kind: { type: "string", values: CONTACT_FORM_KINDS, default: "contact" },
      heading: { type: "text", allow_newlines: false },
      text: { type: "text", mark_types: INLINE_MARKS, allow_newlines: true },
      button: { type: "text", allow_newlines: false },
      /** An email address, or "" for the main location's. */
      recipient: { type: "string" },
    },
  },
  /** Job openings (jobs design decision 1): the note shows when there are no jobs. */
  jobs: {
    kind: "block",
    properties: {
      ...PAGE_BLOCK,
      heading: { type: "text", allow_newlines: false },
      empty_note: { type: "text", mark_types: INLINE_MARKS, allow_newlines: true },
      items: { type: "node_array", node_types: ["job"], default_node_type: "job" },
    },
  },
  job: {
    kind: "block",
    properties: {
      title: { type: "text", allow_newlines: false },
      summary: { type: "text", allow_newlines: false },
      body: {
        type: "node_array",
        node_types: ["paragraph", "subheading", "list"],
        default_node_type: "paragraph",
      },
      contact_name: { type: "text", allow_newlines: false },
      /** An email address, or "". */
      contact_email: { type: "string" },
      /** A phone number in international form (`+420777294579`), or "". */
      contact_phone: { type: "string" },
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
      /** The focal point of this use, in percent from the left and the top; 50, 50 is the centre. */
      focus_x: { type: "integer", default: 50 },
      focus_y: { type: "integer", default: 50 },
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
