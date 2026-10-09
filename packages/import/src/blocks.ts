import { escapeInline, videoEmbed } from "@webmio/model";
import { type Cheerio, type CheerioAPI, load } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { resolve } from "./addresses.js";
import { jsonLdNodes } from "./business.js";
import { collapse, contentArea } from "./content.js";
import { backgroundImages, inlineDeclarations } from "./css.js";
import { candidateList, type ImageCollector, imageCandidates } from "./images.js";
import type { LeftOut } from "./report.js";
import { type InlineContext, inlineText, plainText } from "./text.js";

// A page's content as segments of the new page (site-import spec, "Page content"; design decision
// 6). Segments name images by reference and questions by their texts; the site assembles them
// into blocks once images are fetched and questions are in the collection.

/** An image as a page uses it. */
export interface ImageUse {
  ref: string;
  alt: string;
}

export type Segment =
  | { kind: "text"; source: string }
  | {
      kind: "text_with_image";
      heading: string;
      body: string;
      image: ImageUse;
      side: "left" | "right";
    }
  | { kind: "gallery"; heading: string; items: { image: ImageUse; caption: string }[] }
  | { kind: "logos"; heading: string; items: { image: ImageUse; name: string; url: string }[] }
  | { kind: "videos"; heading: string; items: { url: string; title: string }[] }
  | { kind: "faq"; heading: string; items: { question: string; answer: string }[] };

export interface PageContent {
  /** The page's first `<h1>`, as words. */
  title: string;
  segments: Segment[];
  /** The page's first photo near its top, taken out of the segments for the home page's hero. */
  heroImage?: ImageUse;
  leftOut: LeftOut[];
}

type Item =
  | { kind: "heading"; level: number; text: string; group: Element | null }
  | { kind: "paragraph"; text: string; group: Element | null }
  | { kind: "list"; items: string[]; group: Element | null }
  | { kind: "image"; image: ImageUse; caption: string; link: string; group: Element | null }
  | { kind: "video"; url: string; title: string; group: Element | null }
  | { kind: "faq"; question: string; answer: string; group: Element | null }
  | { kind: "twi"; segment: Extract<Segment, { kind: "text_with_image" }>; group: Element | null };

/** Text an image needs beside it to be a text with image block. */
const TEXT_BESIDE = 80;
/** Smaller images are icons. */
const ICON = 48;
const GROUPS = "section, article, div, li, td, aside, header, footer";
const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "table",
  "blockquote",
  "figure",
  "details",
  "form",
  "iframe",
  "img",
  "picture",
  "video",
  "audio",
  "object",
  "embed",
  "section",
  "article",
  "div",
]);

export interface ReadOptions {
  ctx: InlineContext;
  images: ImageCollector;
  /** The page's stylesheets, for background photos. */
  css: readonly string[];
  /** Take the first photo near the top out for a hero. */
  hero: boolean;
  /** The page's old path, naming it in the report. */
  page: string;
}

