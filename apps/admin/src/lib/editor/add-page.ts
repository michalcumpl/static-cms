import type { Layout, Localized } from "@webmio/templates";
import { siteTemplate } from "./template";

// The Add page dialog's starting points (site-editing "Adding pages"): "Blank page", then the
// layouts of the site's template.

/** A text in a language: Czech for `cs`, English for any other. */
export const inLanguage = (text: Localized, lang: string) =>
  lang.split("-")[0]?.toLowerCase() === "cs" ? text.cs : text.en;

/** The layouts the site's template offers, in its order. */
export function pageLayouts(document: unknown): readonly Layout[] {
  return siteTemplate(document).layouts;
}

/**
 * The title after choosing `chosen`: its name in the site's language while the title is empty or
 * still the name of the layout chosen before; the owner's own title otherwise. Choosing "Blank
 * page" (no layout) keeps the title.
 */
export function titleAfterChoosing(
  title: string,
  previous: Layout | undefined,
  chosen: Layout | undefined,
  siteLang: string,
): string {
  if (!chosen) return title;
  const untouched =
    title.trim() === "" ||
    (previous !== undefined && title === inLanguage(previous.name, siteLang));
  return untouched ? inLanguage(chosen.name, siteLang) : title;
}
