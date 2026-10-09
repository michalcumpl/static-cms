import {
  type LeftOut,
  looksBuiltByScript,
  menuLinks,
  pageKey,
  pageLanguage,
  pageStyles,
  robotsRules,
  type SourcePage,
  sameSite,
  sitemapLinks,
  withoutFragment,
} from "@webmio/import";
import { type FetchResult, type SafeFetchOptions, safeFetch } from "./safe-fetch";

// Reading a site's pages (site-import spec, "Pages read"; design decision 5): robots.txt, the
// home page, the menu's pages, then the sitemap's, until there are 20, with their stylesheets.

export const MAX_PAGES = 20;
/** Stylesheets fetched for the whole site, at most. */
const MAX_STYLESHEETS = 20;
/** Pages fetched at a time. */
const PARALLEL = 2;
/** Sitemaps of a sitemap index read, at most. */
const MAX_SITEMAPS = 5;

export interface CrawlOptions extends SafeFetchOptions {
  maxPages?: number;
  onProgress?: (done: number, total: number) => void;
}

/** Why the whole import can't go on. */
export type CrawlFailure = "blocked" | "unreachable" | "not-html" | "disallowed" | "script-built";

export type CrawlResult =
  | {
      ok: true;
      pages: SourcePage[];
      leftOut: LeftOut[];
      /** Addresses of the pages that didn't answer, for a retry (import-review-actions). */
      unreachable: string[];
      /** Addresses of the pages over the limit, in the order they would have been read. */
      queue: string[];
      /** Addresses the home page's menu linked. */
      menu: string[];
    }
  | { ok: false; failure: CrawlFailure; status?: number };

