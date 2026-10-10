import { escapeInline, type Weekday } from "@webmio/model";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { resolve } from "./addresses.js";
import type { ImageUse, Segment } from "./blocks.js";
import { bookingPage, isBookingService } from "./booking.js";
import { collapse } from "./content.js";
import type { InlineContext } from "./text.js";

// Structures the import maps to Webmio's blocks (import-existing-blocks design decisions 1 to 6):
// recognised on an element before the walk reads its contents, and only when sure, since a text
// block the owner can convert beats a wrong block.

/** What recognising structures needs from the page being read. */
export interface DetectContext {
  $: CheerioAPI;
  ctx: InlineContext;
  /** Adds a content image (not an icon) and returns how the page uses it. */
  image: (img: Cheerio<Element>) => ImageUse | undefined;
  /** Whether an image is too small to be content. */
  isIcon: (img: Cheerio<Element>) => boolean;
  /** The days the business's imported hours name; empty without hours. */
  hoursDays: ReadonlySet<Weekday>;
  /** Whether the home page's hero may still take a photo here (it isn't a banner then). */
  heroMayTake: () => boolean;
}

/** Cards a block holds at most (validation's limit). */
export const MAX_CARDS = 12;
/** A card's text beyond its title, at most. */
const CARD_TEXT = 200;
/** A figure's value, at most (validation's long-figure limit). */
const FIGURE_VALUE = 24;
const FIGURE_LABEL = 60;

const words = (el: Cheerio<Element>) => collapse(el.text());
const elementChildren = (el: Cheerio<Element>) => el.children().toArray() as unknown as Element[];

/** A structure on `el`, or undefined to read it as usual. */
export function detectStructure(
  el: Cheerio<Element>,
  name: string,
  d: DetectContext,
): Segment | undefined {
  if (name === "iframe") return mapEmbed(el, d) ?? bookingEmbed(el, d);
  if (name === "a") return bookingLink(el, d);
  if (name === "ol") {
    const steps = boldSteps(el, d);
    if (steps) return steps;
  }
  if (["table", "ul", "ol", "dl", "div", "p"].includes(name)) {
    const hours = openingHours(el, name, d);
    if (hours) return hours;
  }
  if (["section", "div", "article"].includes(name)) {
    const found = banner(el, d);
    if (found) return found;
  }
  return keyFigures(el, d) ?? cards(el, d);
}

// Banners (banner-block design decision 5) --------------------------------------------------

/** A banner's text, at most: a sentence or two over the photo. */
const BANNER_TEXT = 300;

/**
 * A band with a background photo (the `img` `addBackgrounds` put in), one heading, a sentence or
 * two and maybe a link: a banner, its first link the button. Anything more stays as it is.
 */
function banner(el: Cheerio<Element>, d: DetectContext): Segment | undefined {
  const backdrop = el.children("img[data-import-background]").first();
  if (!backdrop.length || d.heroMayTake()) return undefined;
  const headings = el.find("h1, h2, h3, h4, h5, h6");
  if (headings.length !== 1 || !headings.is("h2, h3, h4")) return undefined;
  if (el.find("ul, ol, table, form, iframe, video").length) return undefined;
  const others = el
    .find("img")
    .not(backdrop)
    .toArray()
    .map((img) => d.$(img) as Cheerio<Element>)
    .filter((img) => !d.isIcon(img));
  if (others.length > 0) return undefined;
  const paragraphs = el
    .find("p")
    .toArray()
    .map((p) => words(d.$(p)))
    .filter(Boolean);
  const text = paragraphs.join(" ");
  if (paragraphs.length > 2 || text.length > BANNER_TEXT) return undefined;
  const heading = words(headings.first() as Cheerio<Element>);
  if (!heading) return undefined;
  const image = d.image(backdrop as Cheerio<Element>);
  if (!image) return undefined;
  const anchor = el
    .find("a[href]")
    .toArray()
    .map((a) => d.$(a) as Cheerio<Element>)
    .find((a) => words(a) !== "");
  const target = anchor ? resolve(anchor.attr("href"), d.ctx.base) : undefined;
  const link = (target && d.ctx.link(target)) ?? "";
  return {
    kind: "banner",
    heading: escapeInline(heading),
    text: escapeInline(text),
    image,
    button: anchor && link ? { label: escapeInline(words(anchor)), link } : undefined,
  };
}

