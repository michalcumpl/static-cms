import type { Document, Session } from "svedit";
import { list } from "./transforms";

// Business details, its locations and their opening hours (business-info design.md decision 7,
// business-locations design decision 7). Each operation is one transaction, so each is one
// undo step; typing into a text field batches into one step.

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const WEEK: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export interface BusinessFields {
  id: string;
  name: string;
  business_type: string;
  show_in_footer: boolean;
  locations: { nodes: string[] };
}

export interface LocationFields {
  id: string;
  name: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  map_url: string;
  hours_note: string;
  days: { nodes: string[] };
}

export interface DayFields {
  id: string;
  day: Weekday;
  ranges: { nodes: string[] };
}

export interface RangeFields {
  id: string;
  opens: string;
  closes: string;
}

/** The text fields of a location that apply as the owner types. */
export type LocationTextField =
  | "name"
  | "street"
  | "postal_code"
  | "city"
  | "country"
  | "email"
  | "map_url"
  | "hours_note";

export function businessOf(doc: Document): BusinessFields | undefined {
  const site = doc.nodes[doc.document_id] as unknown as { business?: string };
  return site.business === undefined
    ? undefined
    : (doc.nodes[site.business] as unknown as BusinessFields | undefined);
}

/** The business's locations, the main one first. */
export function locationsOf(doc: Document): LocationFields[] {
  return (businessOf(doc)?.locations.nodes ?? []).flatMap((id) => {
    const location = doc.nodes[id] as unknown as LocationFields | undefined;
    return location ? [location] : [];
  });
}

export function locationOf(doc: Document, locationId: string): LocationFields | undefined {
  return locationsOf(doc).find((location) => location.id === locationId);
}

/** The opening day node of a weekday of a location. */
export function dayOf(doc: Document, locationId: string, day: Weekday): DayFields | undefined {
  const id = locationOf(doc, locationId)?.days.nodes[WEEK.indexOf(day)];
  return id === undefined ? undefined : (doc.nodes[id] as unknown as DayFields | undefined);
}

/** A day's ranges, in order. */
export function rangesOf(doc: Document, locationId: string, day: Weekday): RangeFields[] {
  return (dayOf(doc, locationId, day)?.ranges.nodes ?? []).flatMap((id) => {
    const range = doc.nodes[id] as unknown as RangeFields | undefined;
    return range ? [range] : [];
  });
}

/** Sets the business's name (the only text field of the business itself). */
export function setBusinessName(session: Session, value: string): void {
  const business = businessOf(session.doc);
  if (!business || business.name === value) return;
  session.apply(session.tr.set([business.id, "name"], value), { batch: true });
}

export function setLocationField(
  session: Session,
  locationId: string,
  field: LocationTextField,
  value: string,
): void {
  const location = locationOf(session.doc, locationId);
  if (!location || location[field] === value) return;
  session.apply(session.tr.set([location.id, field], value), { batch: true });
}

export function setBusinessType(session: Session, type: string): void {
  const business = businessOf(session.doc);
  if (!business || business.business_type === type) return;
  session.apply(session.tr.set([business.id, "business_type"], type));
}

export function setShowInFooter(session: Session, show: boolean): void {
  const business = businessOf(session.doc);
  if (!business || business.show_in_footer === show) return;
  session.apply(session.tr.set([business.id, "show_in_footer"], show));
}

/**
 * Adds an empty location at the end, every day closed, in the main location's country.
 * Returns its ID.
 */
export function addLocation(session: Session): string | undefined {
  const business = businessOf(session.doc);
  if (!business) return undefined;
  const tr = session.tr;
  const days = WEEK.map((day) => {
    const id = tr.generate_id();
    tr.create({ id, type: "opening_day", day, ranges: list() });
    return id;
  });
  const id = tr.generate_id();
  tr.create({
    id,
    type: "location",
    name: "",
    street: "",
    postal_code: "",
    city: "",
    country: locationsOf(session.doc)[0]?.country ?? "CZ",
    phone: "",
    email: "",
    map_url: "",
    hours_note: "",
    days: list(days),
  });
  tr.set([business.id, "locations"], list([...business.locations.nodes, id]));
  session.apply(tr);
  return id;
}

