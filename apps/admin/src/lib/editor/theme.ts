import { isFontId, PRESET_PROPERTIES, type ThemePreset } from "@static-cms/site";
import type { Document, Session } from "svedit";
import { changeSlotImage, siteSettings, slotImage } from "./site";
import type { ChosenImage } from "./transforms";

// The Theme tab's operations (theme-and-branding design.md decision 7). Each is one transaction,
// so one undo step; typing a hex colour batches into one step.

export type ThemeColor = "color_primary" | "color_secondary" | "color_background" | "color_text";
export type ThemeFont = "font_heading" | "font_body";
export type ThemeLength = "radius" | "content_width";

export interface ThemeSettings {
  id: string;
  color_primary: string;
  color_secondary: string;
  color_background: string;
  color_text: string;
  font_heading: string;
  font_body: string;
  radius: string;
  content_width: string;
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The named corner radii and content widths the tab offers; anything else shows as "Custom". */
export const RADIUS_CHOICES = [
  { label: "Square", value: "0" },
  { label: "Soft", value: "0.5rem" },
  { label: "Round", value: "1rem" },
] as const;

export const WIDTH_CHOICES = [
  { label: "Narrow", value: "56rem" },
  { label: "Standard", value: "64rem" },
  { label: "Wide", value: "76rem" },
] as const;

export const themeSettings = (doc: Document) =>
  doc.nodes[siteSettings(doc).theme] as unknown as ThemeSettings;

function setThemeValue(
  session: Session,
  property: keyof ThemeSettings,
  value: string,
  batch = false,
) {
  const theme = themeSettings(session.doc);
  if (theme[property] === value) return;
  session.apply(session.tr.set([theme.id, property], value), batch ? { batch: true } : undefined);
}

/** Whether a typed value is a complete hex colour, `#rgb` or `#rrggbb`. */
export const isHexColor = (value: string) => HEX_COLOR.test(value.trim());

/**
 * Sets a colour from a typed or picked value. Only a complete hex colour changes the document,
 * lower-cased; an incomplete one changes nothing. Typing batches into one undo step.
 */
export function setThemeColor(session: Session, property: ThemeColor, value: string): void {
  if (!isHexColor(value)) return;
  setThemeValue(session, property, value.trim().toLowerCase(), true);
}

export function setThemeFont(session: Session, property: ThemeFont, font: string): void {
  if (!isFontId(font)) return;
  setThemeValue(session, property, font);
}

export function setThemeLength(session: Session, property: ThemeLength, value: string): void {
  setThemeValue(session, property, value);
}

/** Applies a preset's colours, fonts and radius in one step; the content width stays. */
export function applyPreset(session: Session, preset: ThemePreset): void {
  const theme = themeSettings(session.doc);
  const tr = session.tr;
  let changed = false;
  for (const property of PRESET_PROPERTIES) {
    if (theme[property] === preset[property]) continue;
    tr.set([theme.id, property], preset[property]);
    changed = true;
  }
  if (changed) session.apply(tr);
}

/** Whether the theme's values are exactly a preset's (the content width aside). */
export const isPresetApplied = (theme: ThemeSettings, preset: ThemePreset) =>
  PRESET_PROPERTIES.every((property) => theme[property] === preset[property]);

/**
 * Chooses or removes the site's logo. A first logo comes with the site name shown next to it, in
 * the same step, so the header never loses the name by surprise.
 */
export function setLogo(session: Session, image: ChosenImage | undefined): void {
  const site = siteSettings(session.doc);
  const tr = session.tr;
  const first = image !== undefined && !slotImage(session.doc, site.id, "logo");
  if (!changeSlotImage(session.doc, tr, site.id, "logo", image)) return;
  if (first && !site.header_show_name) tr.set([site.id, "header_show_name"], true);
  session.apply(tr);
}

export function setHeaderShowName(session: Session, shown: boolean): void {
  const site = siteSettings(session.doc);
  if (site.header_show_name === shown) return;
  session.apply(session.tr.set([site.id, "header_show_name"], shown));
}
