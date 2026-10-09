import { load } from "cheerio";
import { collapse, contentArea } from "./content.js";

/** Less content text than this, with a script loaded, means the page is built in the browser. */
const MIN_TEXT = 200;

/**
 * Whether a page builds its content with JavaScript (site-import spec, "Pages read"): almost no
 * text and no images in its content area while it loads a script. A short page without scripts
 * is just short, and a photo gallery with captions is content.
 */
export function looksBuiltByScript(html: string): boolean {
  const $ = load(html);
  if ($("script[src]").length === 0) return false;
  const content = contentArea($);
  if (content.find("img, picture, video").length > 0) return false;
  return collapse(content.text()).length < MIN_TEXT;
}