// Cards (design decision 2) -----------------------------------------------------------------

/** An element's tag and classes without digits: what a template-made grid repeats. */
function signature(el: Element): string {
  const classes = (el.attribs.class ?? "")
    .split(/\s+/)
    .map((c) => c.replace(/\d+/g, ""))
    .filter(Boolean)
    .sort();
  return [el.name.toLowerCase(), ...classes].join(".");
}

function cards(el: Cheerio<Element>, d: DetectContext): Segment | undefined {
  const kids = elementChildren(el);
  if (kids.length < 3) return undefined;
  const first = signature(kids[0] as Element);
  if (!kids.every((kid) => signature(kid) === first)) return undefined;
  const read = kids.map((kid) => {
    const card = d.$(kid);
    const images = card
      .find("img")
      .toArray()
      .map((img) => d.$(img) as Cheerio<Element>)
      .filter((img) => !d.isIcon(img));
    const heading = card.find("h1, h2, h3, h4, h5, h6").first();
    const anchor = card.is("a[href]") ? card : card.find("a[href]").first();
    const title = words(heading.length ? heading : anchor);
    const all = words(card);
    const rest = collapse(all.replace(title, ""));
    return { images, title, rest, anchor };
  });
  if (!read.every((c) => c.images.length === 1 && c.title && c.rest.length <= CARD_TEXT)) {
    return undefined;
  }
  return {
    kind: "cards",
    heading: "",
    items: read.map((c) => {
      const target = resolve(c.anchor.attr("href"), d.ctx.base);
      return {
        image: d.image(c.images[0] as Cheerio<Element>),
        title: escapeInline(c.title),
        text: escapeInline(c.rest),
        link: (target && d.ctx.link(target)) ?? "",
      };
    }),
  };
}

// Key figures (design decision 3) -----------------------------------------------------------

const FIGURE = /^[~≈+−-]?\d[\d\s.,]*(\s?(%|\+|[\p{L}€$]{1,6}\.?)){0,2}\+?$/u;

/** A figure's two parts: its value and its label, either way round. */
function figure(
  el: Cheerio<Element>,
  d: DetectContext,
): { value: string; label: string } | undefined {
  const parts = elementChildren(el)
    .map((part) => words(d.$(part)))
    .filter(Boolean);
  let pair: string[] = parts;
  if (parts.length !== 2) {
    const bold = el.children("strong, b").first();
    if (!bold.length) return undefined;
    const value = words(bold);
    pair = [value, collapse(words(el).replace(value, ""))];
  }
  const [a = "", b = ""] = pair;
  const [value, label] = FIGURE.test(a) ? [a, b] : FIGURE.test(b) ? [b, a] : ["", ""];
  if (!value || !label || value.length > FIGURE_VALUE || label.length > FIGURE_LABEL) {
    return undefined;
  }
  return { value: escapeInline(value), label: escapeInline(label) };
}

function keyFigures(el: Cheerio<Element>, d: DetectContext): Segment | undefined {
  const kids = elementChildren(el);
  // Six is validation's limit: seven or more stay text.
  if (kids.length < 2 || kids.length > 6) return undefined;
  if (el.find("img").length > 0) return undefined;
  const items = kids.map((kid) => figure(d.$(kid), d));
  if (!items.every((i) => i !== undefined)) return undefined;
  return { kind: "figures", heading: "", items: items as { value: string; label: string }[] };
}

// Steps (design decision 4) -----------------------------------------------------------------

function boldSteps(el: Cheerio<Element>, d: DetectContext): Segment | undefined {
  const lis = el.children("li").toArray();
  if (lis.length < 2) return undefined;
  const items = lis.map((li) => {
    const item = d.$(li);
    const firstChild = item
      .contents()
      .toArray()
      .find((n) => n.type !== "text" || collapse((n as unknown as { data: string }).data) !== "");
    const lead = firstChild && firstChild.type === "tag" ? d.$(firstChild as Element) : undefined;
    if (!lead?.is("strong, b, h1, h2, h3, h4, h5, h6")) return undefined;
    const title = words(lead);
    const text = collapse(words(item).replace(title, "")).replace(/^[–:.-]\s*/, "");
    return title ? { title: escapeInline(title), text: escapeInline(text) } : undefined;
  });
  if (!items.every((i) => i !== undefined)) return undefined;
  return { kind: "steps", heading: "", items: items as { title: string; text: string }[] };
}

