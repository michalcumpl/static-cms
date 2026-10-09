import {
  CONTRAST_PAIRS,
  contrastRatio,
  FONT_IDS,
  FONTS,
  type FontDef,
  type FontId,
  MIN_CONTRAST,
  THEME_PRESETS,
  type ThemeColor,
  type ThemeInput,
} from "@webmio/model";
import { type CssDeclaration, cssDeclarations } from "./css.js";

// A design guessed from the source's styles (site-import spec, "Guessed design"; design decision
// 6): its main colours and fonts mapped to the catalogue, adjusted until the contrast checks pass.

type Colors = Record<ThemeColor, string>;

const NAMED: Record<string, string> = { white: "#ffffff", black: "#000000" };
const SYSTEM_SANS = [
  "helvetica",
  "helvetica neue",
  "arial",
  "system-ui",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "roboto",
  "verdana",
  "tahoma",
  "sans-serif",
];
const SYSTEM_SERIF = ["georgia", "times", "times new roman", "serif"];

/** A CSS colour as `#rrggbb`, or undefined (transparent and unknown forms included). */
export function hexColor(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  let m = /^#([0-9a-f]{3,4})$/.exec(v);
  if (m) return `#${[...(m[1] ?? "").slice(0, 3)].map((c) => c + c).join("")}`;
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
  if (m) return m[2] === "00" ? undefined : `#${m[1]}`;
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(v);
  if (m) {
    if (m[4] !== undefined && Number.parseFloat(m[4]) === 0) return undefined;
    return `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("")}`;
  }
  return undefined;
}

/** The colours in a declaration's value. */
function colorsIn(value: string): string[] {
  return (value.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/gi) ?? []).flatMap(
    (c) => hexColor(c) ?? [],
  );
}

function hsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return `#${[f(0), f(8), f(4)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

const saturated = (hex: string) => {
  const [, s, l] = hsl(hex);
  return s > 0.25 && l > 0.1 && l < 0.9;
};
const light = (hex: string) => hsl(hex)[2] > 0.5;

const matches = (selector: string, pattern: RegExp) =>
  selector.split(",").some((s) => pattern.test(s.trim()));
const PAGE = /^(html|body|:root)$/i;
const LINK = /(^|[\s>+~])a$/i;
const BUTTON = /(button|\.btn|\[class\*?=["']?(btn|button)|\.button|\.cta)/i;
const HEADINGS = /(^|[\s>+~])h[1-3]\b/i;

/** The colours a list has at least twice. */
function repeatedColors(colors: string[]): string[] {
  return colors.filter((c, i) => colors.indexOf(c) !== i);
}

/** The most frequent colour of a list, or undefined. */
function mostFrequent(colors: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const c of colors) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** The catalogue font for a CSS font-family list. */
export function catalogFontFor(families: string): FontId {
  const names = families
    .split(",")
    .map((f) =>
      f
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase(),
    )
    .filter(Boolean);
  const byName = (name: string) =>
    FONT_IDS.find((id) => {
      const font = FONTS[id] as FontDef;
      return font.family?.toLowerCase() === name || font.name.toLowerCase() === name;
    });
  for (const name of names) {
    const found = byName(name);
    if (found) return found;
  }
  const first = names[0] ?? "";
  if (SYSTEM_SANS.includes(first)) return "system-sans";
  if (SYSTEM_SERIF.includes(first)) return "georgia";
  return names.includes("serif") ? "source-serif" : "source-sans";
}

/** Darkens (or, on a dark background, lightens) a colour until it passes on `bg`. */
function readableOn(fg: string, bg: string): string {
  const [h, s, l0] = hsl(fg);
  const darker = light(bg);
  let l = l0;
  let color = fg;
  for (let step = 0; step < 40 && contrastRatio(color, bg) < MIN_CONTRAST; step++) {
    l = Math.max(0, Math.min(1, l + (darker ? -0.025 : 0.025)));
    color = fromHsl(h, s, l);
  }
  return color;
}

/** Adjusts the foreground colours until every contrast pair passes. */
export function withContrast(colors: Colors): Colors {
  const out = { ...colors };
  for (let round = 0; round < 3; round++) {
    for (const pair of CONTRAST_PAIRS) {
      if (contrastRatio(out[pair.fg], out[pair.bg]) < MIN_CONTRAST) {
        out[pair.fg] = readableOn(out[pair.fg], out[pair.bg]);
      }
    }
  }
  return out;
}

/** The theme for a site from its stylesheets (and `style` elements), home page first. */
export function guessTheme(stylesheets: readonly string[]): ThemeInput {
  const declarations: CssDeclaration[] = stylesheets.flatMap(cssDeclarations);
  const preset = THEME_PRESETS[0];
  const background = declarations
    .filter(
      (d) =>
        matches(d.selector, PAGE) &&
        (d.property === "background" || d.property === "background-color"),
    )
    .flatMap((d) => colorsIn(d.value))[0];
  const text = declarations
    .filter((d) => matches(d.selector, PAGE) && d.property === "color")
    .flatMap((d) => colorsIn(d.value))[0];
  const accents = declarations
    .filter(
      (d) =>
        (matches(d.selector, LINK) && d.property === "color") ||
        (matches(d.selector, BUTTON) &&
          (d.property === "background" || d.property === "background-color")),
    )
    .flatMap((d) => colorsIn(d.value))
    .filter(saturated);
  const allBackgrounds = declarations
    .filter(
      (d) =>
        !matches(d.selector, PAGE) &&
        (d.property === "background" || d.property === "background-color"),
    )
    .flatMap((d) => colorsIn(d.value));
  // Without a link or button colour, a colour the stylesheets use repeatedly, not a pale tint: a
  // one-off colour is a widget's or a state's (a yellow highlight), not the brand's.
  const repeated = repeatedColors(
    declarations.flatMap((d) => colorsIn(d.value)).filter((c) => saturated(c) && hsl(c)[2] <= 0.75),
  );
  const bg = background ?? preset?.color_background ?? "#ffffff";
  const ink = text ?? (light(bg) ? "#222222" : "#f5f5f5");
  // A site with no colour of its own stays without one: its text colour leads.
  const primary = mostFrequent(accents) ?? mostFrequent(repeated) ?? ink;
  const secondary = mostFrequent(
    allBackgrounds.filter((c) => c !== bg && c !== primary && light(c) === light(bg)),
  );

  const colors = withContrast({
    color_background: bg,
    color_text: ink,
    color_primary: primary,
    color_secondary: secondary ?? (light(bg) ? (preset?.color_secondary ?? "#f2f2f2") : "#2a2a2a"),
  });

  const family = (pattern: RegExp) =>
    declarations.find((d) => matches(d.selector, pattern) && d.property === "font-family")?.value;
  const body = family(PAGE);
  const heading = family(HEADINGS) ?? body;
  return {
    ...colors,
    ...(body ? { font_body: catalogFontFor(body) } : {}),
    ...(heading ? { font_heading: catalogFontFor(heading) } : {}),
  };
}
