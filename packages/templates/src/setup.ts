import {
  type BUSINESS_TYPES,
  createBlockNodes,
  type HoursInput,
  type NodeType,
  type SiteDocument,
  siteBuilder,
  slugify,
  uniqueSlug,
  type Weekday,
} from "@webmio/model";
import { pageFromLayout } from "./page-from-layout.js";
import type { Localized, Template } from "./types.js";

// The guided setup's answers and the site they make (guided-setup design decisions 2 and 3): one
// pure function, so the preview shows what finishing saves.

/** A business type the setup offers: its schema.org type, names and suggested pages. */
export interface SetupType {
  id: string;
  schemaType: (typeof BUSINESS_TYPES)[number];
  name: Localized;
  /** The layouts it suggests, Home first. */
  pages: readonly string[];
  /** Typical opening hours, filled in for the owner to adjust. */
  hours: HoursInput;
}

const FOOD = ["home", "services", "about", "contact"] as const;
const SALON = ["home", "services", "team", "contact"] as const;

/** Hours from Monday to Friday, then Saturday's and Sunday's when open. */
function week(
  weekdays: [string, string],
  saturday?: [string, string],
  sunday?: [string, string],
): HoursInput {
  const hours: HoursInput = {};
  for (const day of ["mon", "tue", "wed", "thu", "fri"] as const) hours[day] = [weekdays];
  if (saturday) hours.sat = [saturday];
  if (sunday) hours.sun = [sunday];
  return hours;
}

/** The setup's business types (guided-setup spec, "Pages step" and "Contact step"). */
export const SETUP_TYPES: readonly SetupType[] = [
  {
    id: "cafe",
    schemaType: "CafeOrCoffeeShop",
    name: { cs: "Kavárna", en: "Café" },
    pages: FOOD,
    hours: week(["07:00", "19:00"], ["08:00", "18:00"], ["08:00", "18:00"]),
  },
  {
    id: "bakery",
    schemaType: "Bakery",
    name: { cs: "Pekárna", en: "Bakery" },
    pages: FOOD,
    hours: week(["06:00", "18:00"], ["07:00", "12:00"]),
  },
  {
    id: "restaurant",
    schemaType: "Restaurant",
    name: { cs: "Restaurace", en: "Restaurant" },
    pages: FOOD,
    hours: week(["11:00", "22:00"], ["11:00", "22:00"], ["11:00", "21:00"]),
  },
  {
    id: "shop",
    schemaType: "Store",
    name: { cs: "Obchod", en: "Shop" },
    pages: FOOD,
    hours: week(["09:00", "18:00"], ["09:00", "12:00"]),
  },
  {
    id: "hair",
    schemaType: "HairSalon",
    name: { cs: "Kadeřnictví", en: "Hair salon" },
    pages: SALON,
    hours: week(["09:00", "18:00"], ["09:00", "12:00"]),
  },
  {
    id: "beauty",
    schemaType: "BeautySalon",
    name: { cs: "Kosmetický salon", en: "Beauty salon" },
    pages: SALON,
    hours: week(["09:00", "18:00"], ["09:00", "12:00"]),
  },
  {
    id: "professional",
    schemaType: "ProfessionalService",
    name: { cs: "Odborné služby", en: "Professional services" },
    pages: ["home", "services", "about", "team", "contact", "faq"],
    hours: week(["09:00", "17:00"]),
  },
  {
    id: "health",
    schemaType: "MedicalBusiness",
    name: { cs: "Zdravotnictví", en: "Healthcare" },
    pages: ["home", "services", "team", "contact", "faq"],
    hours: week(["07:00", "15:00"]),
  },
  {
    id: "sports",
    schemaType: "SportsActivityLocation",
    name: { cs: "Sport", en: "Sports" },
    pages: ["home", "services", "about", "contact", "faq"],
    hours: week(["07:00", "21:00"], ["09:00", "18:00"], ["09:00", "18:00"]),
  },
  {
    id: "other",
    schemaType: "LocalBusiness",
    name: { cs: "Jiné", en: "Other" },
    pages: FOOD,
    hours: week(["09:00", "17:00"]),
  },
];

/** A photo in the project's media library, as the setup uses it. */
export interface SetupPhoto {
  /** The media key the documents name. */
  key: string;
  alt: string;
  /** Skipped by screen readers: the photo only sets a mood. */
  decorative?: boolean;
}

/** What the owner told the guided setup. Every field but the type and name may be missing. */
export interface SetupAnswers {
  /** A `SETUP_TYPES` id. */
  type: string;
  name: string;
  /** One sentence about the business: the site's description. */
  sentence?: string;
  /** A template ID. */
  template?: string;
  contact?: {
    phone?: string;
    email?: string;
    street?: string;
    postal_code?: string;
    city?: string;
    /** Opening ranges by day, `HH:MM`; a day without ranges is closed. */
    hours?: HoursInput;
  };
  services?: { name: string; description?: string; price?: string }[];
  logo?: SetupPhoto;
  /** The first is the main photo, shown in the home page's hero. */
  photos?: SetupPhoto[];
  /** The ticked layouts' IDs; Home is always added. */
  pages?: string[];
}

/** A media key's size, for the image nodes. */
export type MediaSizes = ReadonlyMap<string, { width: number; height: number }>;

/** The type the answers name, else "other". */
export function setupType(id: string): SetupType {
  return SETUP_TYPES.find((t) => t.id === id) ?? (SETUP_TYPES.at(-1) as SetupType);
}

