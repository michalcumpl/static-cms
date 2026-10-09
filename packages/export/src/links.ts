// The publish's own links, checked before anything is uploaded (safe-publishing design.md
// decision 2): every reference into the website must lead to one of its files. References to
// other websites are returned for the publish to ask about, as warnings.
import type { SiteFiles } from "./export.js";

/** A reference into the website that leads to no file of the publish. */
export interface BrokenLink {
  /** The page, stylesheet or `_redirects` that refers to it, as an address (`/kontakt/`). */
  page: string;
  /** The address as written. */
  address: string;
}

/** A link to another website, from a page. */
export interface OutsideLink {
  page: string;
  url: string;
}

export interface LinkCheck {
  broken: BrokenLink[];
  outside: OutsideLink[];
}

/** Addresses that lead nowhere to check: anchors, email, phone, inline data, scripts. */
const IGNORED = /^(#|mailto:|tel:|sms:|data:|javascript:|blob:)/i;
const ATTRIBUTE = /\s(href|src|poster)="([^"]*)"/g;
const SRCSET = /\ssrcset="([^"]*)"/g;
/** `content` of `<meta>` tags holding an address (share images, `og:url`). */
const CONTENT = /\scontent="(https?:\/\/[^"]*)"/g;
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/g;

/** The few entities the renderer writes inside attribute values. */
function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** A file's address as visitors see it: `kontakt/index.html` → `/kontakt/`. */
export function addressOf(path: string): string {
  if (path === "index.html") return "/";
  if (path.endsWith("/index.html")) return `/${path.slice(0, -"index.html".length)}`;
  return `/${path}`;
}

/** The references a page makes, as written. */
function pageReferences(html: string): { value: string; outsideAllowed: boolean }[] {
  const found: { value: string; outsideAllowed: boolean }[] = [];
  for (const match of html.matchAll(ATTRIBUTE)) {
    // Only links (`href`) to other websites are checked as outside links; images and scripts
    // from elsewhere would be the renderer's doing, and are left alone.
    found.push({ value: decodeEntities(match[2] as string), outsideAllowed: match[1] === "href" });
  }
  for (const match of html.matchAll(SRCSET)) {
    for (const candidate of decodeEntities(match[1] as string).split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) found.push({ value: url, outsideAllowed: false });
    }
  }
  for (const match of html.matchAll(CONTENT)) {
    found.push({ value: decodeEntities(match[1] as string), outsideAllowed: false });
  }
  return found;
}

function stylesheetReferences(css: string): string[] {
  const found: string[] = [];
  for (const match of css.matchAll(CSS_URL)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) found.push(value);
  }
  return found;
}

/** `_redirects` targets: `<from> <to> [status]` per line. */
function redirectTargets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields.length >= 2 && !fields[0]?.startsWith("#"))
    .map((fields) => fields[1] as string);
}

/**
 * Checks every reference in the publish's pages, stylesheets and redirects. References into the
 * website (root-relative, relative, or the site's own address written in full) must lead to a
 * file: an address ending in `/` to that folder's `index.html`. Links to other websites are
 * returned, once per page and address.
 */
export function checkSiteLinks(files: SiteFiles, options: { siteUrl?: string } = {}): LinkCheck {
  const site = new URL(options.siteUrl || "https://site.invalid/");
  const prefix = site.pathname.endsWith("/") ? site.pathname : `${site.pathname}/`;
  const decoder = new TextDecoder();
  const broken: BrokenLink[] = [];
  const outside: OutsideLink[] = [];
  const seenBroken = new Set<string>();
  const seenOutside = new Set<string>();

  /** The file a reference leads to, or undefined when it leads outside the website. */
  function fileOf(value: string, from: URL): string | null | undefined {
    let url: URL;
    try {
      url = new URL(value, from);
    } catch {
      return null;
    }
    if (url.origin !== site.origin || !url.pathname.startsWith(prefix)) return undefined;
    let path: string;
    try {
      path = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
      return null;
    }
    return path === "" || path.endsWith("/") ? `${path}index.html` : path;
  }

  function check(page: string, value: string, from: URL, outsideAllowed: boolean) {
    if (value === "" || IGNORED.test(value)) return;
    const file = fileOf(value, from);
    if (file === undefined) {
      const key = `${page} ${value}`;
      if (outsideAllowed && /^https?:/i.test(value) && !seenOutside.has(key)) {
        seenOutside.add(key);
        outside.push({ page, url: value });
      }
      return;
    }
    if (file !== null && files.has(file)) return;
    const key = `${page} ${value}`;
    if (seenBroken.has(key)) return;
    seenBroken.add(key);
    broken.push({ page, address: value });
  }

  for (const [path, bytes] of files) {
    const page = addressOf(path);
    const from = new URL(path, new URL(prefix, site));
    if (path.endsWith(".html")) {
      for (const { value, outsideAllowed } of pageReferences(decoder.decode(bytes))) {
        check(page, value, from, outsideAllowed);
      }
    } else if (path.endsWith(".css")) {
      for (const value of stylesheetReferences(decoder.decode(bytes))) {
        check(page, value, from, false);
      }
    } else if (path === "_redirects") {
      for (const value of redirectTargets(decoder.decode(bytes))) {
        check(page, value, new URL(prefix, site), false);
      }
    }
  }
  return { broken, outside };
}
