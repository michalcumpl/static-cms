import { isFontId, THEME_PRESETS } from "@webmio/model";
import { siteCss } from "@webmio/render";
import { STANDARD, type Template } from "@webmio/templates";

type Theme = Parameters<typeof siteCss>[0];
type ThemeField = Exclude<keyof Theme, "id" | "type">;

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const CSS_LENGTH = /^(0|\d+(\.\d+)?(px|rem|em|%|ch|vw))$/;

/**
 * Whether a theme value is safe to put into the stylesheet: the same rules as validation, field
 * by field. Contrast isn't checked here; owners must see the colours they chose.
 */
const VALID: Record<ThemeField, (value: unknown) => boolean> = {
  color_primary: (v) => typeof v === "string" && HEX_COLOR.test(v),
  color_secondary: (v) => typeof v === "string" && HEX_COLOR.test(v),
  color_background: (v) => typeof v === "string" && HEX_COLOR.test(v),
  color_text: (v) => typeof v === "string" && HEX_COLOR.test(v),
  font_heading: isFontId,
  font_body: isFontId,
  radius: (v) => typeof v === "string" && CSS_LENGTH.test(v),
  content_width: (v) => typeof v === "string" && CSS_LENGTH.test(v),
};
const FIELDS = Object.keys(VALID) as ThemeField[];

/** What the canvas starts from before it has seen a valid value: the first preset's look. */
export const STARTING_THEME: Theme = {
  id: "theme",
  type: "theme",
  ...(THEME_PRESETS[0] as Omit<Theme, "id" | "type" | "content_width">),
  content_width: "64rem",
};

/**
 * The theme the canvas shows (theme-and-branding design.md decision 8): the document's theme,
 * except that a field whose value isn't valid (a half-typed colour) keeps `previous`'s value.
 */
export function canvasTheme(document: unknown, previous: Theme = STARTING_THEME): Theme {
  const doc = document as { document_id: string; nodes: Record<string, Record<string, unknown>> };
  const themeId = doc.nodes[doc.document_id]?.theme as string | undefined;
  const theme = themeId ? doc.nodes[themeId] : undefined;
  const safe: Theme = { ...previous };
  if (theme?.type !== "theme") return safe;
  for (const field of FIELDS) {
    if (VALID[field](theme[field])) safe[field] = theme[field] as string;
  }
  return safe;
}

/**
 * The site stylesheet confined to `scope`, for `theme` (see `canvasTheme`) and `template`, with
 * the webfonts loaded from the app's `/fonts/`.
 */
export function canvasCss(theme: Theme, scope: string, template: Template = STANDARD): string {
  // Browsers underline <a> by default; the site CSS relies on that, so `.link` needs it too.
  // It comes first so the site's own link rules (e.g. in the navigation) still win.
  const linkDefaults = `${scope} .link {\n  text-decoration: underline;\n}\n\n`;
  const css = siteCss(theme, template, { scope, fontUrlPrefix: "/fonts/" });
  return linkDefaults + withEditLinks(css) + editLayout(scope);
}

/**
 * Svedit wraps every node in an element, so site rules that rely on direct children
 * need an edit-mode equivalent. Svedit marks the first node of each list with `.first`.
 * A hidden block (marked `data-hidden` by the block handles) is dimmed.
 */
const editLayout = (scope: string) => `
${scope} .rich-text .container > .first > :first-child {
  margin-top: 0;
}

${scope} .image-node img {
  display: block;
}

${scope} [data-hidden] {
  opacity: 0.45;
}
`;

/** An `a` element in a selector: at the start or after a combinator, before its own suffix. */
const LINK_ELEMENT = String.raw`(^|[\s>+~])a(?=$|[\s:.[#>+~])`;
const HAS_LINK = new RegExp(LINK_ELEMENT);
const EACH_LINK = new RegExp(LINK_ELEMENT, "g");

/**
 * Links render as `span.link` while editing (an `<a>` inside contenteditable misbehaves),
 * so every rule that styles `a` also gets the same selector with `.link` in its place.
 */
export function withEditLinks(css: string): string {
  return css.replace(/([^{}]+)\{/g, (match, prelude: string) => {
    if (prelude.trim().startsWith("@")) return match;
    const selectors = prelude.split(",").map((s) => s.trim());
    const twins = selectors
      .filter((s) => HAS_LINK.test(s))
      .map((s) => s.replace(EACH_LINK, "$1.link"));
    if (twins.length === 0) return match;
    const lead = prelude.match(/^\s*/)?.[0] ?? "";
    return `${lead}${[...selectors, ...twins].join(",\n")} {`;
  });
}