export function readPage(html: string, options: ReadOptions): PageContent {
  const $ = load(html);
  const root = contentArea($);
  // Emails hidden by an anti-spam script read "[email protected]"; the business details report them.
  root.find(".__cf_email__, [data-cfemail], a[href*='/cdn-cgi/l/email-protection']").remove();
  const leftOut: LeftOut[] = [];
  addBackgrounds($, root, options);
  const title = collapse($("h1").first().text());
  const items: Item[] = [];
  let titleSkipped = false;

  const walk = (node: AnyNode): void => {
    if (node.type === "text") {
      const text = collapse((node as unknown as { data: string }).data);
      // Loose text in a container is a paragraph of its own.
      if (text.length > 1 && !isInline(node.parent))
        items.push({
          kind: "paragraph",
          text: inlineText($(node), options.ctx),
          group: groupOf($, node),
        });
      return;
    }
    if (node.type !== "tag") return;
    const el = $(node as Element);
    const name = (node as Element).name.toLowerCase();
    const group = groupOf($, node);
    switch (name) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const text = plainText(el);
        if (name === "h1" && !titleSkipped) {
          titleSkipped = true;
          return;
        }
        if (text) items.push({ kind: "heading", level: Number(name[1]), text, group });
        return;
      }
      case "p":
      case "blockquote": {
        for (const img of el.find("img").toArray()) image($(img), group);
        const copy = el.clone();
        copy.find("img, picture").remove();
        const text = inlineText(copy, options.ctx);
        if (text) items.push({ kind: "paragraph", text, group });
        return;
      }
      case "ul":
      case "ol": {
        const lis = el
          .children("li")
          .toArray()
          .map((li) => inlineText($(li), options.ctx))
          .filter((t) => t !== "");
        if (lis.length > 0) items.push({ kind: "list", items: lis, group });
        return;
      }
      case "table": {
        for (const tr of el.find("tr").toArray()) {
          const cells = $(tr)
            .children("td, th")
            .toArray()
            .map((c) => inlineText($(c), options.ctx))
            .filter((t) => t !== "");
          if (cells.length > 0) items.push({ kind: "paragraph", text: cells.join(" · "), group });
        }
        return;
      }
      case "figure": {
        const img = el.find("img").first();
        if (img.length) image(img, group, plainText(el.find("figcaption").first()));
        else el.children().each((_i, child) => walk(child));
        return;
      }
      case "img":
        image(el, group);
        return;
      case "picture":
        image(el.find("img").first(), group);
        return;
      case "details": {
        const summary = el.children("summary").first();
        const question = plainText(summary);
        const copy = el.clone();
        copy.children("summary").remove();
        const answer = inlineText(copy, options.ctx);
        if (question && answer) items.push({ kind: "faq", question, answer, group });
        return;
      }
      case "iframe": {
        const src = resolve(el.attr("src") ?? el.attr("data-src"), options.ctx.base);
        const embed = src ? videoEmbed(src.href) : undefined;
        if (src && embed) {
          items.push({
            kind: "video",
            url: src.href,
            title: collapse(el.attr("title") ?? "") || "Video",
            group,
          });
        } else {
          leftOut.push({ reason: "embed", page: options.page, detail: src?.hostname ?? "" });
        }
        return;
      }
      case "object":
      case "embed": {
        // An image shown through an embed (Webnode's SVG icons): read as an image.
        const source = el.attr("src") ?? el.attr("data-src") ?? el.attr("data");
        const isImage =
          (el.attr("type") ?? "").startsWith("image/") ||
          /\.(jpe?g|png|webp|gif|svg|avif)(\?|$)/i.test(source ?? "");
        const ref = isImage
          ? options.images.add(
              candidateList([source], options.ctx.base),
              collapse(el.attr("alt") ?? ""),
              "content",
              options.page,
            )
          : undefined;
        if (ref)
          items.push({
            kind: "image",
            image: { ref, alt: collapse(el.attr("alt") ?? "") },
            caption: "",
            link: "",
            group,
          });
        else leftOut.push({ reason: "embed", page: options.page, detail: name });
        return;
      }
      case "video":
      case "audio":
        leftOut.push({ reason: "embed", page: options.page, detail: name });
        return;
      case "form":
        leftOut.push({ reason: "form", page: options.page, detail: "" });
        return;
      case "a": {
        // A link on its own (a button): a paragraph with the link.
        if (el.find("img").length && !collapse(el.text())) {
          image(el.find("img").first(), group);
          return;
        }
        const text = inlineText(el, options.ctx);
        if (text) items.push({ kind: "paragraph", text, group });
        return;
      }
      default:
        el.contents().each((_i, child) => walk(child));
    }
  };

  const image = (img: Cheerio<AnyNode>, group: Element | null, caption = "") => {
    if (!img.length) return;
    const el = img as Cheerio<Element>;
    const width = Number(el.attr("width"));
    const height = Number(el.attr("height"));
    if ((width > 0 && width < ICON) || (height > 0 && height < ICON)) return;
    const alt = collapse(el.attr("alt") ?? "");
    const ref = options.images.add(
      imageCandidates(el, options.ctx.base),
      alt,
      "content",
      options.page,
    );
    if (!ref) return;
    const linked = resolve(el.closest("a").attr("href"), options.ctx.base);
    items.push({
      kind: "image",
      image: { ref, alt },
      caption,
      link:
        linked && (linked.protocol === "http:" || linked.protocol === "https:") ? linked.href : "",
      group,
    });
  };

  root.contents().each((_i, child) => walk(child));
  const heroImage = options.hero ? takeHeroImage(items) : undefined;
  const segments = assemble(textWithImages(items));
  // Questions only in FAQPage structured data: a questions block at the page's end, since
  // structured data has no place on the page.
  const shown = new Set(items.flatMap((i) => (i.kind === "faq" ? [i.question] : [])));
  const structured = faqPageQuestions(html).filter((q) => !shown.has(q.question));
  if (structured.length > 0) segments.push({ kind: "faq", heading: "", items: structured });
  return { title, segments, heroImage, leftOut };
}

