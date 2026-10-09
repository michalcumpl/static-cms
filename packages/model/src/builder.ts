// Writes site documents from content, without spelling out node IDs, empty marks and node arrays
// (example-sites design decision 1). Used for the example sites, later for the templates' test
// sites and by the importer. The builder doesn't validate: the caller runs `validateSite`.
//
// IDs are deterministic (`service_1`, `page_2`, …, in call and build order), and every page's
// `translation_key` is its ID, so building the same site with another language's texts gives the
// same IDs: the languages pair page for page and item for item.
import { type BlockInput, blockFactory, type ImageInput, type LinkInput } from "./block-nodes.js";
import type { BusinessType, NodeType, SiteDocument, Weekday } from "./schema/index.js";
import { WEEKDAYS } from "./schema/index.js";
import { slugify, uniqueSlug } from "./slug.js";
import { THEME_PRESETS } from "./themes.js";

export type { BlockInput, ImageInput, LinkInput } from "./block-nodes.js";

type Node = { id: string; type: NodeType; [key: string]: unknown };

/** Hours of a day as `[opens, closes]` ranges, `HH:MM`. */
export type HoursInput = Partial<Record<Weekday, [string, string][]>>;

export interface ThemeInput {
  /** A preset by name (`THEME_PRESETS`); its values come first, the others override them. */
  preset?: string;
  color_primary?: string;
  color_secondary?: string;
  color_background?: string;
  color_text?: string;
  font_heading?: string;
  font_body?: string;
  radius?: string;
  content_width?: string;
}

export interface LocationInput {
  name?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  map_url?: string;
  hours_note?: string;
  hours?: HoursInput;
}

export interface PageInput {
  title: string;
  slug: string;
  seoDescription?: string;
  home?: boolean;
  /** In the menu: `true` with the title as its label, or the label. */
  menu?: boolean | string;
}

/** A service: its card, and its page's address and text when services have pages. */
export interface ServiceInput {
  name: string;
  description?: string;
  price?: string;
  /** The page's address; made from the name when services have pages and it's missing. */
  slug?: string;
  /** The page's text: paragraphs, `## ` subheadings and `- ` lists. */
  page?: string;
}

/** A project (collection-pages). */
export interface ProjectInput {
  name: string;
  /** A category, by the ID `projectCategory` returned. */
  category?: string;
  summary?: string;
  /** Paragraphs, `## ` subheadings and `- ` lists. */
  body?: string;
  facts?: [label: string, value: string][];
  cover?: ImageInput;
  photos?: { image: ImageInput; caption?: string }[];
  video?: string;
  /** The page's address; made from the name when projects have pages and it's missing. */
  slug?: string;
}

/** Shorthands for writing blocks. */
export const blocks = {
  hero: (b: Omit<Extract<BlockInput, { type: "hero" }>, "type">): BlockInput => ({
    type: "hero",
    ...b,
  }),
  text: (body: string): BlockInput => ({ type: "rich_text", body }),
  textWithImage: (b: Omit<Extract<BlockInput, { type: "text_with_image" }>, "type">) =>
    ({ type: "text_with_image", ...b }) as BlockInput,
  gallery: (b: Omit<Extract<BlockInput, { type: "gallery" }>, "type">) =>
    ({ type: "gallery", ...b }) as BlockInput,
  logos: (b: Omit<Extract<BlockInput, { type: "logos" }>, "type">) =>
    ({ type: "logos", ...b }) as BlockInput,
  services: (
    heading = "",
    chosen?: string[],
    layout?: "cards" | "list" | "accordion",
  ): BlockInput => ({ type: "services", heading, chosen, layout }),
  team: (heading = "", chosen?: string[], layout?: "cards" | "list"): BlockInput => ({
    type: "team",
    heading,
    chosen,
    layout,
  }),
  testimonials: (heading = "", chosen?: string[]): BlockInput => ({
    type: "testimonials",
    heading,
    chosen,
  }),
  faq: (heading = "", chosen?: string[]): BlockInput => ({ type: "faq", heading, chosen }),
  contact: (b: Omit<Extract<BlockInput, { type: "contact" }>, "type"> = {}) =>
    ({ type: "contact", ...b }) as BlockInput,
  openingHours: (heading = "", location?: string): BlockInput => ({
    type: "opening_hours",
    heading,
    location,
  }),
  callToAction: (b: Omit<Extract<BlockInput, { type: "call_to_action" }>, "type">) =>
    ({ type: "call_to_action", ...b }) as BlockInput,
  figures: (b: Omit<Extract<BlockInput, { type: "figures" }>, "type">) =>
    ({ type: "figures", ...b }) as BlockInput,
  steps: (b: Omit<Extract<BlockInput, { type: "steps" }>, "type">) =>
    ({ type: "steps", ...b }) as BlockInput,
  jobs: (b: Omit<Extract<BlockInput, { type: "jobs" }>, "type">) =>
    ({ type: "jobs", ...b }) as BlockInput,
  videos: (b: Omit<Extract<BlockInput, { type: "videos" }>, "type">) =>
    ({ type: "videos", ...b }) as BlockInput,
  cards: (b: Omit<Extract<BlockInput, { type: "cards" }>, "type">) =>
    ({ type: "cards", ...b }) as BlockInput,
  projects: (
    heading = "",
    options: Omit<Extract<BlockInput, { type: "projects" }>, "type" | "heading"> = {},
  ): BlockInput => ({ type: "projects", heading, ...options }),
};

