import {
  type BlockInput,
  blocks,
  escapeInline,
  type ImageInput,
  type SiteDocument,
  siteBuilder,
  slugify,
  uniqueSlug,
} from "@webmio/model";
import { STANDARD } from "@webmio/templates";
import { load } from "cheerio";
import { oldPath, pageKey, resolve, sameSite, withoutFragment } from "./addresses.js";
import { readPage, type Segment } from "./blocks.js";
import { readBusiness } from "./business.js";
import { collapse, contentArea } from "./content.js";
import { backgroundRules } from "./css.js";
import { candidateList, ImageCollector, type ImageReference } from "./images.js";
import { type MenuEntry, menuLinks } from "./links.js";
import type { ImportReport, LeftOut } from "./report.js";
import { externalTarget } from "./text.js";
import { guessTheme } from "./theme.js";

// A whole site from its fetched pages (site-import design decisions 1, 3 and 6).

/** A page as the crawler fetched it: its address, HTML, and the CSS it uses (linked and inline). */
export interface SourcePage {
  url: string;
  html: string;
  css: readonly string[];
}

export interface ReadSiteOptions {
  /** The languages the admin offers (`LANGUAGES` of `@webmio/render`). */
  languages: readonly string[];
  /** The language when the source's isn't offered: the owner's interface language. */
  fallbackLanguage: string;
  /**
   * The fetched images: reference ID to the file name the documents name. Without it nothing is
   * fetched yet: the site is read for its image references only.
   */
  images?: ReadonlyMap<string, string>;
  /** What the crawl left out, for the report. */
  leftOut?: readonly LeftOut[];
}

export interface ImportedSite {
  name: string;
  lang: string;
  document: SiteDocument;
  /** Every image the site shows, logo and favicon included, to fetch. */
  images: ImageReference[];
  /** Each page's path on the old site, by its page ID. */
  origins: { pageId: string; path: string }[];
  report: ImportReport;
}

/** The source's language when offered, else the fallback (site-import spec, "Language"). */
export function siteLanguage(html: string, languages: readonly string[], fallback: string): string {
  const lang = pageLanguage(html);
  return languages.includes(lang) ? lang : fallback;
}

/** A page's language as its `lang` attribute's primary subtag (`cs`), or `""` without one. */
export function pageLanguage(html: string): string {
  return (load(html)("html").attr("lang") ?? "").split(/[-_]/)[0]?.toLowerCase() ?? "";
}

/** The site's name: its business name, `og:site_name`, or the home `<title>` without a tagline. */
function siteName(home: string, businessName: string): string {
  if (businessName) return businessName;
  const $ = load(home);
  const og = collapse($('meta[property="og:site_name"]').attr("content") ?? "");
  if (og) return og;
  return collapse($("title").text()).split(/\s+[|–—-]\s+/)[0] ?? "";
}

/** A page's title: its `<h1>`, or its `<title>` without the site's name. */
export function pageTitle(h1: string, html: string, name: string): string {
  if (h1) return h1;
  const parts = collapse(load(html)("title").text())
    .split(/\s+[|–—-]\s+/)
    .filter((p) => p !== name);
  return parts[0] ?? "";
}

/** A slug from an address's last segment, without its extension; `""` for the root. */
export function slugFromPath(url: URL): string {
  const last = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return slugify(decodeURIComponent(last).replace(/\.(html?|php|aspx?)$/i, ""));
}

const czech = (lang: string) => lang === "cs";

