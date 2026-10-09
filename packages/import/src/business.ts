import {
  BUSINESS_TYPES,
  type BusinessType,
  type HoursInput,
  type LocationInput,
  WEEKDAYS,
} from "@webmio/model";
import { load } from "cheerio";
import { resolve } from "./addresses.js";
import { collapse } from "./content.js";
import { candidateList } from "./images.js";
import { profile } from "./links.js";

// The business and its main location (site-import spec, "Business details"; design decision 6):
// structured data first, then `tel:` and `mailto:` links, then the pages' address elements.

export interface BusinessDetails {
  name: string;
  type: BusinessType;
  location: LocationInput;
  /** Social profile addresses. */
  social: string[];
  /** Addresses of the logo named in structured data, best first. */
  logo: string[];
  /** An email was on the site but hidden by an anti-spam script, and none other was found. */
  hiddenEmail: boolean;
}

type Json = Record<string, unknown>;

const DAYS: Record<string, (typeof WEEKDAYS)[number]> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
  mo: "mon",
  tu: "tue",
  we: "wed",
  th: "thu",
  fr: "fri",
  sa: "sat",
  su: "sun",
};
/** Types that aren't a business, when structured data holds several things. */
const NOT_BUSINESS = new Set([
  "website",
  "webpage",
  "breadcrumblist",
  "person",
  "article",
  "imageobject",
  "searchaction",
  "sitenavigationelement",
  "faqpage",
  "question",
  "answer",
  "postaladdress",
  "openinghoursspecification",
]);

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];
const text = (value: unknown): string =>
  typeof value === "string" ? collapse(value) : typeof value === "number" ? String(value) : "";
const typesOf = (node: Json) =>
  asArray(node["@type"]).map((t) => String(t).replace(/^https?:\/\/schema\.org\//, ""));

/** Every object in a page's JSON-LD, `@graph` and nested lists flattened. */
export function jsonLdNodes(html: string): Json[] {
  const $ = load(html);
  const out: Json[] = [];
  const visit = (value: unknown) => {
    for (const item of asArray(value)) {
      if (!item || typeof item !== "object") continue;
      const node = item as Json;
      out.push(node);
      if (node["@graph"]) visit(node["@graph"]);
    }
  };
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {
      // Broken structured data adds nothing.
    }
  });
  return out;
}

/** The structured-data node describing the business, if any. */
function businessNode(nodes: Json[]): Json | undefined {
  return nodes.find((node) => {
    const types = typesOf(node).map((t) => t.toLowerCase());
    if (types.length === 0 || types.every((t) => NOT_BUSINESS.has(t))) return false;
    return Boolean(
      node.address || node.telephone || node.openingHoursSpecification || node.openingHours,
    );
  });
}

/**
 * A phone in international form without spaces, or "" when it can't be: `+420` added to a
 * nine-digit number on a Czech or Slovak site.
 */
