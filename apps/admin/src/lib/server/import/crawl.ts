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
  | { ok: true; pages: SourcePage[]; leftOut: LeftOut[] }
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

export async function crawl(address: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? MAX_PAGES;
  const start = new URL(address);
  const robots = await safeFetch(new URL("/robots.txt", start).href, "text", options);
  const allowed = robotsRules(robots.ok ? decodeText(robots.body, robots.contentType) : undefined);
  const pathOf = (url: URL) => `${url.pathname}${url.search}`;
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
  for (const entry of nav.menu) {
    for (const link of "items" in entry ? entry.items : [entry]) enqueue(link.url.href);
  }
  const sitemaps = [new URL("/sitemap.xml", homeUrl).href];
  for (let i = 0; i < sitemaps.length && i <= MAX_SITEMAPS; i++) {
    const result = await safeFetch(sitemaps[i] ?? "", "text", options);
    if (!result.ok) continue;
    const listed = sitemapLinks(decodeText(result.body, result.contentType));
    for (const page of listed.pages) enqueue(page);
    for (const sitemap of listed.sitemaps) if (!sitemaps.includes(sitemap)) sitemaps.push(sitemap);
  }

  const total = () => Math.min(maxPages, pages.length + queue.length);
  options.onProgress?.(pages.length, total());
  while (queue.length > 0 && pages.length < maxPages) {
    const batch = queue.splice(0, Math.min(PARALLEL, maxPages - pages.length));
    const results = await Promise.all(
      batch.map((url) => (allowed(pathOf(url)) ? safeFetch(url.href, "page", options) : undefined)),
    );
    batch.forEach((url, i) => {
      const result = results[i];
      const page = pathOf(url);
      if (!result) leftOut.push({ reason: "disallowed", page });
      else if (!result.ok) {
        leftOut.push({
          reason: "unreachable",
          page,
          detail: result.status ? String(result.status) : result.reason,
        });
      } else if (!isHtml(result)) leftOut.push({ reason: "not-html", page });
      else {
        const final = new URL(result.url);
        const html = decodeText(result.body, result.contentType);
        // Redirected off the site, or to a page already read.
        if (!sameSite(final, homeUrl) || pages.some((p) => pageKey(p.url) === pageKey(final)))
          return;
        // Only the home page's language is imported (site-import spec, "Language").
        const lang = pageLanguage(html);
        if (homeLang && lang && lang !== homeLang) {
          leftOut.push({ reason: "language", page, detail: final.href });
        } else if (looksBuiltByScript(html)) leftOut.push({ reason: "script-built", page });
        else pages.push({ url: final, html });
      }
    });
    options.onProgress?.(pages.length, total());
  }
  if (queue.length > 0) leftOut.push({ reason: "over-limit", detail: String(queue.length) });

  // Each page's stylesheets, each fetched once, and its own style elements.
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
  return { ok: true, pages: withCss, leftOut };
}