/** The questions and answers of a page's FAQPage structured data, as plain escaped text. */
function faqPageQuestions(html: string): { question: string; answer: string }[] {
  const text = (value: unknown) =>
    escapeInline(collapse(load(`<p>${typeof value === "string" ? value : ""}</p>`)("p").text()));
  return jsonLdNodes(html)
    .filter((node) => [node["@type"]].flat().includes("FAQPage"))
    .flatMap((page) => [page.mainEntity].flat())
    .flatMap((entity) => {
      const q = entity as { name?: unknown; acceptedAnswer?: { text?: unknown } } | undefined;
      const question = text(q?.name);
      const answer = text(q?.acceptedAnswer?.text);
      return question && answer ? [{ question, answer }] : [];
    });
}

function isInline(node: AnyNode | null): boolean {
  const name = (node as Element | null)?.name?.toLowerCase();
  return name !== undefined && !BLOCK_TAGS.has(name) && name !== "body" && name !== "main";
}

/** The container an item sits in, for telling which texts and images belong together. */
function groupOf($: CheerioAPI, node: AnyNode): Element | null {
  const parent = node.parent as Element | null;
  if (!parent) return null;
  const el = $(parent).closest(GROUPS);
  return (el.get(0) as Element | undefined) ?? null;
}

/** Background photos (from the stylesheets and `style` attributes) as images at their element's start. */
function addBackgrounds($: CheerioAPI, root: Cheerio<AnyNode>, options: ReadOptions): void {
  const add = (el: Cheerio<Element>, url: string) => {
    if (el.children("img[data-import-background]").length) return;
    el.prepend($("<img data-import-background>").attr("src", url).attr("alt", ""));
  };
  for (const css of options.css) {
    for (const { selector, url } of backgroundImages(css)) {
      // Selectors with states or generated content (`:hover`, `::before`) don't show a photo.
      if (/:/.test(selector)) continue;
      try {
        root.find(selector).each((_i, el) => add($(el), url));
      } catch {
        // A selector cheerio can't read adds nothing.
      }
    }
  }
  root.find("[style*=background]").each((_i, el) => {
    const url = inlineDeclarations($(el).attr("style") ?? "").flatMap((d) => d.urls)[0];
    if (url) add($(el), url);
  });
}

/** The first photo before the page's second heading, for the hero; removed from the items. */
function takeHeroImage(items: Item[]): ImageUse | undefined {
  let headings = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item?.kind === "heading" && ++headings > 1) return undefined;
    if (item?.kind === "image") {
      items.splice(i, 1);
      return item.image;
    }
  }
  return undefined;
}

/** Whether `inner` is `outer` or inside it. */
function within(inner: Element | null, outer: Element): boolean {
  for (let node: Element | null = inner; node; node = node.parent as Element | null) {
    if (node === outer) return true;
  }
  return false;
}

/** How many containers up from an image its text may be: a photo and its text side by side. */
const TEXT_LEVELS = 2;

/**
 * An image whose container (or one up to two levels above it) holds only it and enough text, a
 * heading at most, becomes a text with image block where the container's first item was.
 */
