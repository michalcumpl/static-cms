import type { Cheerio } from "cheerio";
import type { Element } from "domhandler";
import { resolve } from "./addresses.js";

// The images a site shows, and where to fetch each (site-import spec, "Images"; design decision 7).

/** The widest image worth fetching. */
export const MAX_WIDTH = 1600;

export type ImageRole = "content" | "logo" | "favicon";

/** An image of the source site, before it is fetched. */
export interface ImageReference {
  /** The first candidate's address: the same image anywhere on the site has one reference. */
  id: string;
  /** Addresses to try, best first. */
  candidates: string[];
  alt: string;
  role: ImageRole;
  /** The old paths of the pages showing it, in the order they were met; a retry re-places it there. */
  pages: string[];
}

/** The entries of a `srcset`: address and width (or density × 1000 for `x` descriptors). */
export function srcsetEntries(srcset: string): { url: string; width: number }[] {
  // As the HTML standard reads it: an address up to white space (trailing commas end it without
  // a descriptor), then a descriptor up to the next comma.
  const entries: { url: string; width: number }[] = [];
  let rest = srcset;
  while (true) {
    rest = rest.replace(/^[\s,]+/, "");
    if (!rest) break;
    const urlMatch = /^\S+/.exec(rest);
    let url = urlMatch?.[0] ?? "";
    rest = rest.slice(url.length);
    let descriptor = "";
    if (/,+$/.test(url)) {
      url = url.replace(/,+$/, "");
    } else {
      const end = rest.indexOf(",");
      descriptor = (end < 0 ? rest : rest.slice(0, end)).trim();
      rest = end < 0 ? "" : rest.slice(end + 1);
    }
    if (!url) continue;
    const width = descriptor.endsWith("w")
      ? Number.parseFloat(descriptor)
      : descriptor.endsWith("x")
        ? Number.parseFloat(descriptor) * 1000
        : 0;
    entries.push({ url, width });
  }
  return entries;
}

/**
 * Larger versions an address may have: WordPress-style size suffixes removed (`-532x328.jpg`),
 * width parameters raised to the widest worth fetching. The address itself is not included.
 */
export function largerVersions(url: URL): URL[] {
  const out: URL[] = [];
  const unsized = url.pathname.replace(/-\d{2,4}x\d{2,4}(\.[a-z0-9]{3,4})$/i, "$1");
  if (unsized !== url.pathname) {
    const copy = new URL(url.href);
    copy.pathname = unsized;
    out.push(copy);
  }
  for (const param of ["w", "width"]) {
    const value = Number(url.searchParams.get(param));
    if (value > 0 && value < MAX_WIDTH) {
      const copy = new URL(url.href);
      copy.searchParams.set(param, String(MAX_WIDTH));
      out.push(copy);
    }
  }
  return out;
}

const LAZY = ["data-src", "data-lazy-src", "data-original", "data-lazy"];
const LAZY_SETS = ["data-srcset", "data-lazy-srcset"];

/** Where to fetch an `<img>` (or `<source>`), best first, resolved against the page. */
export function imageCandidates(img: Cheerio<Element>, base: URL): string[] {
  const sets = [img.attr("srcset"), ...LAZY_SETS.map((a) => img.attr(a))]
    .filter((s): s is string => Boolean(s?.trim()))
    .flatMap(srcsetEntries);
  const fitting = sets
    .filter((e) => e.width > 0 && e.width <= MAX_WIDTH)
    .sort((a, b) => b.width - a.width);
  const larger = sets.filter((e) => e.width > MAX_WIDTH).sort((a, b) => a.width - b.width);
  const plain = [
    ...LAZY.map((a) => img.attr(a)),
    img.attr("src"),
    ...sets.filter((e) => e.width === 0).map((e) => e.url),
  ];
  return candidateList([...fitting.map((e) => e.url), ...plain, ...larger.map((e) => e.url)], base);
}

/** Addresses resolved, `data:` and empty ones dropped, each with its larger versions first. */
export function candidateList(addresses: (string | undefined)[], base: URL): string[] {
  const out: string[] = [];
  for (const address of addresses) {
    if (!address || address.trim().startsWith("data:")) continue;
    const url = resolve(address, base);
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) continue;
    for (const candidate of [...largerVersions(url), url]) {
      if (!out.includes(candidate.href)) out.push(candidate.href);
    }
  }
  return out;
}

/** The site's images, one reference per image, kept in the order they were met. */
export class ImageCollector {
  readonly references = new Map<string, ImageReference>();

  /** Adds an image (or finds it again) and returns its reference ID; undefined without an address. */
  add(
    candidates: string[],
    alt: string,
    role: ImageRole = "content",
    page?: string,
  ): string | undefined {
    const [first] = candidates;
    if (!first) return undefined;
    // The same image under another address it was seen with.
    const known = [...this.references.values()].find((r) =>
      candidates.some((c) => r.candidates.includes(c)),
    );
    if (known) {
      if (!known.alt && alt) known.alt = alt;
      if (role !== "content") known.role = role;
      if (page && !known.pages.includes(page)) known.pages.push(page);
      return known.id;
    }
    this.references.set(first, { id: first, candidates, alt, role, pages: page ? [page] : [] });
    return first;
  }
}
