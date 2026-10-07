// Writes site documents from content, without spelling out node IDs, empty marks and node arrays
// (example-sites design decision 1). Used for the example sites, later for the templates' test
// sites and by the importer. The builder doesn't validate: the caller runs `validateSite`.
//
// IDs are deterministic (`service_1`, `page_2`, …, in call and build order), and every page's
// `translation_key` is its ID, so building the same site with another language's texts gives the
// same IDs: the languages pair page for page and item for item.
import type { BusinessType, NodeType, SiteDocument, Weekday } from "./schema/index.js";
import { WEEKDAYS } from "./schema/index.js";
import { graphemeLength } from "./text.js";
import { THEME_PRESETS } from "./themes.js";

type Node = { id: string; type: NodeType; [key: string]: unknown };
type TextValue = { content: string; marks: Mark[]; annotations: [] };
type Mark = { start_offset: number; end_offset: number; node_id: string };

/** An image by its file name until it is loaded into a library (`src`), with its description. */
export type ImageInput = { src: string; width?: number; height?: number } & (
  | { alt: string; decorative?: false }
  | { decorative: true; alt?: string }
);

/** A button or menu entry: a page of the site by its slug, or an outside address. */
export type LinkInput = { label: string } & ({ page: string } | { url: string });

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

/**
 * A block of a page, written lazily so links can name pages declared later. Texts use the
 * inline syntax: `**bold**`, `*italic*`, `[words](https://…)` and `[words](page:slug)`.
 */
