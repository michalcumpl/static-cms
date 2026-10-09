import { escapeInline, isSafeHref } from "@webmio/model";
import type { Cheerio } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { resolve } from "./addresses.js";

// Imported texts in the builder's inline syntax (site-import design decision 3): bold, italic
// and links kept, everything else as escaped plain text.

/**
 * Where a link goes in the new site: `page:<slug>` for an imported page, the address for
 * another site (or an email or phone), or undefined to keep only the words (a page of the old
 * site that wasn't imported, which goes away with it).
 */
export type LinkTarget = (url: URL) => string | undefined;

export interface InlineContext {
  base: URL;
  link: LinkTarget;
}

const isElement = (node: AnyNode): node is Element => node.type === "tag";
const BOLD = new Set(["strong", "b"]);
const ITALIC = new Set(["em", "i"]);

/** Plain words: the inline syntax's markup characters escaped, white space collapsed. */
function words(node: AnyNode): string {
  if (node.type === "text") return escapeInline((node as unknown as { data: string }).data);
  if (!isElement(node)) return "";
  if (node.name === "br") return " ";
  return node.children.map(words).join("");
}

function inline(node: AnyNode, ctx: InlineContext): string {
  if (!isElement(node)) return words(node);
  const name = node.name.toLowerCase();
  if (name === "br") return " ";
  // One level of marks: the builder doesn't nest them.
  if (BOLD.has(name) || ITALIC.has(name)) {
    const raw = node.children.map(words).join("");
    const inner = clean(raw);
    if (!inner) return raw;
    const marker = BOLD.has(name) ? "**" : "*";
    // The marks hold the words; spaces at their edges stay outside them.
    const lead = /^\s/.test(raw) ? " " : "";
    const trail = /\s$/.test(raw) ? " " : "";
    return `${lead}${marker}${inner}${marker}${trail}`;
  }
  if (name === "a") {
    const label = clean(node.children.map(words).join(""));
    const url = resolve(node.attribs.href, ctx.base);
    const target = url ? ctx.link(url) : undefined;
    if (!label) return "";
    if (!target) return label;
    return `[${label}](${target.startsWith("page:") ? target : escapeInline(target)})`;
  }
  return node.children.map((child) => inline(child, ctx)).join("");
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** An element's text in the inline syntax, on one line. */
export function inlineText(el: Cheerio<AnyNode>, ctx: InlineContext): string {
  return clean(
    el
      .toArray()
      .map((node) => inline(node, ctx))
      .join(""),
  );
}

/** An element's words only, escaped for the inline syntax. */
export function plainText(el: Cheerio<AnyNode>): string {
  return clean(el.toArray().map(words).join(""));
}

/** The default link target: other sites, emails and phones kept when safe; old pages dropped. */
export function externalTarget(base: URL): LinkTarget {
  return (url) => {
    if (url.protocol === "mailto:" || url.protocol === "tel:") {
      return isSafeHref(url.href) ? url.href : undefined;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (url.hostname.replace(/^www\./, "") === base.hostname.replace(/^www\./, "")) {
      return undefined;
    }
    return isSafeHref(url.href) ? url.href : undefined;
  };
}
