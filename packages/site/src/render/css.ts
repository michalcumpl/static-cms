import {
  FONT_IDS,
  FONTS,
  type FontDef,
  type FontFile,
  fontFile,
  fontStack,
  isFontId,
  themeFontFiles,
  UNICODE_RANGES,
} from "../fonts.js";
import type { NodeOfType } from "../schema/index.js";

/**
 * Theme tokens as CSS custom properties. Validation restricts every value to hex colors,
 * catalog fonts and CSS lengths, so they cannot break out of the declaration.
 */
export function themeCss(theme: NodeOfType<"theme">): string {
  return `:root {
  --color-primary: ${theme.color_primary};
  --color-secondary: ${theme.color_secondary};
  --color-background: ${theme.color_background};
  --color-text: ${theme.color_text};
  --font-heading: ${themeFont(theme.font_heading)};
  --font-body: ${themeFont(theme.font_body)};
  --radius: ${theme.radius};
  --content-width: ${theme.content_width};
}
`;
}

/** A catalog font's stack; anything else (only in unvalidated drafts) gets the system font. */
const themeFont = (id: string) => fontStack(isFontId(id) ? id : "system-sans");

/**
 * One `@font-face` rule per font file the theme needs, each loading from `urlPrefix` (relative
 * to the stylesheet: `fonts/` for a published site). Empty for system fonts.
 */
export function fontFaceCss(theme: NodeOfType<"theme">, urlPrefix = "fonts/"): string {
  return fontFaces(themeFontFiles(theme), urlPrefix);
}

/**
 * `@font-face` rules for the upright latin file of every webfont, so a font picker can show each
 * font in its own face. Browsers only fetch a face when text uses it.
 */
export function fontPreviewCss(urlPrefix: string): string {
  const files = FONT_IDS.filter((id) => (FONTS[id] as FontDef).package).map((id) =>
    fontFile(id, "latin", "normal"),
  );
  return fontFaces(files, urlPrefix);
}

function fontFaces(files: readonly FontFile[], urlPrefix: string): string {
  return files
    .map(
      (file) => `@font-face {
  font-family: "${(FONTS[file.font] as FontDef).family}";
  font-style: ${file.style};
  font-weight: 400 700;
  font-display: swap;
  src: url("${urlPrefix}${file.name}") format("woff2");
  unicode-range: ${UNICODE_RANGES[file.subset]};
}
`,
    )
    .join("\n");
}

