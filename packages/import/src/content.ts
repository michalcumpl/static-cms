import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

// The part of a page that holds its content (site-import design decision 6): `<main>`, or else
// the body without the header, navigation, footer and everything that isn't shown.

/** Elements that are never content. */
const NOT_CONTENT = [
  "script",
  "style",
  "noscript",
  "template",
  // Inline icons; an SVG logo is read from the header, not from the content.
  "svg",
  "[hidden]",
  "[aria-hidden=true]",
  "[style*='display:none']",
  "[style*='display: none']",
].join(",");

/** Elements around the content: the site's frame. */
const FRAME = [
  "header",
  "nav",
  "footer",
  "aside",
  "[role=navigation]",
  "[role=banner]",
  "[role=contentinfo]",
].join(",");

/**
 * A copy of the page's content area, with what isn't content removed. Forms stay, so the mapping
 * can report them; the caller decides what to do with them.
 */
export function contentArea($: CheerioAPI): Cheerio<AnyNode> {
  const main = $("main").first().length ? $("main").first() : $("[role=main]").first();
  const root = (main.length ? main : $("body").first()).clone();
  root.find(NOT_CONTENT).remove();
  if (!main.length) root.find(FRAME).remove();
  return root;
}

/** Text with its runs of white space made single spaces, trimmed. */
export function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
