import { siteCss, validateSite } from "@static-cms/site";

type Theme = Parameters<typeof siteCss>[0];

/** Used while the document's theme fails validation, so broken values never reach the CSS. */
const FALLBACK_THEME: Omit<Theme, "id"> = {
  type: "theme",
  color_primary: "#1f5a8a",
  color_secondary: "#e8eef4",
  color_background: "#ffffff",
  color_text: "#1a1a1a",
  font_heading: "Georgia, serif",
  font_body: "system-ui, sans-serif",
  radius: "0.5rem",
  content_width: "64rem",
};

const THEME_CODES = new Set(["invalid-color", "invalid-theme-value"]);

/**
 * The site stylesheet confined to `scope`. The theme's values are only used when they
 * pass validation (hex colors, font lists, lengths); drafts may be saved with broken ones.
 */
export function canvasCss(document: unknown, scope: string): string {
  const doc = document as { document_id: string; nodes: Record<string, Record<string, unknown>> };
  const themeId = doc.nodes[doc.document_id]?.theme as string | undefined;
  const theme = themeId ? doc.nodes[themeId] : undefined;
  const broken = validateSite(document).problems.some(
    (p) => p.nodeId === themeId && THEME_CODES.has(p.code),
  );
  const safe =
    theme?.type === "theme" && !broken
      ? (theme as unknown as Theme)
      : { id: "theme", ...FALLBACK_THEME };
  // Browsers underline <a> by default; the site CSS relies on that, so `.link` needs it too.
  // It comes first so the site's own link rules (e.g. in the navigation) still win.
  const linkDefaults = `${scope} .link {\n  text-decoration: underline;\n}\n\n`;
  return linkDefaults + withEditLinks(siteCss(safe, { scope })) + editLayout(scope);
}

/**
 * Svedit wraps every node in an element, so site rules that rely on direct children
 * need an edit-mode equivalent. Svedit marks the first node of each list with `.first`.
 */
const editLayout = (scope: string) => `
${scope} .rich-text .container > .first > :first-child {
  margin-top: 0;
}

${scope} .image-node img {
  display: block;
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