export function readSite(pages: readonly SourcePage[], options: ReadSiteOptions): ImportedSite {
  const home = pages[0];
  if (!home) throw new Error("No pages to read.");
  const homeUrl = new URL(home.url);
  const lang = siteLanguage(home.html, options.languages, options.fallbackLanguage);
  const nav = menuLinks(home.html, homeUrl);
  const leftOut: LeftOut[] = [...(options.leftOut ?? [])];
  // Other language versions; the one imported (the home page, or `/<lang>/`) isn't one.
  for (const language of nav.languages) {
    const url = resolve(language, homeUrl);
    const first = url?.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    const known = leftOut.some((l) => l.reason === "language" && l.detail === url?.href);
    if (url && pageKey(url) !== pageKey(homeUrl) && first !== lang && !known) {
      leftOut.push({ reason: "language", detail: url.href });
    }
  }

  // Pages: home first, then the menu's pages in its order, then the others.
  const byKey = new Map(pages.map((p) => [pageKey(new URL(p.url)), p]));
  const ordered: SourcePage[] = [home];
  const menuPages = (entries: MenuEntry[]) =>
    entries
      .flatMap((e) => ("items" in e ? e.items : [e]))
      .flatMap((l) => byKey.get(pageKey(l.url)) ?? []);
  for (const page of [...menuPages(nav.menu), ...pages])
    if (!ordered.includes(page)) ordered.push(page);

  const business = readBusiness(ordered, lang, nav.social);
  const name = siteName(home.html, business.name);
  const homeName = czech(lang) ? STANDARD.layouts[0]?.name.cs : STANDARD.layouts[0]?.name.en;
  const metaDescription = collapse(
    load(home.html)('meta[name="description"]').attr("content") ?? "",
  );
  // Without one, the home page's first paragraph describes the site to search engines.
  const description = metaDescription || summary(home.html);

  // Slugs first, so texts can link to the new pages.
  const taken: string[] = [];
  const slugs = new Map<SourcePage, string>();
  const titles = new Map<SourcePage, string>();
  const images = new ImageCollector();
  for (const page of ordered) {
    const h1 = collapse(load(page.html)("h1").first().text());
    const title = page === home ? (homeName ?? "Home") : pageTitle(h1, page.html, name) || name;
    titles.set(page, title);
    const slug = uniqueSlug(
      (page === home ? "" : slugFromPath(new URL(page.url))) || slugify(title) || "stranka",
      taken,
    );
    taken.push(slug);
    slugs.set(page, slug);
  }
  // The pages' content, links to imported pages going to their new slugs.
  const final = new Map(
    ordered.map((page) => {
      const url = new URL(page.url);
      const content = readPage(page.html, {
        ctx: {
          base: url,
          link: (target) => {
            const linked = byKey.get(pageKey(target));
            if (linked && sameSite(target, homeUrl)) return `page:${slugs.get(linked)}`;
            return externalTarget(homeUrl)(target);
          },
        },
        images,
        css: page.css,
        hero: page === home,
        page: oldPath(url),
      });
      return [page, content] as const;
    }),
  );

  // The logo and favicon.
  const $home = load(home.html);
  const headerLogo = $home("header a img, [class*=logo] img, img[class*=logo], #logo img").first();
  // Backgrounds of the home page's elements: a logo drawn by CSS, a photo filling a panel.
  const shown = home.css.flatMap(backgroundRules).filter((rule) => {
    // States and generated content (`:hover`, `::before`) don't show the image.
    if (/:/.test(rule.selector)) return false;
    try {
      return $home(rule.selector).length > 0;
    } catch {
      return false;
    }
  });
  // The last matching rule is usually the most specific (`.pg-index .logo` after `.logo`).
  const cssLogo = shown.filter((rule) => /logo/i.test(rule.selector)).at(-1)?.url;
  const logoCandidates = business.logo.length
    ? business.logo
    : candidateList([headerLogo.attr("src") ?? cssLogo], homeUrl);
  const logoRef = images.add(logoCandidates, name, "logo", oldPath(homeUrl));
  // A photo filling a panel of the home page (a painting beside the text), for the hero when
  // the content has none.
  const backdrop = shown.find((rule) => rule.cover && !/logo/i.test(rule.selector))?.url;
  const backdropRef =
    backdrop && !final.get(home)?.heroImage
      ? images.add(candidateList([backdrop], homeUrl), "", "content", oldPath(homeUrl))
      : undefined;
  const iconHref =
    $home('link[rel~="apple-touch-icon"]').attr("href") ??
    $home('link[rel~="icon"]')
      .toArray()
      .map((el) => $home(el).attr("href") ?? "")
      .find((href) => /\.(png|svg)(\?|$)/i.test(href));
  const faviconRef = images.add(
    candidateList([iconHref], homeUrl),
    "",
    "favicon",
    oldPath(homeUrl),
  );

  const fetched = options.images;
  const file = (ref: string | undefined) => (ref && fetched ? fetched.get(ref) : undefined);
  const image = (ref: string | undefined, alt: string): ImageInput | undefined => {
    const src = file(ref);
    return src ? { src, alt } : undefined;
  };

  const site = siteBuilder({ name, lang, description });
  // Each stylesheet once: pages sharing one would make its one-off colours look repeated.
  site.theme(guessTheme([...new Set(ordered.flatMap((p) => p.css))]));
  site.business({ name, type: business.type, social: business.social });
  site.location(business.location);
  const logo = image(logoRef, name);
  if (logo) site.logo(logo);
  const favicon = image(faviconRef, "");
  if (favicon) site.favicon({ src: favicon.src, decorative: true });

  let questions = 0;
  const pageBlocks = (page: SourcePage): BlockInput[] => {
    const content = final.get(page);
    const out: BlockInput[] = [];
    if (page === home) {
      out.push(
        blocks.hero({
          heading: escapeInline(name),
          text: escapeInline(metaDescription),
          image: content?.heroImage
            ? image(content.heroImage.ref, content.heroImage.alt)
            : image(backdropRef, ""),
          layout: STANDARD.looks.hero,
        }),
      );
    }
    for (const segment of content?.segments ?? []) {
      out.push(
        ...segmentBlocks(segment, image, (q) => {
          questions++;
          return site.faq(q);
        }),
      );
    }
    return out;
  };
  // Pages in order; the menu's links and groups as the source's navigation had them.
  const pageIds = new Map<SourcePage, string>();
  const add = (page: SourcePage, menu?: string) => {
    if (pageIds.has(page)) return;
    pageIds.set(
      page,
      site.page(
        { title: titles.get(page) ?? "", slug: slugs.get(page) ?? "", home: page === home, menu },
        pageBlocks(page),
      ),
    );
  };
  add(
    home,
    nav.menu.some((e) => !("items" in e) && byKey.get(pageKey(e.url)) === home)
      ? homeMenuLabel(nav.menu, byKey, home)
      : undefined,
  );
  for (const entry of nav.menu) {
    if ("items" in entry) {
      const members = entry.items.flatMap((l) => {
        const page = byKey.get(pageKey(l.url));
        return page && !pageIds.has(page) ? [{ page, label: l.label }] : [];
      });
      if (members.length === 0) continue;
      site.menuGroup(
        escapeInline(entry.label),
        members.map((m) => slugs.get(m.page) ?? ""),
      );
      for (const m of members) add(m.page, escapeInline(m.label));
    } else {
      const page = byKey.get(pageKey(entry.url));
      if (page) add(page, escapeInline(entry.label));
    }
  }
  for (const page of ordered) add(page);

  const document = site.build();
  const origins = ordered.map((page) => ({
    pageId: pageIds.get(page) ?? "",
    path: oldPath(withoutFragment(new URL(page.url))),
  }));

  // Images that were to be fetched but weren't.
  const references = [...images.references.values()];
  if (fetched) {
    for (const ref of references) {
      if (!fetched.has(ref.id))
        leftOut.push({ reason: "image", detail: ref.candidates[0] ?? ref.id });
    }
  }
  if (business.hiddenEmail) leftOut.push({ reason: "hidden-email" });
  for (const content of final.values()) leftOut.push(...content.leftOut);

  // The same thing left out twice on a page (a newsletter form in two places) is said once.
  const said = new Set<string>();
  const distinct = leftOut.filter((item) => {
    const key = JSON.stringify([item.reason, item.page ?? "", item.detail ?? ""]);
    return !said.has(key) && Boolean(said.add(key));
  });
  leftOut.length = 0;
  leftOut.push(...distinct);

  const report: ImportReport = {
    address: home.url,
    pages: ordered.map((page) => ({
      title: titles.get(page) ?? "",
      oldPath: oldPath(new URL(page.url)),
      slug: page === home ? "" : (slugs.get(page) ?? ""),
    })),
    images: fetched ? new Set(fetched.values()).size : 0,
    questions,
    socialProfiles: business.social.length,
    business: {
      name: Boolean(business.name),
      phone: Boolean(business.location.phone),
      email: Boolean(business.location.email),
      address: Boolean(business.location.street || business.location.city),
      hours: Boolean(business.location.hours),
    },
    leftOut,
  };
  return { name, lang, document, images: references, origins, report };
}

