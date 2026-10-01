import type { FontId } from "./fonts.js";

// Ready-made looks (theme-and-branding design.md decision 4). Each passes every theme check,
// contrast included; a test holds them to it.

/** The theme values a preset sets. The content width is left as it is. */
export interface ThemePreset {
  name: string;
  color_primary: string;
  color_secondary: string;
  color_background: string;
  color_text: string;
  font_heading: FontId;
  font_body: FontId;
  radius: string;
}

/** The first preset holds the values new projects start with. */
export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    name: "Harbour",
    color_primary: "#1f5a8a",
    color_secondary: "#e8eef4",
    color_background: "#ffffff",
    color_text: "#1a1a1a",
    font_heading: "georgia",
    font_body: "system-sans",
    radius: "0.5rem",
  },
  {
    name: "Bakery",
    color_primary: "#8a3b12",
    color_secondary: "#f6ead8",
    color_background: "#fffaf3",
    color_text: "#2b1d14",
    font_heading: "lora",
    font_body: "work-sans",
    radius: "0.5rem",
  },
  {
    name: "Garden",
    color_primary: "#2f5d3a",
    color_secondary: "#e4efe1",
    color_background: "#fbfdf9",
    color_text: "#1c2a1f",
    font_heading: "source-serif",
    font_body: "source-sans",
    radius: "0.5rem",
  },
  {
    name: "Studio",
    color_primary: "#111111",
    color_secondary: "#ececec",
    color_background: "#fafafa",
    color_text: "#1f1f1f",
    font_heading: "inter",
    font_body: "inter",
    radius: "0",
  },
  {
    name: "Clinic",
    color_primary: "#0b6470",
    color_secondary: "#e3f2f4",
    color_background: "#ffffff",
    color_text: "#17313a",
    font_heading: "nunito",
    font_body: "nunito",
    radius: "1rem",
  },
];

/** The properties of a theme node a preset sets. */
export const PRESET_PROPERTIES = [
  "color_primary",
  "color_secondary",
  "color_background",
  "color_text",
  "font_heading",
  "font_body",
  "radius",
] as const satisfies readonly (keyof ThemePreset)[];

export type ThemeColor = "color_primary" | "color_secondary" | "color_background" | "color_text";

/**
 * The colour pairs the stylesheet puts text on (theming spec, "Theme colour contrast"), each of
 * which needs at least `MIN_CONTRAST`. The foreground comes first: a problem leads to the colour
 * owners most likely want to change.
 */
export const CONTRAST_PAIRS: readonly { name: string; fg: ThemeColor; bg: ThemeColor }[] = [
  { name: "Text on background", fg: "color_text", bg: "color_background" },
  { name: "Links and buttons", fg: "color_primary", bg: "color_background" },
  { name: "Text on panels", fg: "color_text", bg: "color_secondary" },
  { name: "Links and buttons on panels", fg: "color_primary", bg: "color_secondary" },
];

/** WCAG AA for body text. */
export const MIN_CONTRAST = 4.5;

/** WCAG 2.x contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function luminance(hex: string): number {
  const h = hex.slice(1);
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
