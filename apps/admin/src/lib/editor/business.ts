import type { Document, Session } from "svedit";
import { list } from "./transforms";

// Business details and opening hours (business-info design.md decision 7). Each operation is
// one transaction, so each is one undo step; typing into a text field batches into one step.

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const WEEK: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export interface BusinessFields {
  id: string;
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

/** The text fields of the business settings that apply as the owner types. */
export type BusinessTextField =
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

/** The opening day node of a weekday. */
export function dayOf(doc: Document, day: Weekday): DayFields | undefined {
  const business = businessOf(doc);
  const id = business?.days.nodes[WEEK.indexOf(day)];
  return id === undefined ? undefined : (doc.nodes[id] as unknown as DayFields | undefined);
}

/** A day's ranges, in order. */
export function rangesOf(doc: Document, day: Weekday): RangeFields[] {
  return (dayOf(doc, day)?.ranges.nodes ?? []).flatMap((id) => {
    const range = doc.nodes[id] as unknown as RangeFields | undefined;
    return range ? [range] : [];
  });
}

export function setBusinessField(session: Session, field: BusinessTextField, value: string): void {
  const business = businessOf(session.doc);
  if (!business || business[field] === value) return;
  session.apply(session.tr.set([business.id, field], value), { batch: true });
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

/** Sets the phone, normalised (applied when the owner leaves the field). Returns it. */
export function setPhone(session: Session, input: string): string {
  const business = businessOf(session.doc);
  if (!business) return input;
  const phone = normalizePhone(input, business.country);
  if (phone !== business.phone) session.apply(session.tr.set([business.id, "phone"], phone));
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
export function addRange(session: Session, day: Weekday): void {
  const node = dayOf(session.doc, day);
  if (!node) return;
  const last = rangesOf(session.doc, day).at(-1);
  const opens = last ? toTime(toMinutes(last.closes) + 60) : "08:00";
  const closes = last ? toTime(toMinutes(opens) + 240) : "17:00";
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "time_range", opens, closes });
  tr.set([node.id, "ranges"], list([...node.ranges.nodes, id]));
  session.apply(tr);
}

export function removeRange(session: Session, day: Weekday, index: number): void {
  const node = dayOf(session.doc, day);
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

/** Gives Tuesday to Friday Monday's ranges (copies), in one undoable step. */
export function copyMondayToWeekdays(session: Session): void {
  const monday = rangesOf(session.doc, "mon");
  const tr = session.tr;
  for (const day of ["tue", "wed", "thu", "fri"] as const) {
    const node = dayOf(session.doc, day);
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
