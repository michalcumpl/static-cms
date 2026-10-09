// Addresses of the source site: which are the same page, and which belong to the site
// (site-import spec, "Pages read").

/** The host without a leading `www.`, lowercase: a site and its `www.` twin are one site. */
export function siteHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

/** Whether `url` is on the same site as `base` (its host or its `www.` twin, http or https). */
export function sameSite(url: URL, base: URL): boolean {
  return (
    (url.protocol === "http:" || url.protocol === "https:") && siteHost(url) === siteHost(base)
  );
}

/** An address resolved against a base, or undefined when it isn't a valid address. */
export function resolve(href: string | undefined, base: URL | string): URL | undefined {
  if (href === undefined) return undefined;
  const trimmed = href.trim();
  if (trimmed === "") return undefined;
  try {
    return new URL(trimmed, base);
  } catch {
    return undefined;
  }
}

/**
 * The key two addresses of one page share: the site's host, the path without a trailing slash,
 * `index.html` or `index.php`, and the query; never the fragment.
 */
export function pageKey(url: URL): string {
  const path = url.pathname
    .replace(/\/index\.(html?|php)$/i, "/")
    .replace(/\/+$/, "")
    .toLowerCase();
  return `${siteHost(url)}${path || "/"}${url.search}`;
}

/** The address to fetch for a page: without its fragment. */
export function withoutFragment(url: URL): URL {
  const copy = new URL(url.href);
  copy.hash = "";
  return copy;
}

/** The path (and query) a page had on the old site, for redirects: `/kontakt.html`. */
export function oldPath(url: URL): string {
  return `${url.pathname}${url.search}`;
}