/** Layout and block styles. Every themeable value comes from a custom property. */
export const BASE_CSS = `*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  container-type: inline-size;
  margin: 0;
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 1.125rem;
  line-height: 1.6;
}

h1,
h2,
h3 {
  font-family: var(--font-heading);
  line-height: 1.2;
  margin: 1.5em 0 0.5em;
}

h1 {
  font-size: clamp(2rem, 5cqi, 3rem);
}

h2 {
  font-size: 1.75rem;
}

h3 {
  font-size: 1.3rem;
}

p,
ul {
  margin: 0 0 1em;
}

a {
  color: var(--color-primary);
  text-underline-offset: 0.15em;
}

a:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

img {
  max-width: 100%;
  height: auto;
}

.container {
  width: 100%;
  max-width: var(--content-width);
  margin: 0 auto;
  padding: 0 1rem;
}

.site-header {
  border-bottom: 1px solid var(--color-secondary);
}

.site-header .container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 2rem;
  padding-block: 1rem;
}

.site-name {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 100%;
  color: var(--color-text);
  font-family: var(--font-heading);
  font-size: 1.4rem;
  font-weight: 700;
  text-decoration: none;
}

.site-logo {
  display: block;
  width: auto;
  height: 2.5rem;
  max-width: 100%;
  object-fit: contain;
  object-position: left center;
}

.site-nav ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-nav a {
  color: var(--color-text);
  text-decoration: none;
}

.language-switcher ul {
  display: flex;
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.9rem;
}

.language-switcher a {
  color: var(--color-text);
}

.language-switcher a[aria-current="true"] {
  font-weight: 700;
  text-decoration: none;
}

.site-nav a:hover,
.site-nav a[aria-current="page"] {
  color: var(--color-primary);
  text-decoration: underline;
  text-decoration-thickness: 2px;
}

.block {
  padding-block: 2rem;
}

.hero {
  background: var(--color-secondary);
}

.hero-inner {
  display: grid;
  gap: 2rem;
  align-items: center;
}

.hero h1 {
  margin-top: 0;
}

.hero-text {
  font-size: 1.25rem;
}

.hero-image {
  border-radius: var(--radius);
}

.button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius);
  background: var(--color-primary);
  color: var(--color-background);
  font-weight: 700;
  text-decoration: none;
}

.button:hover {
  text-decoration: underline;
}

.rich-text .container > :first-child {
  margin-top: 0;
}

.rich-text ul {
  padding-left: 1.25em;
}

.services-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.service {
  padding: 1.25rem;
  border: 1px solid var(--color-secondary);
  border-radius: var(--radius);
}

.service-name {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.service-price {
  color: var(--color-primary);
  font-weight: 700;
  margin: 0;
}

.twi-inner {
  display: grid;
  gap: 2rem;
  align-items: center;
}

.twi-text > :first-child {
  margin-top: 0;
}

.twi-image img {
  border-radius: var(--radius);
}

.gallery-grid,
.team-list,
.logo-row {
  margin: 0;
  padding: 0;
  list-style: none;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.gallery-grid figure {
  margin: 0;
}

.gallery-grid img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius);
}

.gallery-grid figcaption {
  margin-top: 0.4rem;
  font-size: 0.95rem;
}

.team-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 2rem;
}

.person {
  text-align: center;
}

.portrait {
  display: block;
  margin-inline: auto;
  width: 8rem;
  aspect-ratio: 1;
  object-fit: cover;
  clip-path: circle(50%);
}

.person-name {
  margin: 0.75rem 0 0.25rem;
  font-size: 1.2rem;
}

.person-role {
  margin: 0 0 0.5rem;
  color: var(--color-primary);
  font-weight: 700;
}

.logos {
  background: var(--color-secondary);
}

.logo-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2rem 3rem;
}

.logo-row img {
  display: block;
  max-height: 4rem;
  width: auto;
}

.cta {
  background: var(--color-secondary);
}

.cta-text {
  margin: 0 0 1rem;
}

.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
}

.button-secondary {
  background: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.button-secondary:hover {
  background: var(--color-background);
}

.testimonial-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.5rem;
}

.testimonial {
  margin: 0;
  padding: 1.25rem;
  border-left: 4px solid var(--color-primary);
  background: var(--color-secondary);
  border-radius: var(--radius);
}

.testimonial blockquote {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.testimonial blockquote p {
  margin: 0;
}

.testimonial figcaption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
}

.testimonial-photo {
  width: 4rem;
  aspect-ratio: 1;
  object-fit: cover;
  clip-path: circle(50%);
}

.testimonial-name {
  font-weight: 700;
}

.testimonial-detail {
  color: var(--color-text);
  opacity: 0.8;
}

.faq details {
  padding-block: 0.75rem;
  border-bottom: 1px solid var(--color-secondary);
}

.faq summary {
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
}

.faq details p {
  margin: 0.5rem 0 0;
}

.contact-details {
  font-style: normal;
}

.contact-details p {
  margin: 0 0 0.5rem;
}

.business-name {
  font-family: var(--font-heading);
  font-weight: 700;
}

.hours {
  border-collapse: collapse;
}

.hours th,
.hours td {
  padding: 0.2rem 1.5rem 0.2rem 0;
  text-align: left;
  vertical-align: top;
}

.hours th {
  font-family: var(--font-heading);
  font-weight: 700;
}

.hours-note {
  margin: 0.75rem 0 0;
}

.footer-business {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.site-footer {
  margin-top: 2rem;
  border-top: 1px solid var(--color-secondary);
  font-size: 0.95rem;
}

.site-footer .container {
  padding-block: 1.5rem;
}

@container (min-width: 48rem) {
  .site-logo {
    height: 3rem;
  }

  .hero-inner {
    grid-template-columns: 3fr 2fr;
  }

  .twi-inner {
    grid-template-columns: 1fr 1fr;
  }

  .image-left .twi-image {
    order: -1;
  }

  .gallery-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .footer-business {
    grid-template-columns: 1fr 1fr;
  }

  .testimonial-list {
    grid-template-columns: 1fr 1fr;
  }

  .block {
    padding-block: 3rem;
  }
}
`;

export interface SiteCssOptions {
  /**
   * A selector to confine the styles to, e.g. `.site-canvas` for an editor canvas.
   * `:root`, `html` and `body` rules then apply to that element, and every other
   * rule only inside it. Without a scope the stylesheet is for a published page.
   */
  scope?: string;
  /** Where the `@font-face` rules load font files from; `fonts/`, beside the stylesheet, by default. */
  fontUrlPrefix?: string;
}

/**
 * The site stylesheet: `@font-face` rules for the theme's webfonts, the theme's custom
 * properties, then the base styles. Font rules are never scoped; they declare fonts, not styles.
 */
export function siteCss(theme: NodeOfType<"theme">, options: SiteCssOptions = {}): string {
  const fonts = fontFaceCss(theme, options.fontUrlPrefix);
  const css = `${themeCss(theme)}\n${BASE_CSS}`;
  const styles = options.scope ? scopeCss(css, options.scope) : css;
  return fonts ? `${fonts}\n${styles}` : styles;
}

const DOCUMENT_SELECTORS = new Set([":root", "html", "body"]);

/**
 * Prefixes every rule's selectors with `scope`. Works on this module's own CSS only:
 * flat rules plus at-rule blocks, with no braces inside strings or comments.
 */
function scopeCss(css: string, scope: string): string {
  return css.replace(/([^{}]+)\{/g, (_match, prelude: string) => {
    const lead = prelude.match(/^\s*/)?.[0] ?? "";
    const selectors = prelude.trim();
    if (selectors.startsWith("@")) return `${prelude}{`;
    const scoped = selectors
      .split(",")
      .map((s) => s.trim())
      .map((s) => (DOCUMENT_SELECTORS.has(s) ? scope : `${scope} ${s}`));
    return `${lead}${[...new Set(scoped)].join(",\n")} {`;
  });
}