// Opening hours (design decision 5) ---------------------------------------------------------

const capitalised = (name: string) => `${name[0]?.toUpperCase() ?? ""}${name.slice(1)}`;
/**
 * A day's name on its own, not inside another word (`\b` knows only ASCII letters): full names in
 * either case, short ones capitalised only, so the word "ne" isn't Sunday.
 */
const day = (full: string[], short: string[]) => {
  const names = [...full.flatMap((n) => [n, capitalised(n), n.toUpperCase()]), ...short];
  return new RegExp(`(?<!\\p{L})(${names.join("|")})(?!\\p{L})`, "u");
};
const DAY_NAMES: [Weekday, RegExp][] = [
  ["mon", day(["pondělí", "pondělky", "monday"], ["Po", "Mon"])],
  ["tue", day(["úterý", "tuesday"], ["Út", "Tue", "Tues"])],
  ["wed", day(["středa", "středu", "wednesday"], ["St", "Wed"])],
  ["thu", day(["čtvrtek", "thursday"], ["Čt", "Thu", "Thurs"])],
  ["fri", day(["pátek", "friday"], ["Pá", "Fri"])],
  ["sat", day(["sobota", "sobotu", "saturday"], ["So", "Sat"])],
  ["sun", day(["neděle", "neděli", "sunday"], ["Ne", "Sun"])],
];
const TIME = /\b\d{1,2}[:.]\d{2}\b/;
/** A schedule in a container of short lines, at most this long. */
const SCHEDULE_TEXT = 400;

function openingHours(el: Cheerio<Element>, name: string, d: DetectContext): Segment | undefined {
  if (d.hoursDays.size === 0) return undefined;
  const text = words(el);
  if (!TIME.test(text)) return undefined;
  if ((name === "div" || name === "p") && text.length > SCHEDULE_TEXT) return undefined;
  const named = DAY_NAMES.filter(([, pattern]) => pattern.test(text)).map(([day]) => day);
  // A timetable of other days (a course) isn't the business's hours.
  const shared = named.filter((day) => d.hoursDays.has(day));
  if (named.length < 3 || shared.length < 3) return undefined;
  return { kind: "hours", heading: "" };
}

// Maps and booking (design decision 6) ------------------------------------------------------

const iframeSource = (el: Cheerio<Element>, d: DetectContext) =>
  resolve(el.attr("src") ?? el.attr("data-src"), d.ctx.base);

/** Whether an address is an embedded Google or Mapy.cz map. */
function isMap(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (/(^|\.)mapy\.cz$/.test(host)) return true;
  if (/^maps\.google\./.test(host)) return true;
  return /(^|\.)google\.[a-z.]+$/.test(host) && url.pathname.startsWith("/maps");
}

/** The "Show on map" link for the place an embedded map names, or `""` when it names none. */
export function mapPlace(url: URL): string {
  if (/mapy\.cz$/.test(url.hostname)) {
    const x = url.searchParams.get("x");
    const y = url.searchParams.get("y");
    return x && y ? `https://mapy.cz/?x=${x}&y=${y}&z=17` : "";
  }
  const q = url.searchParams.get("q");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

function mapEmbed(el: Cheerio<Element>, d: DetectContext): Segment | undefined {
  const src = iframeSource(el, d);
  if (!src || !isMap(src)) return undefined;
  return { kind: "map", heading: "", place: mapPlace(src) };
}

function bookingEmbed(el: Cheerio<Element>, d: DetectContext): Segment | undefined {
  const src = iframeSource(el, d);
  if (!src || !isBookingService(src)) return undefined;
  return { kind: "booking", heading: "", text: "", label: "", url: bookingPage(src) };
}

function bookingLink(el: Cheerio<Element>, d: DetectContext): Segment | undefined {
  const href = resolve(el.attr("href"), d.ctx.base);
  if (!href || !isBookingService(href)) return undefined;
  const label = escapeInline(words(el));
  return { kind: "booking", heading: "", text: "", label, url: bookingPage(href) };
}