export function internationalPhone(raw: string, lang: string): string {
  let phone = decodeURIComponent(raw.replace(/^tel:/i, "")).replace(/[\s\-./()]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (!phone.startsWith("+") && /^\d{9}$/.test(phone)) {
    if (lang === "cs") phone = `+420${phone}`;
    else if (lang === "sk") phone = `+421${phone}`;
  }
  return /^\+[1-9]\d{6,14}$/.test(phone) ? phone : "";
}

/** An email from a `mailto:` link, percent-encoding decoded, without its query. */
export function mailtoAddress(href: string): string {
  let address = href.replace(/^mailto:/i, "").split("?")[0] ?? "";
  try {
    address = decodeURIComponent(address);
  } catch {
    return "";
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : "";
}

/** Opening hours from `openingHoursSpecification` and `openingHours` ("Mo-Fr 06:00-18:00"). */
export function openingHours(node: Json): HoursInput {
  const hours: HoursInput = {};
  const add = (day: string | undefined, opens: string, closes: string) => {
    const name = day?.toLowerCase().replace(/^https?:\/\/schema\.org\//, "") ?? "";
    const key = (WEEKDAYS as readonly string[]).includes(name)
      ? (name as (typeof WEEKDAYS)[number])
      : DAYS[name];
    const time = (t: string) => /^(\d{1,2}):(\d{2})/.exec(t)?.slice(1, 3).join(":");
    const from = time(opens);
    const to = time(closes);
    if (!key || !from || !to) return;
    hours[key] = [...(hours[key] ?? []), [from, to]];
  };
  for (const spec of asArray(node.openingHoursSpecification)) {
    if (!spec || typeof spec !== "object") continue;
    const s = spec as Json;
    for (const day of asArray(s.dayOfWeek)) add(String(day), text(s.opens), text(s.closes));
  }
  for (const line of asArray(node.openingHours).map(String)) {
    const match = /^([A-Za-z]{2})(?:-([A-Za-z]{2}))?\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(
      line.trim(),
    );
    if (!match) continue;
    const from = WEEKDAYS.indexOf(
      DAYS[(match[1] ?? "").toLowerCase()] as (typeof WEEKDAYS)[number],
    );
    const to = match[2]
      ? WEEKDAYS.indexOf(DAYS[match[2].toLowerCase()] as (typeof WEEKDAYS)[number])
      : from;
    if (from < 0 || to < from) continue;
    for (let d = from; d <= to; d++) add(WEEKDAYS[d], match[3] ?? "", match[4] ?? "");
  }
  return hours;
}

/** The business details from the site's pages, home page first. */
export function readBusiness(
  pages: readonly { url: string; html: string }[],
  lang: string,
  social: readonly string[],
): BusinessDetails {
  const location: LocationInput = {};
  const nodes = pages.flatMap((p) => jsonLdNodes(p.html));
  const node = businessNode(nodes) ?? {};
  const type =
    typesOf(node).find((t): t is BusinessType =>
      (BUSINESS_TYPES as readonly string[]).includes(t),
    ) ?? "LocalBusiness";
  const name =
    text(node.name) || text(nodes.find((n) => typesOf(n).includes("Organization"))?.name);

  const phone = internationalPhone(text(node.telephone), lang);
  if (phone) location.phone = phone;
  const email = mailtoAddress(`mailto:${text(node.email).replace(/^mailto:/i, "")}`);
  if (email) location.email = email;
  const address = (asArray(node.address)[0] ?? {}) as Json;
  if (typeof address === "object") {
    if (text(address.streetAddress)) location.street = text(address.streetAddress);
    if (text(address.addressLocality)) location.city = text(address.addressLocality);
    if (text(address.postalCode)) location.postal_code = text(address.postalCode);
    const country =
      text(address.addressCountry) || text((address.addressCountry as Json | undefined)?.name);
    if (/^[A-Z]{2}$/i.test(country)) location.country = country.toUpperCase();
  }
  const hours = openingHours(node);
  if (Object.keys(hours).length > 0) location.hours = hours;

  let hiddenEmail = false;
  for (const page of pages) {
    const $ = load(page.html);
    if (!location.phone) {
      const tel = $("a[href^='tel:'], a[href^='TEL:']").first().attr("href");
      const found = tel ? internationalPhone(tel, lang) : "";
      if (found) location.phone = found;
    }
    if (!location.email) {
      const mailto = $("a[href^='mailto:'], a[href^='MAILTO:']")
        .toArray()
        .map((a) => mailtoAddress($(a).attr("href") ?? ""))
        .find(Boolean);
      if (mailto) location.email = mailto;
    }
    if (
      $(".__cf_email__, [data-cfemail], a[href*='/cdn-cgi/l/email-protection']").length ||
      /\[email(?:&#160;|\s| )protected\]/i.test(page.html)
    ) {
      hiddenEmail = true;
    }
    if (!location.street) {
      const address = $("address").first().clone();
      address.find("br").replaceWith("\n");
      const lines = address.text().split(/\n|,/).map(collapse).filter(Boolean);
      const postal = lines.findIndex((l) => /^\d{3}\s?\d{2}\s+\S/.test(l));
      if (postal >= 0) {
        const [, code, city] = /^(\d{3}\s?\d{2})\s+(.+)$/.exec(lines[postal] ?? "") ?? [];
        if (code && city) {
          location.postal_code = code;
          location.city = city;
          const street = lines
            .slice(0, postal)
            .reverse()
            .find((l) => /\d/.test(l));
          if (street) location.street = street;
        }
      }
    }
  }

  const profiles = new Set<string>(social);
  for (const url of asArray(node.sameAs).map(String)) {
    const parsed = resolve(url, "https://example.invalid/");
    const found = parsed ? profile(parsed) : undefined;
    if (found) profiles.add(found);
  }
  const logo = (() => {
    const value = node.logo ?? nodes.find((n) => n.logo)?.logo;
    const url = typeof value === "string" ? value : text((value as Json | undefined)?.url);
    const base = pages[0]?.url ?? "https://example.invalid/";
    return url ? candidateList([url], new URL(base)) : [];
  })();
  return {
    name,
    type,
    location,
    social: [...profiles],
    logo,
    hiddenEmail: hiddenEmail && !location.email,
  };
}