export type BlockInput =
  | { type: "hero"; heading: string; text?: string; image?: ImageInput; action?: LinkInput }
  | { type: "rich_text"; body: string }
  | {
      type: "text_with_image";
      heading: string;
      body: string;
      image?: ImageInput;
      side?: "left" | "right";
    }
  | { type: "gallery"; heading?: string; items: { image: ImageInput; caption?: string }[] }
  | {
      type: "logos";
      heading?: string;
      items: { image: ImageInput; name: string; url?: string; page?: string }[];
    }
  | {
      type: "services" | "team" | "testimonials" | "faq";
      heading?: string;
      /** The items to show, by the IDs the builder returned; all of them without it. */
      chosen?: string[];
    }
  | {
      type: "contact";
      heading?: string;
      location?: string;
      show?: Partial<Record<"address" | "phone" | "email" | "map", boolean>>;
    }
  | { type: "opening_hours"; heading?: string; location?: string }
  | { type: "call_to_action"; heading: string; text?: string; actions: LinkInput[] }
  | { type: "figures"; heading?: string; items: { value: string; label: string }[] }
  | { type: "steps"; heading: string; items: { title: string; text?: string }[] };

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
  services: (heading = "", chosen?: string[]): BlockInput => ({
    type: "services",
    heading,
    chosen,
  }),
  team: (heading = "", chosen?: string[]): BlockInput => ({ type: "team", heading, chosen }),
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
  const services: { id: string; input: { name: string; description?: string; price?: string } }[] =
    [];
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
    service(input: { name: string; description?: string; price?: string }): string {
      const id = nextId("service");
      services.push({ id, input });
      return id;
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

      /** A text value from the inline syntax, with its marks as nodes. */
      const text = (source = ""): TextValue => {
        const marks: Mark[] = [];
        let content = "";
        const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;
        let last = 0;
        for (const match of source.matchAll(pattern)) {
          content += source.slice(last, match.index);
          const words = match[1] ?? match[2] ?? match[3] ?? "";
          const start = graphemeLength(content);
          content += words;
          const end = graphemeLength(content);
          let nodeId: string;
          if (match[1] !== undefined) nodeId = add("strong", {});
          else if (match[2] !== undefined) nodeId = add("emphasis", {});
          else {
            const target = match[4] ?? "";
            nodeId = target.startsWith("page:")
              ? add("internal_link", { page_id: pageId(target.slice(5)) })
              : add("link", { href: target });
          }
          marks.push({ start_offset: start, end_offset: end, node_id: nodeId });
          last = (match.index ?? 0) + match[0].length;
        }
        content += source.slice(last);
        return { content, marks, annotations: [] };
      };

      const image = (input: ImageInput | undefined) =>
        input
          ? [
              add("image", {
                src: input.src,
                alt: input.alt ?? "",
                decorative: input.decorative === true,
                width: input.width ?? 0,
                height: input.height ?? 0,
              }),
            ]
          : [];

      const link = (input: LinkInput) =>
        "page" in input
          ? add("page_link", { label: text(input.label), page_id: pageId(input.page) })
          : add("external_link", { label: text(input.label), url: input.url });

      /** Paragraphs, `## ` / `### ` subheadings and `- ` lists, split by blank lines. */
      const body = (source: string, subheadings: boolean) =>
        source
          .trim()
          .split(/\n\s*\n/)
          .map((part) => part.trim())
          .filter((part) => part !== "")
          .map((part) => {
            const heading = /^(#{2,3}) (.+)$/.exec(part);
            if (heading && subheadings) {
              return add("subheading", {
                content: text(heading[2]),
                level: heading[1]?.length ?? 2,
              });
            }
            const lines = part.split("\n");
            if (lines.every((line) => line.startsWith("- "))) {
              const items = lines.map((line) => add("list_item", { content: text(line.slice(2)) }));
              return add("list", { items: list(items) });
            }
            return add("paragraph", { content: text(part) });
          });

      const collectionBlock = (
        type: "services" | "team" | "testimonials" | "faq",
        heading: string | undefined,
        chosen: string[] | undefined,
      ) =>
        add(type, {
          heading: text(heading),
          show: chosen ? "chosen" : "all",
          chosen: list((chosen ?? []).map((itemId) => add("item_ref", { item_id: itemId }))),
        });

      const block = (input: BlockInput): string => {
        switch (input.type) {
          case "hero":
            return add("hero", {
              heading: text(input.heading),
              text: text(input.text),
              image: list(image(input.image)),
              action: list(input.action ? [link(input.action)] : []),
            });
          case "rich_text":
            return add("rich_text", { body: list(body(input.body, true)) });
          case "text_with_image":
            return add("text_with_image", {
              heading: text(input.heading),
              body: list(body(input.body, false)),
              image: list(image(input.image)),
              image_side: input.side ?? "right",
            });
          case "gallery":
            return add("gallery", {
              heading: text(input.heading),
              items: list(
                input.items.map((item) =>
                  add("gallery_item", {
                    image: list(image(item.image)),
                    caption: text(item.caption),
                  }),
                ),
              ),
            });
          case "logos":
            return add("logos", {
              heading: text(input.heading),
              items: list(
                input.items.map((item) =>
                  add("logo_item", {
                    image: list(image(item.image)),
                    name: text(item.name),
                    page_id: item.page ? pageId(item.page) : "",
                    url: item.url ?? "",
                  }),
                ),
              ),
            });
          case "services":
          case "team":
          case "testimonials":
          case "faq":
            return collectionBlock(input.type, input.heading, input.chosen);
          case "contact":
            return add("contact", {
              heading: text(input.heading),
              show_address: input.show?.address ?? true,
              show_phone: input.show?.phone ?? true,
              show_email: input.show?.email ?? true,
              show_map: input.show?.map ?? true,
              location_id: input.location ?? "",
            });
          case "opening_hours":
            return add("opening_hours", {
              heading: text(input.heading),
              location_id: input.location ?? "",
            });
          case "call_to_action":
            return add("call_to_action", {
              heading: text(input.heading),
              text: text(input.text),
              actions: list(input.actions.map(link)),
            });
          case "figures":
            return add("figures", {
              heading: text(input.heading),
              items: list(
                input.items.map((item) =>
                  add("figure", { value: text(item.value), label: text(item.label) }),
                ),
              ),
            });
          case "steps":
            return add("steps", {
              heading: text(input.heading),
              items: list(
                input.items.map((item) =>
                  add("step", { title: text(item.title), text: text(item.text) }),
                ),
              ),
            });
        }
      };

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

      const items = {
        services: services.map(({ id, input }) =>
          add(
            "service_item",
            {
              name: text(input.name),
              description: text(input.description),
              price: text(input.price),
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
      const menuItems = [
        ...pages
          .filter((p) => p.input.menu)
          .map((p) =>
            link({
              label: typeof p.input.menu === "string" ? p.input.menu : p.input.title,
              page: p.input.slug,
            }),
          ),
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
        schema_version: 8,
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
        services: list(items.services),
        team: list(items.team),
        testimonials: list(items.testimonials),
        faqs: list(items.faqs),
        pages: list(pageIds),
        home_page_id: home?.id ?? "",
      };
      return { document_id: siteId, nodes } as unknown as SiteDocument;
    },
  };
}

export type SiteBuilder = ReturnType<typeof siteBuilder>;
