import type { NodeOfType } from "./schema/index.js";

// The fonts a theme can use (theme-and-branding design.md decisions 1–3). Data only: the
// bytes come from the caller, so rendering stays the same in Node and the browser.

export type FontKind = "sans" | "serif";
export type FontSubset = "latin" | "latin-ext";
export type FontStyle = "normal" | "italic";

export interface FontDef {
  /** Shown to owners. */
  name: string;
  kind: FontKind;
  /** The CSS family of a webfont; undefined for a system font. */
  family?: string;
  /** Used before the webfont loads, and alone by a system font. */
  fallback: string;
  /** The `@fontsource-variable/*` package a webfont's files come from. */
  package?: string;
}

const SANS_FALLBACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";

/** Every font a theme can use, by ID. IDs are never removed once documents use them. */
export const FONTS = {
  inter: {
    name: "Inter",
    kind: "sans",
    family: "Inter",
    fallback: SANS_FALLBACK,
    package: "inter",
  },
  "work-sans": {
    name: "Work Sans",
    kind: "sans",
    family: "Work Sans",
    fallback: SANS_FALLBACK,
    package: "work-sans",
  },
  "source-sans": {
    name: "Source Sans 3",
    kind: "sans",
    family: "Source Sans 3",
    fallback: SANS_FALLBACK,
    package: "source-sans-3",
  },
  nunito: {
    name: "Nunito",
    kind: "sans",
    family: "Nunito",
    fallback: SANS_FALLBACK,
    package: "nunito",
  },
  lora: { name: "Lora", kind: "serif", family: "Lora", fallback: SERIF_FALLBACK, package: "lora" },
  "source-serif": {
    name: "Source Serif 4",
    kind: "serif",
    family: "Source Serif 4",
    fallback: SERIF_FALLBACK,
    package: "source-serif-4",
  },
  merriweather: {
    name: "Merriweather",
    kind: "serif",
    family: "Merriweather",
    fallback: SERIF_FALLBACK,
    package: "merriweather",
  },
  playfair: {
    name: "Playfair Display",
    kind: "serif",
    family: "Playfair Display",
    fallback: SERIF_FALLBACK,
    package: "playfair-display",
  },
  "system-sans": { name: "System font", kind: "sans", fallback: SANS_FALLBACK },
  georgia: { name: "Georgia", kind: "serif", fallback: SERIF_FALLBACK },
} as const satisfies Record<string, FontDef>;

export type FontId = keyof typeof FONTS;

export const FONT_IDS = Object.keys(FONTS) as FontId[];

export function isFontId(value: unknown): value is FontId {
  return typeof value === "string" && Object.hasOwn(FONTS, value);
}

export const FONT_SUBSETS = ["latin", "latin-ext"] as const;

/** The characters in each subset's file, as every catalog package (5.3.0) declares them. */
export const UNICODE_RANGES: Record<FontSubset, string> = {
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  "latin-ext":
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
};

/** One WOFF2 file of a webfont. */
export interface FontFile {
  font: FontId;
  subset: FontSubset;
  style: FontStyle;
  /** The published name: `<font id>-<subset>-<style>.woff2`. */
  name: string;
  /** The path inside the npm scope, e.g. `lora/files/lora-latin-wght-normal.woff2`. */
  packagePath: string;
}

export function fontFile(font: FontId, subset: FontSubset, style: FontStyle): FontFile {
  const pkg = (FONTS[font] as FontDef).package;
  return {
    font,
    subset,
    style,
    name: `${font}-${subset}-${style}.woff2`,
    packagePath: `${pkg}/files/${pkg}-${subset}-wght-${style}.woff2`,
  };
}

/** The published name of a webfont's licence text. */
export const fontLicenceFile = (font: FontId) => `${font}-OFL.txt`;

/**
 * Where a published font file or licence comes from, inside the `@fontsource-variable` npm
 * scope; undefined for names that aren't one.
 */
export function fontPackagePath(name: string): string | undefined {
  for (const id of FONT_IDS) {
    const pkg = (FONTS[id] as FontDef).package;
    if (!pkg) continue;
    if (name === fontLicenceFile(id)) return `${pkg}/LICENSE`;
    for (const subset of FONT_SUBSETS) {
      for (const style of ["normal", "italic"] as const) {
        const file = fontFile(id, subset, style);
        if (file.name === name) return file.packagePath;
      }
    }
  }
  return undefined;
}

/** The CSS `font-family` value for a font: its family, then its fallback. */
export function fontStack(id: FontId): string {
  const font: FontDef = FONTS[id];
  return font.family ? `"${font.family}", ${font.fallback}` : font.fallback;
}

const isWebfont = (id: FontId) => (FONTS[id] as FontDef).package !== undefined;

type ThemeFonts = Pick<NodeOfType<"theme">, "font_heading" | "font_body">;

/**
 * The WOFF2 files a theme needs: upright and italic for the body font, upright for the heading
 * font, each once. Unknown IDs and system fonts need none. In subset, then style order.
 */
export function themeFontFiles(theme: ThemeFonts): FontFile[] {
  const wanted = new Map<string, FontFile>();
  const add = (font: unknown, styles: readonly FontStyle[]) => {
    if (!isFontId(font) || !isWebfont(font)) return;
    for (const subset of FONT_SUBSETS) {
      for (const style of styles) {
        const file = fontFile(font, subset, style);
        wanted.set(file.name, file);
      }
    }
  };
  add(theme.font_body, ["normal", "italic"]);
  add(theme.font_heading, ["normal"]);
  return [...wanted.values()];
}

/** The webfonts a theme uses, each once. */
export function themeWebfonts(theme: ThemeFonts): FontId[] {
  return [...new Set(themeFontFiles(theme).map((file) => file.font))];
}

type LooseNode = { [key: string]: unknown };
type LooseDoc = { document_id?: unknown; nodes?: Record<string, LooseNode> };

/**
 * The font files and licences a document's exported site uses, sorted by name. Works on any
 * document, valid or not, as `usedMediaFiles` does.
 */
export function usedFontFiles(doc: unknown): string[] {
  const d = doc as LooseDoc;
  const site = d?.nodes?.[d.document_id as string];
  const theme = site ? d.nodes?.[site.theme as string] : undefined;
  if (!theme) return [];
  const fonts = theme as unknown as ThemeFonts;
  const names = [
    ...themeFontFiles(fonts).map((file) => file.name),
    ...themeWebfonts(fonts).map(fontLicenceFile),
  ];
  return names.sort(compareCodePoints);
}

const compareCodePoints = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