function textWithImages(items: Item[]): Item[] {
  const used = new Set<Item>();
  const at = new Map<Item, Item>();
  for (const image of items) {
    if (image.kind !== "image" || used.has(image) || !image.group) continue;
    let container: Element | null = image.group;
    for (let level = 0; container && level <= TEXT_LEVELS; level++) {
      const outer: Element = container;
      const members = items.filter((i) => !used.has(i) && i.group && within(i.group, outer));
      const start = items.indexOf(members[0] as Item);
      const contiguous = members.every((m, n) => items[start + n] === m);
      const texts = members.filter((i) => i.kind === "paragraph" || i.kind === "list");
      const headings = members.filter((i) => i.kind === "heading");
      const others = members.length - texts.length - headings.length - 1;
      const body = texts
        .map((t) =>
          t.kind === "list"
            ? t.items.map((li) => `- ${li}`).join("\n")
            : t.kind === "paragraph"
              ? t.text
              : "",
        )
        .join("\n\n");
      if (
        contiguous &&
        others === 0 &&
        headings.length <= 1 &&
        collapse(body).length >= TEXT_BESIDE
      ) {
        const heading = headings[0]?.kind === "heading" ? headings[0].text : "";
        const first = members[0] as Item;
        at.set(first, {
          kind: "twi",
          segment: {
            kind: "text_with_image",
            heading,
            body,
            image: image.image,
            side: first === image ? "left" : "right",
          },
          group: outer,
        });
        for (const member of members) used.add(member);
        break;
      }
      // More than this image and text: going further up only adds more.
      if (others > 0) break;
      container = outer.parent ? (findGroup(outer.parent as Element) ?? null) : null;
    }
  }
  return items.flatMap((item) =>
    at.has(item) ? [at.get(item) as Item] : used.has(item) ? [] : [item],
  );
}

/** The nearest container at or above an element. */
function findGroup(el: Element | null): Element | undefined {
  const names = new Set(GROUPS.split(", "));
  for (let node: Element | null = el; node; node = node.parent as Element | null) {
    if (node.type === "tag" && names.has(node.name.toLowerCase())) return node;
  }
  return undefined;
}

/** Items in document order as segments: text blocks split at main headings, runs as blocks. */
function assemble(items: Item[]): Segment[] {
  const levels = [...new Set(items.flatMap((i) => (i.kind === "heading" ? [i.level] : [])))].sort();
  const segments: Segment[] = [];
  let text: string[] = [];
  let hasMain = false;
  const flush = () => {
    if (text.length > 0) segments.push({ kind: "text", source: text.join("\n\n") });
    text = [];
  };
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Item;
    if (item.kind === "heading") {
      // A heading right before a run of photos, videos or questions is that block's heading.
      const next = items[i + 1];
      if (next && (next.kind === "image" || next.kind === "video" || next.kind === "faq")) {
        i = run(items, i + 1, item.text, segments, flush);
        hasMain = true;
        continue;
      }
      const main = item.level === levels[0] || !hasMain;
      if (main) {
        flush();
        hasMain = true;
      }
      text.push(`${main ? "##" : "###"} ${item.text}`);
    } else if (item.kind === "paragraph") {
      text.push(item.text);
    } else if (item.kind === "list") {
      text.push(item.items.map((li) => `- ${li}`).join("\n"));
    } else if (item.kind === "twi") {
      flush();
      segments.push(item.segment);
    } else {
      i = run(items, i, "", segments, flush);
    }
  }
  flush();
  return segments;
}

/** A run of images, videos or questions from `start` as one block; returns the last item's index. */
function run(
  items: Item[],
  start: number,
  heading: string,
  segments: Segment[],
  flush: () => void,
): number {
  flush();
  const kind = items[start]?.kind;
  let end = start;
  while (items[end + 1]?.kind === kind) end++;
  const slice = items.slice(start, end + 1);
  if (kind === "video") {
    segments.push({
      kind: "videos",
      heading,
      items: slice.flatMap((i) => (i.kind === "video" ? [{ url: i.url, title: i.title }] : [])),
    });
  } else if (kind === "faq") {
    segments.push({
      kind: "faq",
      heading,
      items: slice.flatMap((i) =>
        i.kind === "faq" ? [{ question: i.question, answer: i.answer }] : [],
      ),
    });
  } else {
    const images = slice.flatMap((i) => (i.kind === "image" ? [i] : []));
    // Three or more images each linking somewhere, without captions: a row of logos.
    if (images.length >= 3 && images.every((i) => i.link && !i.caption)) {
      segments.push({
        kind: "logos",
        heading,
        items: images.map((i) => ({
          image: i.image,
          name: i.image.alt || hostName(i.link),
          url: i.link,
        })),
      });
    } else {
      segments.push({
        kind: "gallery",
        heading,
        items: images.map((i) => ({ image: i.image, caption: i.caption })),
      });
    }
  }
  return end;
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