/**
 * A segment of a page's content as blocks: `image` gives an image only when it was fetched, and
 * `faq` adds a question to the FAQ collection and returns its ID.
 */
export function segmentBlocks(
  segment: Segment,
  image: (ref: string | undefined, alt: string) => ImageInput | undefined,
  faq: (question: { question: string; answer: string }) => string,
): BlockInput[] {
  switch (segment.kind) {
    case "text":
      return [blocks.text(segment.source)];
    case "text_with_image": {
      const img = image(segment.image.ref, segment.image.alt);
      if (!img) {
        const heading = segment.heading ? `## ${segment.heading}\n\n` : "";
        return [blocks.text(`${heading}${segment.body}`)];
      }
      return [
        blocks.textWithImage({
          heading: segment.heading,
          body: segment.body,
          image: img,
          side: segment.side,
        }),
      ];
    }
    case "gallery": {
      const items = segment.items.flatMap((i) => {
        const img = image(i.image.ref, i.image.alt);
        return img ? [{ image: img, caption: i.caption }] : [];
      });
      if (items.length === 0) return headingOnly(segment.heading);
      return [
        blocks.gallery({ heading: segment.heading, items, imageFit: STANDARD.looks.gallery }),
      ];
    }
    case "logos": {
      const items = segment.items.flatMap((i) => {
        const img = image(i.image.ref, i.image.alt || i.name);
        return img ? [{ image: img, name: escapeInline(i.name), url: i.url }] : [];
      });
      if (items.length === 0) return headingOnly(segment.heading);
      return [blocks.logos({ heading: segment.heading, items })];
    }
    case "videos":
      return [
        blocks.videos({
          heading: segment.heading,
          items: segment.items.map((v) => ({ url: v.url, title: escapeInline(v.title) })),
        }),
      ];
    case "faq": {
      const ids = segment.items.map((q) => faq({ question: q.question, answer: q.answer }));
      return [blocks.faq(segment.heading, ids)];
    }
  }
}

/** Search engines show about this many characters of a description. */
const DESCRIPTION_LENGTH = 160;

/** The first paragraph of a page's content worth a description, shortened at a word. */
export function summary(html: string): string {
  const $ = load(html);
  const text =
    contentArea($)
      .find("p")
      .toArray()
      .map((p) => collapse($(p).text()))
      .find((t) => t.length >= 40) ?? "";
  if (text.length <= DESCRIPTION_LENGTH) return text;
  const cut = text.slice(0, DESCRIPTION_LENGTH - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).replace(/[\s,;:–-]+$/, "")}…`;
}

/**
 * A block left without its images keeps its heading as a main subheading: the page's smaller
 * subheadings after it need one before them (validation's "heading-skip").
 */
function headingOnly(heading: string): BlockInput[] {
  return heading ? [blocks.text(`## ${heading}`)] : [];
}

function homeMenuLabel(
  menu: MenuEntry[],
  byKey: Map<string, SourcePage>,
  home: SourcePage,
): string {
  const entry = menu.find((e) => !("items" in e) && byKey.get(pageKey(e.url)) === home);
  return entry && !("items" in entry) ? escapeInline(entry.label) : "";
}