/** The contact and opening hours blocks that chose a location, with their pages' titles. */
export function blocksChoosing(
  doc: Document,
  locationId: string,
): { blockId: string; pageTitle: string }[] {
  const site = doc.nodes[doc.document_id] as unknown as { pages: { nodes: string[] } };
  return site.pages.nodes.flatMap((pageId) => {
    const page = doc.nodes[pageId] as unknown as { title: string; blocks: { nodes: string[] } };
    return (page?.blocks.nodes ?? []).flatMap((blockId) => {
      const block = doc.nodes[blockId] as unknown as { type: string; location_id?: string };
      return (block?.type === "contact" || block?.type === "opening_hours") &&
        block.location_id === locationId
        ? [{ blockId, pageTitle: page.title }]
        : [];
    });
  });
}

/**
 * Removes a location, unless it is the only one; blocks that chose it show all locations
 * again. One undo step brings both back.
 */
export function removeLocation(session: Session, locationId: string): boolean {
  const business = businessOf(session.doc);
  if (!business || business.locations.nodes.length < 2) return false;
  const tr = session.tr;
  for (const { blockId } of blocksChoosing(session.doc, locationId)) {
    tr.set([blockId, "location_id"], "");
  }
  tr.set(
    [business.id, "locations"],
    list(business.locations.nodes.filter((id) => id !== locationId)),
  );
  session.apply(tr);
  return true;
}

/** Moves a location one place up or down; the first is the main location. */
export function moveLocation(session: Session, locationId: string, direction: -1 | 1): void {
  const business = businessOf(session.doc);
  if (!business) return;
  const ids = [...business.locations.nodes];
  const from = ids.indexOf(locationId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to] as string, ids[from] as string];
  session.apply(session.tr.set([business.id, "locations"], list(ids)));
}

const COUNTRY_CODES: Record<string, string> = { CZ: "+420", SK: "+421" };

/**
 * A phone number as typed, in international form when it can be: spaces, dashes, dots and
 * brackets go, a leading `00` becomes `+`, and nine digits without a code get the country's
 * code (Czechia and Slovakia). Anything else is returned as typed, for validation to report.
 */
export function normalizePhone(input: string, country: string): string {
  const typed = input.trim();
  if (typed === "") return "";
  let digits = typed.replace(/[\s\-.()/]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  const code = COUNTRY_CODES[country];
  if (!digits.startsWith("+") && /^\d{9}$/.test(digits) && code) digits = `${code}${digits}`;
  return /^\+[1-9][0-9]{6,14}$/.test(digits) ? digits : typed;
}

/** Sets a location's phone, normalised (applied when the owner leaves the field). Returns it. */
export function setPhone(session: Session, locationId: string, input: string): string {
  const location = locationOf(session.doc, locationId);
  if (!location) return input;
  const phone = normalizePhone(input, location.country);
  if (phone !== location.phone) session.apply(session.tr.set([location.id, "phone"], phone));
  return phone;
}

const toMinutes = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (minutes: number) => {
  const capped = Math.min(minutes, 24 * 60);
  return `${String(Math.floor(capped / 60)).padStart(2, "0")}:${String(capped % 60).padStart(2, "0")}`;
};

/**
 * Adds a range to a day: 08:00–17:00 for a closed day, otherwise one starting an hour after
 * the last range closes and lasting four hours (until midnight at most).
 */
export function addRange(session: Session, locationId: string, day: Weekday): void {
  const node = dayOf(session.doc, locationId, day);
  if (!node) return;
  const last = rangesOf(session.doc, locationId, day).at(-1);
  const opens = last ? toTime(toMinutes(last.closes) + 60) : "08:00";
  const closes = last ? toTime(toMinutes(opens) + 240) : "17:00";
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "time_range", opens, closes });
  tr.set([node.id, "ranges"], list([...node.ranges.nodes, id]));
  session.apply(tr);
}

export function removeRange(
  session: Session,
  locationId: string,
  day: Weekday,
  index: number,
): void {
  const node = dayOf(session.doc, locationId, day);
  if (!node || index < 0 || index >= node.ranges.nodes.length) return;
  session.apply(
    session.tr.set([node.id, "ranges"], list(node.ranges.nodes.filter((_, i) => i !== index))),
  );
}

export function setRangeTime(
  session: Session,
  rangeId: string,
  which: "opens" | "closes",
  time: string,
): void {
  // Time fields can't show 24:00: closing at 00:00 means closing at midnight.
  const value = which === "closes" && time === "00:00" ? "24:00" : time;
  const range = session.doc.nodes[rangeId] as unknown as RangeFields | undefined;
  if (!range || range[which] === value) return;
  session.apply(session.tr.set([rangeId, which], value));
}

