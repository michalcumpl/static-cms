// The business details as the site shows them (business-info design.md decisions 3 and 4):
// contact details, the opening hours table and the footer. Pure functions of the business
// data, shared by the renderer and the editor's canvas so both show the same.
import type { Weekday } from "@webmio/model";
import { type Html, html } from "./html.js";
import type { SiteStrings } from "./strings.js";

export interface TimeRange {
  opens: string;
  closes: string;
}

/** The business details with their days resolved, as rendering uses them. */
export interface BusinessInfo {
  name: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  map_url: string;
  business_type: string;
  hours_note: string;
  show_in_footer: boolean;
  /** Monday first. */
  days: { day: Weekday; ranges: TimeRange[] }[];
  /** The social profiles' addresses, in order. */
  social: string[];
}

type LooseNodes = Record<string, Record<string, unknown> | undefined>;

const ids = (value: unknown): string[] => {
  const nodes = (value as { nodes?: unknown } | undefined)?.nodes;
  return Array.isArray(nodes) ? nodes.filter((id): id is string => typeof id === "string") : [];
};
const str = (value: unknown) => (typeof value === "string" ? value : "");

/** Reads a business node and its days from a document's nodes. Tolerates missing parts. */
export function businessInfo(nodes: LooseNodes, businessId: string): BusinessInfo {
  const node = nodes[businessId] ?? {};
  return {
    name: str(node.name),
    street: str(node.street),
    postal_code: str(node.postal_code),
    city: str(node.city),
    country: str(node.country),
    phone: str(node.phone),
    email: str(node.email),
    map_url: str(node.map_url),
    business_type: str(node.business_type) || "LocalBusiness",
    hours_note: str(node.hours_note),
    show_in_footer: node.show_in_footer !== false,
    days: ids(node.days).flatMap((dayId) => {
      const day = nodes[dayId];
      if (!day) return [];
      const ranges = ids(day.ranges).flatMap((rangeId) => {
        const range = nodes[rangeId];
        return range ? [{ opens: str(range.opens), closes: str(range.closes) }] : [];
      });
      return [{ day: str(day.day) as Weekday, ranges }];
    }),
    social: ids(node.social).flatMap((id) => {
      const url = str(nodes[id]?.url);
      return url === "" ? [] : [url];
    }),
  };
}

/** `+420321123456` as `+420 321 123 456`; numbers of other countries as stored. */
export function formatPhone(phone: string): string {
  const match = /^\+(420|421)(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return match ? `+${match.slice(1).join(" ")}` : phone;
}

/** `06:00` as `6:00`. */
export function formatTime(time: string): string {
  return time.replace(/^0(\d):/, "$1:");
}

function formatRanges(ranges: TimeRange[], strings: SiteStrings): string {
  if (ranges.length === 0) return strings.closed;
  return ranges.map((r) => `${formatTime(r.opens)}–${formatTime(r.closes)}`).join(", ");
}

const sameRanges = (a: TimeRange[], b: TimeRange[]) =>
  a.length === b.length && a.every((r, i) => r.opens === b[i]?.opens && r.closes === b[i]?.closes);

/** Runs of consecutive days with the same ranges, closed days included; Monday first. */
export function groupDays(
  days: BusinessInfo["days"],
): { first: number; last: number; ranges: TimeRange[] }[] {
  const groups: { first: number; last: number; ranges: TimeRange[] }[] = [];
  days.forEach((day, index) => {
    const previous = groups.at(-1);
    if (previous && sameRanges(previous.ranges, day.ranges)) previous.last = index;
    else groups.push({ first: index, last: index, ranges: day.ranges });
  });
  return groups;
}

/** Whether any day is open. */
export const hasOpenDays = (business: BusinessInfo) =>
  business.days.some((day) => day.ranges.length > 0);

const filled = (value: string) => value.trim() !== "";

/** The "Show on map" address: the business's own, or a Google Maps search for its address. */
export function mapLink(business: BusinessInfo): string | undefined {
  if (filled(business.map_url)) return business.map_url;
  if (!filled(business.street) && !filled(business.city)) return undefined;
  const town = [business.postal_code, business.city].filter(filled).join(" ");
  const query = [business.street, town, business.country].filter(filled).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface ContactParts {
  address: boolean;
  phone: boolean;
  email: boolean;
  map: boolean;
}

const ALL_PARTS: ContactParts = { address: true, phone: true, email: true, map: true };

/**
 * The contact details in an `<address>`, each part only when filled in and allowed; nothing
 * when there is nothing to show. `name` is shown first when given (the footer).
 */
export function contactDetails(
  business: BusinessInfo,
  strings: SiteStrings,
  parts: ContactParts = ALL_PARTS,
  name = "",
): Html | false {
  const town = [business.postal_code, business.city].filter(filled).join(" ");
  const lines: Html[] = [];
  if (name !== "") lines.push(html`<p class="business-name">${name}</p>`);
  if (parts.address && (filled(business.street) || filled(town))) {
    const street = filled(business.street) ? business.street : "";
    lines.push(street && town ? html`<p>${street}<br>${town}</p>` : html`<p>${street || town}</p>`);
  }
  if (parts.phone && filled(business.phone)) {
    // Non-breaking spaces keep the number on one line.
    const shown = formatPhone(business.phone).replaceAll(" ", "\u00a0");
    lines.push(html`<p><a href="tel:${business.phone}">${shown}</a></p>`);
  }
  if (parts.email && filled(business.email)) {
    lines.push(html`<p><a href="mailto:${business.email}">${business.email}</a></p>`);
  }
  const map = parts.map ? mapLink(business) : undefined;
  if (map) lines.push(html`<p><a href="${map}">${strings.showOnMap}</a></p>`);
  if (lines.length === (name !== "" ? 1 : 0)) return false;
  return html`<address class="contact-details">${lines.map(
    (line) => html`
  ${line}`,
  )}
</address>`;
}

/** The opening hours table and note; only the note when every day is closed. */
export function openingHoursTable(business: BusinessInfo, strings: SiteStrings): Html | false {
  const note =
    filled(business.hours_note) && html`<p class="hours-note">${business.hours_note}</p>`;
  if (!hasOpenDays(business)) return note;
  const rows = groupDays(business.days).map(({ first, last, ranges }) => {
    const days =
      first === last ? strings.days[first] : `${strings.days[first]}–${strings.days[last]}`;
    return html`
    <tr><th scope="row">${days}</th><td>${formatRanges(ranges, strings)}</td></tr>`;
  });
  return html`<table class="hours">
  <tbody>${rows}
  </tbody>
</table>${
    note &&
    html`
${note}`
  }`;
}