type Node = { id: string; type: string; [key: string]: unknown };
type List = { nodes: string[]; marks: unknown[]; annotations: unknown[] };
/** Blocks showing a collection the setup doesn't fill, or fills from the answers. */
const COLLECTION_BLOCKS: Record<string, string> = {
  testimonials: "testimonials",
  team: "team",
  faq: "faqs",
  services: "services",
};

/**
 * The site the answers make (guided-setup spec, "Preview and finishing"): the business and its
 * main location, the services, the logo, the ticked pages from the template's layouts in the menu,
 * the main photo in the home page's hero and the others in a gallery, and blocks showing an empty
 * collection hidden.
 */
export function siteFromSetup(
  answers: SetupAnswers,
  template: Template,
  lang: string,
  sizes: MediaSizes = new Map(),
): SiteDocument {
  const czech = lang === "cs";
  const pick = (text: Localized) => (czech ? text.cs : text.en);
  const type = setupType(answers.type);
  const contact = answers.contact ?? {};
  const image = (photo: SetupPhoto) => ({
    src: photo.key,
    alt: photo.decorative ? "" : photo.alt,
    decorative: photo.decorative === true,
    width: sizes.get(photo.key)?.width,
    height: sizes.get(photo.key)?.height,
  });

  const site = siteBuilder({ name: answers.name, lang, description: answers.sentence ?? "" });
  site.business({ name: answers.name, type: type.schemaType });
  // Only what was answered: a missing field keeps the location's empty default.
  site.location(
    Object.fromEntries(
      Object.entries({
        street: contact.street,
        postal_code: contact.postal_code,
        city: contact.city,
        phone: contact.phone,
        email: contact.email,
        hours: contact.hours,
      }).filter(([, value]) => value !== undefined && value !== ""),
    ),
  );
  for (const service of answers.services ?? []) {
    site.service({ name: service.name, description: service.description, price: service.price });
  }
  // A logo shows the business's name unless described otherwise.
  if (answers.logo) site.logo(image({ ...answers.logo, alt: answers.logo.alt || answers.name }));

  // The pages, empty first, so the menu and links know them; their blocks come from the layouts.
  const wanted = new Set(["home", ...(answers.pages ?? [])]);
  const layouts = template.layouts.filter((l) => wanted.has(l.id));
  const taken: string[] = [];
  const pages = layouts.map((layout) => {
    const title = pick(layout.name);
    const slug = uniqueSlug(slugify(title) || layout.id, taken);
    taken.push(slug);
    return { layout, title, slug };
  });
  for (const page of pages) {
    site.page(
      { title: page.title, slug: page.slug, home: page.layout.id === "home", menu: true },
      [],
    );
  }
  const doc = site.build() as unknown as { document_id: string; nodes: Record<string, Node> };
  const siteNode = doc.nodes[doc.document_id] as Node;
  siteNode.template = template.id;
  siteNode.template_release = template.release;

  let n = 0;
  const newId = (nodeType: NodeType) => {
    let id: string;
    do id = `${nodeType}_s${++n}`;
    while (doc.nodes[id]);
    return id;
  };
  const pageIds = (siteNode.pages as List).nodes;
  const pageNodes = new Map<string, Node>();
  for (const [i, page] of pages.entries()) {
    const pageNode = doc.nodes[pageIds[i] ?? ""] as Node;
    const made = pageFromLayout(doc, template, page.layout.id, {
      title: page.title,
      slug: page.slug,
      newId,
    });
    if (!made) continue;
    // The layout's blocks move into the builder's page; the layout's own page node isn't kept.
    for (const node of made.nodes) if (node.id !== made.pageId) doc.nodes[node.id] = node as Node;
    const made_page = made.nodes.find((node) => node.id === made.pageId);
    pageNode.blocks = made_page?.blocks;
    pageNodes.set(page.layout.id, pageNode);
  }
  const blocksOf = (page: Node | undefined) => (page?.blocks as List | undefined)?.nodes ?? [];

  // The main photo in the hero, the others in a gallery on About us, or on Home without it.
  const [main, ...others] = answers.photos ?? [];
  const home = pageNodes.get("home");
  const hero = blocksOf(home)
    .map((id) => doc.nodes[id])
    .find((node) => node?.type === "hero");
  if (main && hero) {
    const id = newId("image");
    const photo = image(main);
    doc.nodes[id] = {
      id,
      type: "image",
      src: photo.src,
      alt: photo.alt,
      decorative: photo.decorative,
      width: photo.width ?? 0,
      height: photo.height ?? 0,
      focus_x: 50,
      focus_y: 50,
    };
    hero.image = { nodes: [id], marks: [], annotations: [] };
  }
  const galleryPage = pageNodes.get("about") ?? home;
  if (others.length > 0 && galleryPage) {
    const made = createBlockNodes(
      {
        type: "gallery",
        heading: czech ? "Fotografie" : "Photos",
        items: others.map((photo) => ({ image: image(photo) })),
        imageFit: template.looks.gallery,
      },
      {
        newId,
        pageId: (slug) => {
          throw new Error(`No page with the slug "${slug}".`);
        },
      },
    );
    for (const node of made.nodes) doc.nodes[node.id] = node as Node;
    blocksOf(galleryPage).push(made.id);
  }

  // Blocks of a collection the answers leave empty: hidden, for the owner to fill and show.
  for (const page of pageNodes.values()) {
    for (const id of blocksOf(page)) {
      const block = doc.nodes[id];
      const collection = block ? COLLECTION_BLOCKS[block.type] : undefined;
      if (!block || !collection) continue;
      if ((siteNode[collection] as List | undefined)?.nodes.length === 0) block.hidden = true;
    }
  }
  return doc as unknown as SiteDocument;
}

/** The weekdays, Monday first, for forms asking hours by day. */
export const SETUP_WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
