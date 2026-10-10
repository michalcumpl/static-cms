import { socialKind, videoEmbed } from "@webmio/model";
import { type Cheerio, type CheerioAPI, load } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { pageKey, resolve, sameSite, withoutFragment } from "./addresses.js";
import { collapse } from "./content.js";

// The site's navigation and sitemap (site-import spec, "Pages read" and "Pages and menu").

export interface MenuLink {
  label: string;
  url: URL;
}

/** A link of the menu, or links under a label (one level, as menu groups are). */
export type MenuEntry = MenuLink | { label: string; items: MenuLink[] };

export interface Navigation {
  /** The site's own pages, in menu order. */
  menu: MenuEntry[];
  /** Links to profiles the site document recognises (Facebook, Instagram…). */
  social: string[];
  /** Links to the site in other languages (a language switcher, `hreflang` alternates). */
  languages: LanguageLink[];
}

/** A link to another language version of a page. */
export interface LanguageLink {
  url: string;
  /** Its `hreflang`'s primary subtag (`en`), or `""` without one. */
  lang: string;
}

/** An `hreflang`'s primary subtag, lowercased: `en-GB` → `en`. */
const hreflangOf = (el: Cheerio<Element>) =>
  (el.attr("hreflang") ?? "").split(/[-_]/)[0]?.trim().toLowerCase() ?? "";

/** Whether an element sits in a language switcher. */
const inLanguageSwitcher = (el: Cheerio<Element>) =>
  el.attr("hreflang") !== undefined ||
  el.parents().is("[class*=lang], [id*=lang], [class*=Lang], [id*=Lang]");

/** A social profile's address, or undefined for anything else (a video, another site). */
export function profile(url: URL): string | undefined {
  if (!socialKind(url.href).kind || videoEmbed(url.href)) return undefined;
  const copy = withoutFragment(url);
  copy.search = "";
  return copy.href.replace(/\/$/, "");
}

/** The element holding the main navigation: the one with the most of the site's own links. */
function navigationOf($: CheerioAPI, base: URL): Cheerio<AnyNode> | undefined {
  const candidates = [
    ...$("nav, [role=navigation]").toArray(),
    ...$(
      "header ul, [class*=header] ul, [class*=menu] > ul, [id*=menu] > ul, ul[class*=menu], ul[id*=menu], [class*=nav] > ul, [id*=nav] > ul",
    ).toArray(),
    // Menus that are plain links in the header or a menu container, without a list.
    ...$("header, [class*=menu]:not(ul), [id*=menu]:not(ul)").toArray(),
  ];
  let best: { el: Cheerio<AnyNode>; score: number } | undefined;
  for (const node of candidates) {
    const el = $(node);
    const own = el
      .find("a[href]")
      .toArray()
      .filter((a) => {
        const href = $(a).attr("href") ?? "";
        const url = resolve(href, base);
        return !href.startsWith("#") && url !== undefined && sameSite(url, base);
      }).length;
    // A navigation in the header beats one elsewhere with as many links.
    const score = own * 2 + (el.closest("header").length ? 1 : 0);
    if (own > 0 && (!best || score > best.score)) best = { el, score };
  }
  return best?.el;
}

/** The site's menu, its social profiles and other languages, from a page's HTML. */
export function menuLinks(html: string, baseUrl: URL | string): Navigation {
  const base = new URL(baseUrl);
  const $ = load(html);
  const social = new Set<string>();
  // One link per language version, by address; the first naming its language wins.
  const languages = new Map<string, LanguageLink>();
  const addLanguage = (url: URL, el: Cheerio<Element>) => {
    const key = pageKey(url);
    const known = languages.get(key);
    if (!known) languages.set(key, { url: withoutFragment(url).href, lang: hreflangOf(el) });
    else if (!known.lang) known.lang = hreflangOf(el);
  };
  const seen = new Set<string>();

  /** A link of the site, or undefined after setting aside social and language links. */
  const link = (a: Cheerio<Element>): MenuLink | undefined => {
    const href = a.attr("href") ?? "";
    if (href.startsWith("#")) return undefined;
    const url = resolve(href, base);
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return undefined;
    if (!sameSite(url, base)) {
      const found = profile(url);
      if (found) social.add(found);
      return undefined;
    }
    // Another language version of this site.
    if (inLanguageSwitcher(a)) {
      addLanguage(url, a);
      return undefined;
    }
    const key = pageKey(url);
    if (seen.has(key)) return undefined;
    seen.add(key);
    const label = collapse(a.text()) || collapse(a.find("img").attr("alt") ?? "");
    return label ? { label, url: withoutFragment(url) } : undefined;
  };

  const menu: MenuEntry[] = [];
  const nav = navigationOf($, base);
  const list = nav?.is("ul") ? nav : nav?.find("ul").first();
  if (nav && list?.length) {
    for (const li of list.children("li").toArray()) {
      const item = $(li);
      const nested = item.find("ul").first();
      const own = item.clone();
      own.find("ul").remove();
      if (nested.length) {
        const items = nested
          .find("a[href]")
          .toArray()
          .flatMap((a) => link($(a)) ?? []);
        const label = collapse(own.text());
        if (items.length > 0 && label) menu.push({ label, items });
      } else {
        const a = own.find("a[href]").first();
        const entry = a.length ? link(a as Cheerio<Element>) : undefined;
        if (entry) menu.push(entry);
      }
    }
  } else if (nav) {
    for (const a of nav.find("a[href]").toArray()) {
      const entry = link($(a));
      if (entry) menu.push(entry);
    }
  }
  // Language versions and profiles anywhere on the page.
  for (const a of $("a[href], link[rel=alternate][hreflang]").toArray()) {
    const el = $(a);
    const url = resolve(el.attr("href"), base);
    if (!url) continue;
    if (!sameSite(url, base)) {
      const found = el.is("a") ? profile(url) : undefined;
      if (found) social.add(found);
    } else if (el.attr("hreflang") !== undefined || (el.is("a") && inLanguageSwitcher(el))) {
      addLanguage(url, el as Cheerio<Element>);
    }
  }
  return { menu, social: [...social], languages: [...languages.values()] };
}

/** A page's stylesheets: the addresses of its linked ones, and the text of its `<style>` elements. */
export function pageStyles(
  html: string,
  baseUrl: URL | string,
): { linked: string[]; inline: string[] } {
  const $ = load(html);
  const linked = $('link[rel~="stylesheet"]')
    .toArray()
    .flatMap((el) => resolve($(el).attr("href"), baseUrl)?.href ?? []);
  const inline = $("style")
    .toArray()
    .map((el) => $(el).text());
  return { linked, inline };
}

/** The pages and further sitemaps a `sitemap.xml` (or sitemap index) lists. */
export function sitemapLinks(xml: string): { pages: string[]; sitemaps: string[] } {
  const $ = load(xml, { xml: true });
  const texts = (selector: string) =>
    $(selector)
      .toArray()
      .map((el) => $(el).text().trim())
      .filter((t) => t !== "");
  return { pages: texts("url > loc"), sitemaps: texts("sitemap > loc") };
}
