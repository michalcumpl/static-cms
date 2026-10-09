// Turns block inputs into site document nodes: the builder's blocks (example-sites design
// decision 1), and the templates' layouts (template-system design decision 7). Texts use the
// inline syntax: `**bold**`, `*italic*`, `[words](https://…)` and `[words](page:slug)`.
import type { NodeType } from "./schema/index.js";
import { graphemeLength } from "./text.js";

type Node = { id: string; type: NodeType; [key: string]: unknown };
type TextValue = { content: string; marks: Mark[]; annotations: [] };
type Mark = { start_offset: number; end_offset: number; node_id: string };

/** An image by its file name until it is loaded into a library (`src`), with its description. */
export type ImageInput = {
  src: string;
  width?: number;
  height?: number;
  /** The focal point in percent from the left and the top; the centre when left out. */
  focus?: { x: number; y: number };
} & ({ alt: string; decorative?: false } | { decorative: true; alt?: string });

/** A button or menu entry: a page of the site by its slug, or an outside address. */
export type LinkInput = { label: string } & ({ page: string } | { url: string });

/**
 * A block of a page, written lazily so links can name pages declared later. Texts use the
 * inline syntax: `**bold**`, `*italic*`, `[words](https://…)` and `[words](page:slug)`.
 */
export type BlockInput =
  | {
      type: "hero";
      heading: string;
      text?: string;
      image?: ImageInput;
      action?: LinkInput;
      /** `cover`: the image fills the hero (block-variants); `slideshow`: its slides. */
      layout?: "beside" | "cover" | "slideshow";
      /** The slides of the slideshow; links as a card's (hero-slideshow). */
      slides?: {
        image?: ImageInput;
        title: string;
        /** An MP4 file on Vimeo, played over the photo. */
        clip?: string;
        page?: string;
        item?: string;
        url?: string;
      }[];
    }
  | { type: "rich_text"; body: string }
  | {
      type: "text_with_image";
      heading: string;
      body: string;
      image?: ImageInput;
      side?: "left" | "right";
    }
  | {
      type: "gallery";
      heading?: string;
      items: { image: ImageInput; caption?: string }[];
      imageFit?: "fill" | "whole";
    }
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
      /** Services: `cards`, `list` or `accordion`; team: `cards` or `list`. */
      layout?: "cards" | "list" | "accordion";
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
  | { type: "steps"; heading: string; items: { title: string; text?: string }[] }
  | {
      type: "jobs";
      heading?: string;
      /** Shown when there are no jobs. */
      note?: string;
      items: {
        title: string;
        summary?: string;
        /** Paragraphs, `## ` subheadings and `- ` lists, as a text block's. */
        body?: string;
        /** The phone in international form, like `+420777294579`. */
        contact?: { name?: string; email?: string; phone?: string };
      }[];
    }
  | {
      type: "videos";
      heading?: string;
      items: { url: string; title: string; caption?: string; poster?: ImageInput }[];
    }
  | {
      type: "cards";
      heading?: string;
      /** `below` (default): the image, then the title and text; `over`: the title over it. */
      look?: "below" | "over";
      items: {
        image?: ImageInput;
        title: string;
        text?: string;
        /** A page by its slug. */
        page?: string;
        /** A project or service, by the ID the builder returned. */
        item?: string;
        url?: string;
      }[];
    }
  | {
      type: "projects";
      heading?: string;
      /** The projects to show, by the IDs the builder returned; all of them without it. */
      chosen?: string[];
      /** A category, by the ID the builder returned; every category without it. */
      category?: string;
      /** At most this many; all without it. */
      limit?: number;
    };

/** How the block factory makes nodes and finds pages. */
export interface BlockFactoryContext {
  /** Stores a node of `type` with `props` (under `id`, or a new ID) and returns its ID. */
  add: (type: NodeType, props: Record<string, unknown>, id?: string) => string;
  /** A page's ID by its slug; throws when there is none. */
  pageId: (slug: string) => string;
}

const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/**
 * The node makers for texts, images, links, text bodies and blocks, writing through `ctx.add`.
 * Every block starts shown (`hidden: false`).
 */