const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

export function siteBuilder(options: {
  name: string;
  lang: string;
  baseUrl?: string;
  description?: string;
}) {
  const counters = new Map<string, number>();
  const nextId = (type: string) => {
    const n = (counters.get(type) ?? 0) + 1;
    counters.set(type, n);
    return `${type}_${n}`;
  };

  let themeInput: ThemeInput = {};
  let businessInput: {
    name?: string;
    type?: BusinessType;
    showInFooter?: boolean;
    social?: string[];
  } = {};
  const locations: { id: string; input: LocationInput }[] = [];
  const images: { slot: "logo" | "favicon" | "share_image"; image: ImageInput }[] = [];
  const services: { id: string; input: ServiceInput }[] = [];
  const projects: { id: string; input: ProjectInput }[] = [];
  const categories: { id: string; name: string }[] = [];
  /** The listing pages of services and projects, by slug (collection-pages decision 2). */
  let listingPages: { services?: string; projects?: string } = {};
  const team: {
    id: string;
    input: { name: string; role?: string; text?: string; image?: ImageInput };
  }[] = [];
  const testimonials: {
    id: string;
    input: { quote: string; name: string; detail?: string; image?: ImageInput };
  }[] = [];
  const faqs: { id: string; input: { question: string; answer: string } }[] = [];
  const pages: { id: string; input: PageInput; blocks: BlockInput[] }[] = [];
  const menuLinks: LinkInput[] = [];
  /** Menu groups, each placed before the menu pages added after it. */
  const menuGroups: { after: number; label: string; items: (string | LinkInput)[] }[] = [];
  let headerShowName = true;

  return {
    theme(input: ThemeInput) {
      themeInput = input;
    },
    business(input: typeof businessInput) {
      businessInput = input;
    },
    /** Adds a location (the first is the main one); returns its ID for blocks. */
    location(input: LocationInput): string {
      const id = nextId("location");
      locations.push({ id, input });
      return id;
    },
    /** The logo; `showName: false` when it already shows the site's name. */
    logo(image: ImageInput, options: { showName?: boolean } = {}) {
      images.push({ slot: "logo", image });
      headerShowName = options.showName ?? true;
    },
    favicon(image: ImageInput) {
      images.push({ slot: "favicon", image });
    },
    shareImage(image: ImageInput) {
      images.push({ slot: "share_image", image });
    },
    service(input: ServiceInput): string {
      const id = nextId("service");
      services.push({ id, input });
      return id;
    },
    projectCategory(name: string): string {
      const id = nextId("category");
      categories.push({ id, name });
      return id;
    },
    project(input: ProjectInput): string {
      const id = nextId("project");
      projects.push({ id, input });
      return id;
    },
    /** Gives services or projects a page each, under the page with this slug. */
    itemPages(input: { services?: string; projects?: string }) {
      listingPages = input;
    },
    person(input: { name: string; role?: string; text?: string; image?: ImageInput }): string {
      const id = nextId("person");
      team.push({ id, input });
      return id;
    },
    testimonial(input: {
      quote: string;
      name: string;
      detail?: string;
      image?: ImageInput;
    }): string {
      const id = nextId("testimonial");
      testimonials.push({ id, input });
      return id;
    },
    faq(input: { question: string; answer: string }): string {
      const id = nextId("faq");
      faqs.push({ id, input });
      return id;
    },
    /** Adds a page with its blocks; the first page is home unless another says `home`. */
    page(input: PageInput, pageBlocks: BlockInput[]): string {
      const id = nextId("page");
      pages.push({ id, input, blocks: pageBlocks });
      return id;
    },
    /** An outside address in the menu, after the pages. */
    menuLink(link: LinkInput) {
      menuLinks.push(link);
    },
    /**
     * A group of links in the menu, after the menu pages added so far: pages by slug or links.
     * A page in a group is labelled by its `menu` label (or its title), and isn't also in the
     * menu outside the group.
     */
    menuGroup(label: string, items: (string | LinkInput)[]) {
      menuGroups.push({ after: pages.length, label, items });
    },

    build(): SiteDocument {
      const nodes: Record<string, Node> = {};
      const add = (type: NodeType, props: Record<string, unknown>, id = nextId(type)) => {
        nodes[id] = { id, type, ...props };
        return id;
      };
      const pageBySlug = new Map(pages.map((p) => [p.input.slug, p.id]));
      const pageId = (slug: string) => {
        const id = pageBySlug.get(slug);
        if (!id) throw new Error(`No page with the slug "${slug}".`);
        return id;
      };

      const { text, image, link, body, block } = blockFactory({ add, pageId });

      const preset = THEME_PRESETS.find((p) => p.name === themeInput.preset) ?? THEME_PRESETS[0];
      const { preset: _, ...themeValues } = themeInput;
      const theme = add("theme", {
        color_primary: preset?.color_primary,
        color_secondary: preset?.color_secondary,
        color_background: preset?.color_background,
        color_text: preset?.color_text,
        font_heading: preset?.font_heading,
        font_body: preset?.font_body,
        radius: preset?.radius,
        content_width: "64rem",
        ...themeValues,
      });

      const locationIds = locations.map(({ id, input }) => {
        // Every day is listed, closed ones without ranges; times as `HH:MM`.
        const time = (value: string) => value.padStart(5, "0");
        const days = WEEKDAYS.map((day) =>
          add("opening_day", {
            day,
            ranges: list(
              (input.hours?.[day] ?? []).map(([opens, closes]) =>
                add("time_range", { opens: time(opens), closes: time(closes) }),
              ),
            ),
          }),
        );
        const { hours: _hours, ...fields } = input;
        // Phones are stored in international form without spaces.
        if (fields.phone) fields.phone = fields.phone.replace(/[\s-]/g, "");
        return add(
          "location",
          {
            name: "",
            street: "",
            postal_code: "",
            city: "",
            country: "CZ",
            phone: "",
            email: "",
            map_url: "",
            hours_note: "",
            ...fields,
            days: list(days),
          },
          id,
        );
      });
      const business = add("business", {
        name: businessInput.name ?? options.name,
        business_type: businessInput.type ?? "LocalBusiness",
        show_in_footer: businessInput.showInFooter ?? true,
        locations: list(locationIds),
        social: list((businessInput.social ?? []).map((url) => add("social_link", { url }))),
      });

      /** Item addresses: given, or made from the name and unique, once the items have pages. */
      const slugs = (entries: { input: { name: string; slug?: string } }[], pages: boolean) => {
        const taken: string[] = [];
        return entries.map(({ input }) => {
          const slug = input.slug ?? (pages ? uniqueSlug(slugify(input.name), taken) : "");
          taken.push(slug);
          return slug;
        });
      };
      const serviceSlugs = slugs(services, listingPages.services !== undefined);
      const projectSlugs = slugs(projects, listingPages.projects !== undefined);
      const items = {
        services: services.map(({ id, input }, i) =>
          add(
            "service_item",
            {
              name: text(input.name),
              description: text(input.description),
              price: text(input.price),
              slug: serviceSlugs[i],
              body: list(body(input.page ?? "", true)),
            },
            id,
          ),
        ),
        projectCategories: categories.map(({ id, name }) =>
          add("project_category", { name: text(name) }, id),
        ),
        projects: projects.map(({ id, input }, i) =>
          add(
            "project",
            {
              name: text(input.name),
              category_id: input.category ?? "",
              summary: text(input.summary),
              body: list(body(input.body ?? "", true)),
              facts: list(
                (input.facts ?? []).map(([label, value]) =>
                  add("fact", { label: text(label), value: text(value) }),
                ),
              ),
              cover: list(image(input.cover)),
              photos: list(
                (input.photos ?? []).map((photo) =>
                  add("gallery_item", {
                    image: list(image(photo.image)),
                    caption: text(photo.caption),
                  }),
                ),
              ),
              video_url: input.video ?? "",
              slug: projectSlugs[i],
            },
            id,
          ),
        ),
        team: team.map(({ id, input }) =>
          add(
            "person",
            {
              name: text(input.name),
              role: text(input.role),
              text: text(input.text),
              image: list(image(input.image)),
            },
            id,
          ),
        ),
        testimonials: testimonials.map(({ id, input }) =>
          add(
            "testimonial",
            {
              quote: text(input.quote),
              name: text(input.name),
              detail: text(input.detail),
              image: list(image(input.image)),
            },
            id,
          ),
        ),
        faqs: faqs.map(({ id, input }) =>
          add("faq_item", { question: text(input.question), answer: text(input.answer) }, id),
        ),
      };

      const pageIds = pages.map(({ id, input, blocks: pageBlocks }) =>
        add(
          "page",
          {
            title: input.title,
            slug: input.slug,
            seo_description: input.seoDescription ?? "",
            translation_key: id,
            share_image: list(),
            blocks: list(pageBlocks.map(block)),
          },
          id,
        ),
      );
      const menuLabel = (p: (typeof pages)[number]) =>
        typeof p.input.menu === "string" ? p.input.menu : p.input.title;
      const group = (input: (typeof menuGroups)[number]) =>
        add("menu_group", {
          label: text(input.label),
          items: list(
            input.items.map((item) => {
              if (typeof item !== "string") return link(item);
              const page = pages.find((p) => p.input.slug === item);
              if (!page) throw new Error(`No page with the slug "${item}" for the menu group`);
              return link({ label: menuLabel(page), page: item });
            }),
          ),
        });
      const grouped = new Set(
        menuGroups.flatMap((g) => g.items.filter((i) => typeof i === "string")),
      );
      // Each group goes before the first menu page added after it.
      const placed = new Set<(typeof menuGroups)[number]>();
      const groupsBefore = (index: number) =>
        menuGroups.filter((g) => g.after <= index && !placed.has(g) && placed.add(g));
      const menuItems = [
        ...pages.flatMap((p, i) =>
          p.input.menu && !grouped.has(p.input.slug)
            ? [...groupsBefore(i).map(group), link({ label: menuLabel(p), page: p.input.slug })]
            : [],
        ),
        ...groupsBefore(pages.length).map(group),
        ...menuLinks.map(link),
      ];
      const nav = add("nav", { items: list(menuItems) });
      const home = pages.find((p) => p.input.home) ?? pages[0];
      const slot = (name: "logo" | "favicon" | "share_image") =>
        list(images.filter((i) => i.slot === name).flatMap((i) => image(i.image)));

      const siteId = "site_1";
      nodes[siteId] = {
        id: siteId,
        type: "site",
        schema_version: 13,
        name: options.name,
        lang: options.lang,
        base_url: options.baseUrl ?? "",
        description: options.description ?? "",
        favicon: slot("favicon"),
        share_image: slot("share_image"),
        logo: slot("logo"),
        header_show_name: headerShowName,
        allow_ai_search: true,
        allow_ai_training: true,
        theme,
        nav,
        business,
        template: "standard",
        template_release: 1,
        services: list(items.services),
        team: list(items.team),
        testimonials: list(items.testimonials),
        faqs: list(items.faqs),
        projects: list(items.projects),
        project_categories: list(items.projectCategories),
        services_page_id: listingPages.services ? pageId(listingPages.services) : "",
        projects_page_id: listingPages.projects ? pageId(listingPages.projects) : "",
        pages: list(pageIds),
        home_page_id: home?.id ?? "",
      };
      return { document_id: siteId, nodes } as unknown as SiteDocument;
    },
  };
}

export type SiteBuilder = ReturnType<typeof siteBuilder>;