/** Gives a location's Tuesday to Friday its Monday's ranges (copies), in one undoable step. */
export function copyMondayToWeekdays(session: Session, locationId: string): void {
  const monday = rangesOf(session.doc, locationId, "mon");
  const tr = session.tr;
  for (const day of ["tue", "wed", "thu", "fri"] as const) {
    const node = dayOf(session.doc, locationId, day);
    if (!node) continue;
    const ids = monday.map((range) => {
      const id = tr.generate_id();
      tr.create({ id, type: "time_range", opens: range.opens, closes: range.closes });
      return id;
    });
    tr.set([node.id, "ranges"], list(ids));
  }
  session.apply(tr);
}

export interface ContactBlock {
  id: string;
  type: "contact";
  show_address: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_map: boolean;
}

/** The contact block the selection is in or on, if any. */
export function selectedContactBlock(session: Session): ContactBlock | undefined {
  const selected = session.selected_node as { type?: string } | null;
  if (selected?.type === "contact") return selected as ContactBlock;
  const path = (session.selection as { path?: (string | number)[] } | null)?.path;
  for (let end = path?.length ?? 0; end > 0; end--) {
    const node = session.get((path as (string | number)[]).slice(0, end)) as { type?: string };
    if (node?.type === "contact") return node as ContactBlock;
  }
  return undefined;
}

/** The contact or opening hours block the selection is in or on, if any. */
export function selectedBusinessBlock(
  session: Session,
): { id: string; type: "contact" | "opening_hours"; location_id: string } | undefined {
  const isBusinessBlock = (node: { type?: string } | null | undefined) =>
    node?.type === "contact" || node?.type === "opening_hours";
  const selected = session.selected_node as { type?: string } | null;
  if (isBusinessBlock(selected)) return selected as never;
  const path = (session.selection as { path?: (string | number)[] } | null)?.path;
  for (let end = path?.length ?? 0; end > 0; end--) {
    const node = session.get((path as (string | number)[]).slice(0, end)) as { type?: string };
    if (isBusinessBlock(node)) return node as never;
  }
  return undefined;
}

/** Sets which location a contact or opening hours block shows: one, or `""` for all. */
export function setBlockLocation(session: Session, blockId: string, locationId: string): void {
  const block = session.doc.nodes[blockId] as unknown as { location_id?: string } | undefined;
  if (!block || block.location_id === locationId) return;
  session.apply(session.tr.set([blockId, "location_id"], locationId));
}

export type ContactSwitch = "show_address" | "show_phone" | "show_email" | "show_map";

export function setContactSwitch(
  session: Session,
  blockId: string,
  which: ContactSwitch,
  on: boolean,
): void {
  const block = session.doc.nodes[blockId] as unknown as ContactBlock | undefined;
  if (!block || block[which] === on) return;
  session.apply(session.tr.set([blockId, which], on));
}

/** The business's social profiles, in order (business-collections, "Social profiles"). */
export function socialProfiles(doc: Document): { id: string; url: string }[] {
  const business = businessOf(doc) as
    | (BusinessFields & { social?: { nodes: string[] } })
    | undefined;
  return (business?.social?.nodes ?? []).flatMap((id) => {
    const node = doc.nodes[id] as unknown as { url?: string } | undefined;
    return node ? [{ id, url: node.url ?? "" }] : [];
  });
}

function setSocialList(session: Session, ids: string[], tr = session.tr): void {
  const business = businessOf(session.doc);
  if (!business) return;
  tr.set([business.id, "social"], list(ids));
  session.apply(tr);
}

/** Adds an empty profile at the end. Returns its ID. */
export function addSocialProfile(session: Session): string {
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "social_link", url: "" });
  setSocialList(session, [...socialProfiles(session.doc).map((p) => p.id), id], tr);
  return id;
}

export function removeSocialProfile(session: Session, id: string): void {
  setSocialList(
    session,
    socialProfiles(session.doc)
      .map((p) => p.id)
      .filter((other) => other !== id),
  );
}

/** Moves a profile one place up or down. */
export function moveSocialProfile(session: Session, id: string, direction: -1 | 1): void {
  const ids = socialProfiles(session.doc).map((p) => p.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to] as string, ids[from] as string];
  setSocialList(session, ids);
}

export function setSocialUrl(session: Session, id: string, url: string): void {
  const tr = session.tr;
  tr.set([id, "url"], url);
  session.apply(tr);
}

/** An address as owners type it, with `https://` added when it has no scheme. */
export function normalizeSocialUrl(input: string): string {
  const url = input.trim();
  if (url === "" || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}