export function blockFactory(ctx: BlockFactoryContext) {
  const { add, pageId } = ctx;
  const addBlock = (type: NodeType, props: Record<string, unknown>) =>
    add(type, { ...props, hidden: false });

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
            focus_x: input.focus?.x ?? 50,
            focus_y: input.focus?.y ?? 50,
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
    type: "services" | "team" | "testimonials" | "faq" | "projects",
    heading: string | undefined,
    chosen: string[] | undefined,
    layout: string | undefined,
  ) =>
    addBlock(type, {
      heading: text(heading),
      show: chosen ? "chosen" : "all",
      chosen: list((chosen ?? []).map((itemId) => add("item_ref", { item_id: itemId }))),
      // Services and the team have a look (block-variants); cards unless chosen.
      ...(type === "services" || type === "team" ? { layout: layout ?? "cards" } : {}),
    });

  const block = (input: BlockInput): string => {
    switch (input.type) {
      case "hero":
        return addBlock("hero", {
          heading: text(input.heading),
          text: text(input.text),
          image: list(image(input.image)),
          action: list(input.action ? [link(input.action)] : []),
          layout: input.layout ?? "beside",
          slides: list(
            (input.slides ?? []).map((slide) =>
              add("slide", {
                image: list(image(slide.image)),
                title: text(slide.title),
                clip_url: slide.clip ?? "",
                target_id: slide.page ? pageId(slide.page) : (slide.item ?? ""),
                url: slide.url ?? "",
              }),
            ),
          ),
        });
      case "rich_text":
        return addBlock("rich_text", { body: list(body(input.body, true)) });
      case "text_with_image":
        return addBlock("text_with_image", {
          heading: text(input.heading),
          body: list(body(input.body, false)),
          image: list(image(input.image)),
          image_side: input.side ?? "right",
        });
      case "gallery":
        return addBlock("gallery", {
          heading: text(input.heading),
          items: list(
            input.items.map((item) =>
              add("gallery_item", {
                image: list(image(item.image)),
                caption: text(item.caption),
              }),
            ),
          ),
          image_fit: input.imageFit ?? "fill",
        });
      case "logos":
        return addBlock("logos", {
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
        return collectionBlock(input.type, input.heading, input.chosen, input.layout);
      case "contact":
        return addBlock("contact", {
          heading: text(input.heading),
          show_address: input.show?.address ?? true,
          show_phone: input.show?.phone ?? true,
          show_email: input.show?.email ?? true,
          show_map: input.show?.map ?? true,
          location_id: input.location ?? "",
        });
      case "opening_hours":
        return addBlock("opening_hours", {
          heading: text(input.heading),
          location_id: input.location ?? "",
        });
      case "call_to_action":
        return addBlock("call_to_action", {
          heading: text(input.heading),
          text: text(input.text),
          actions: list(input.actions.map(link)),
        });
      case "figures":
        return addBlock("figures", {
          heading: text(input.heading),
          items: list(
            input.items.map((item) =>
              add("figure", { value: text(item.value), label: text(item.label) }),
            ),
          ),
        });
      case "jobs":
        return addBlock("jobs", {
          heading: text(input.heading),
          empty_note: text(input.note),
          items: list(
            input.items.map((item) =>
              add("job", {
                title: text(item.title),
                summary: text(item.summary),
                body: list(body(item.body ?? "", true)),
                contact_name: text(item.contact?.name),
                contact_email: item.contact?.email ?? "",
                contact_phone: item.contact?.phone ?? "",
              }),
            ),
          ),
        });
      case "videos":
        return addBlock("videos", {
          heading: text(input.heading),
          items: list(
            input.items.map((item) =>
              add("video", {
                url: item.url,
                title: text(item.title),
                caption: text(item.caption),
                poster: list(image(item.poster)),
              }),
            ),
          ),
        });
      case "cards":
        return addBlock("cards", {
          heading: text(input.heading),
          layout: input.look ?? "below",
          items: list(
            input.items.map((item) =>
              add("card", {
                image: list(image(item.image)),
                title: text(item.title),
                text: text(item.text),
                target_id: item.page ? pageId(item.page) : (item.item ?? ""),
                url: item.url ?? "",
              }),
            ),
          ),
        });
      case "projects":
        return addBlock("projects", {
          heading: text(input.heading),
          show: input.chosen ? "chosen" : "all",
          chosen: list((input.chosen ?? []).map((itemId) => add("item_ref", { item_id: itemId }))),
          category_id: input.category ?? "",
          limit: input.limit ?? 0,
        });
      case "steps":
        return addBlock("steps", {
          heading: text(input.heading),
          items: list(
            input.items.map((item) =>
              add("step", { title: text(item.title), text: text(item.text) }),
            ),
          ),
        });
    }
  };
  return { text, image, link, body, block };
}

/** How `createBlockNodes` names new nodes and finds pages. */
export interface BlockNodesContext {
  /** A new, unused node ID for a node of `type`. */
  newId: (type: NodeType) => string;
  /** A page's ID by its slug; throws when there is none. */
  pageId: (slug: string) => string;
}

/** A block and every node it owns, made from `input`: the block's ID and the new nodes. */
export function createBlockNodes(
  input: BlockInput,
  ctx: BlockNodesContext,
): { id: string; nodes: Node[] } {
  const nodes: Node[] = [];
  const { block } = blockFactory({
    add: (type, props, id = ctx.newId(type)) => {
      nodes.push({ id, type, ...props });
      return id;
    },
    pageId: ctx.pageId,
  });
  return { id: block(input), nodes };
}