/** A response's text, in the charset its header or `<meta>` names, UTF-8 otherwise. */
export function decodeText(body: Uint8Array, contentType: string): string {
  const declared =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(
      new TextDecoder("latin1").decode(body.slice(0, 2048)),
    )?.[1];
  try {
    return new TextDecoder(declared ?? "utf-8").decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

const isHtml = (result: Extract<FetchResult, { ok: true }>) =>
  /text\/html|application\/xhtml/.test(result.contentType) ||
  (result.contentType === "" && /^\s*</.test(new TextDecoder().decode(result.body.slice(0, 64))));

function failureOf(result: Extract<FetchResult, { ok: false }>): CrawlFailure {
  return result.reason === "blocked" ? "blocked" : "unreachable";
}

const pathOf = (url: URL) => `${url.pathname}${url.search}`;

/** What reading pages needs to know about the site. */
export interface SiteRules {
  homeUrl: URL;
  /** The home page's language: pages in another aren't imported. */
  homeLang: string;
  /** Whether robots.txt allows a path. */
  allowed: (path: string) => boolean;
}

export type PageFetch =
  | { ok: true; url: URL; html: string }
  /** Not imported: why, unless it was redirected off the site (said nowhere). */
  | { ok: false; address: string; leftOut?: LeftOut };

/**
 * Fetches a page of the site with the import's checks: robots.txt, an answer, HTML, the home
 * page's language, not built by a script, and not redirected off the site.
 */
export async function fetchPage(
  url: URL,
  site: SiteRules,
  options: SafeFetchOptions = {},
): Promise<PageFetch> {
  const page = pathOf(url);
  const left = (leftOut: LeftOut): PageFetch => ({ ok: false, address: url.href, leftOut });
  if (!site.allowed(page)) return left({ reason: "disallowed", page });
  const result = await safeFetch(url.href, "page", options);
  if (!result.ok) {
    return left({
      reason: "unreachable",
      page,
      detail: result.status ? String(result.status) : result.reason,
    });
  }
  if (!isHtml(result)) return left({ reason: "not-html", page });
  const final = new URL(result.url);
  const html = decodeText(result.body, result.contentType);
  if (!sameSite(final, site.homeUrl))
    return left({ reason: "unreachable", page, detail: "redirect" });
  // Only the home page's language is imported (site-import spec, "Language").
  const lang = pageLanguage(html);
  if (site.homeLang && lang && lang !== site.homeLang) {
    return left({ reason: "language", page, detail: final.href });
  }
  if (looksBuiltByScript(html)) return left({ reason: "script-built", page });
  return { ok: true, url: final, html };
}

/** Each page with its stylesheets, each fetched once, and its own style elements. */
export async function withStyles(
  pages: readonly { url: URL; html: string }[],
  options: SafeFetchOptions = {},
): Promise<SourcePage[]> {
  const stylesheets = new Map<string, string>();
  const withCss: SourcePage[] = [];
  for (const page of pages) {
    const { linked, inline } = pageStyles(page.html, page.url);
    const css: string[] = [];
    for (const url of linked) {
      if (!stylesheets.has(url) && stylesheets.size < MAX_STYLESHEETS) {
        const result = await safeFetch(url, "text", options);
        stylesheets.set(url, result.ok ? decodeText(result.body, result.contentType) : "");
      }
      css.push(stylesheets.get(url) ?? "");
    }
    withCss.push({ url: page.url.href, html: page.html, css: [...css, ...inline].filter(Boolean) });
  }
  return withCss;
}

/** The site's robots.txt rules. */
export async function siteRobots(
  homeUrl: URL,
  options: SafeFetchOptions = {},
): Promise<(path: string) => boolean> {
  const robots = await safeFetch(new URL("/robots.txt", homeUrl).href, "text", options);
  return robotsRules(robots.ok ? decodeText(robots.body, robots.contentType) : undefined);
}

export async function crawl(address: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? MAX_PAGES;
  const start = new URL(address);
  const allowed = await siteRobots(start, options);
  if (!allowed(pathOf(start))) return { ok: false, failure: "disallowed" };

  const homeResult = await safeFetch(start.href, "page", options);
  if (!homeResult.ok)
    return { ok: false, failure: failureOf(homeResult), status: homeResult.status };
  if (!isHtml(homeResult)) return { ok: false, failure: "not-html" };
  const homeUrl = new URL(homeResult.url);
  const homeHtml = decodeText(homeResult.body, homeResult.contentType);
  const homeLang = pageLanguage(homeHtml);
  if (looksBuiltByScript(homeHtml)) return { ok: false, failure: "script-built" };

  const leftOut: LeftOut[] = [];
  const unreachable: string[] = [];
  const pages: { url: URL; html: string }[] = [{ url: homeUrl, html: homeHtml }];
  const seen = new Set([pageKey(start), pageKey(homeUrl)]);

  // The menu's pages, then the sitemap's.
  const queue: URL[] = [];
  const enqueue = (href: string) => {
    let url: URL;
    try {
      url = withoutFragment(new URL(href, homeUrl));
    } catch {
      return;
    }
    if (!sameSite(url, homeUrl) || seen.has(pageKey(url))) return;
    seen.add(pageKey(url));
    queue.push(url);
  };
  const nav = menuLinks(homeHtml, homeUrl);
  const menu: string[] = [];
  for (const entry of nav.menu) {
    for (const link of "items" in entry ? entry.items : [entry]) {
      enqueue(link.url.href);
      if (sameSite(link.url, homeUrl) && !menu.includes(link.url.href)) menu.push(link.url.href);
    }
  }
  const sitemaps = [new URL("/sitemap.xml", homeUrl).href];
  for (let i = 0; i < sitemaps.length && i <= MAX_SITEMAPS; i++) {
    const result = await safeFetch(sitemaps[i] ?? "", "text", options);
    if (!result.ok) continue;
    const listed = sitemapLinks(decodeText(result.body, result.contentType));
    for (const page of listed.pages) enqueue(page);
    for (const sitemap of listed.sitemaps) if (!sitemaps.includes(sitemap)) sitemaps.push(sitemap);
  }

  const site = { homeUrl, homeLang, allowed };
  const total = () => Math.min(maxPages, pages.length + queue.length);
  options.onProgress?.(pages.length, total());
  while (queue.length > 0 && pages.length < maxPages) {
    const batch = queue.splice(0, Math.min(PARALLEL, maxPages - pages.length));
    const results = await Promise.all(batch.map((url) => fetchPage(url, site, options)));
    for (const result of results) {
      if (!result.ok) {
        if (result.leftOut) leftOut.push(result.leftOut);
        if (result.leftOut?.reason === "unreachable") unreachable.push(result.address);
      } else if (!pages.some((p) => pageKey(p.url) === pageKey(result.url))) {
        // Not redirected to a page already read.
        pages.push(result);
      }
    }
    options.onProgress?.(pages.length, total());
  }
  if (queue.length > 0) leftOut.push({ reason: "over-limit", detail: String(queue.length) });
  const withCss = await withStyles(pages, options);
  return {
    ok: true,
    pages: withCss,
    leftOut,
    unreachable,
    queue: queue.map((url) => url.href),
    menu,
  };
}
