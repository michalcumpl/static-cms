import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../test/fixtures.js";
import { RenderContext } from "./context.js";
import { BASE_CSS, fontFaceCss, fontPreviewCss, siteCss, themeCss } from "./css.js";
import { renderSite } from "./index.js";

function render(primary: string) {
  const { doc, nodes } = editableDemoSite();
  nodes.theme_1.color_primary = primary;
  const result = renderSite(doc);
  if (!result.ok) throw new Error("render failed");
  return result.site;
}

describe("theme stylesheet", () => {
  it("defines the theme as custom properties on :root", () => {
    const { css } = render("#8a4b1f");
    expect(css).toMatch(/^:root \{\n/);
    for (const decl of [
      "--color-primary: #8a4b1f;",
      "--color-secondary: #f2e3d0;",
      "--color-background: #fffaf3;",
      "--color-text: #2b2118;",
      "--font-heading: Georgia, 'Times New Roman', serif;",
      "--radius: 0.5rem;",
      "--content-width: 64rem;",
    ]) {
      expect(css).toContain(decl);
    }
  });

  it("changes only custom-property values when the theme changes", () => {
    const a = render("#8a4b1f");
    const b = render("#1f5a8a");
    expect(b.pages.map((p) => p.html)).toEqual(a.pages.map((p) => p.html));
    expect(b.css).not.toBe(a.css);
    expect(b.css.replace("#1f5a8a", "#8a4b1f")).toBe(a.css);
  });

  it("writes a webfont's family before its fallback", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.theme_1.font_heading = "lora";
    const result = renderSite(doc);
    if (!result.ok) throw new Error("render failed");
    expect(result.site.css).toContain(`--font-heading: "Lora", Georgia, 'Times New Roman', serif;`);
  });

  it("loads webfonts with @font-face, leaving the HTML unchanged", () => {
    const { doc, nodes } = editableDemoSite();
    const system = renderSite(doc);
    nodes.theme_1.font_body = "inter";
    const inter = renderSite(doc);
    if (!system.ok || !inter.ok) throw new Error("render failed");
    expect(inter.site.pages.map((p) => p.html)).toEqual(system.site.pages.map((p) => p.html));
    expect(system.site.css).not.toContain("@font-face");
    const sources = [...inter.site.css.matchAll(/src: url\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(sources).toEqual([
      "fonts/inter-latin-normal.woff2",
      "fonts/inter-latin-italic.woff2",
      "fonts/inter-latin-ext-normal.woff2",
      "fonts/inter-latin-ext-italic.woff2",
    ]);
    expect(inter.site.css).toMatch(/^@font-face \{/);
  });

  it("writes one complete rule per font file", () => {
    const { nodes } = editableDemoSite();
    const theme = { ...nodes.theme_1, font_heading: "inter", font_body: "inter" };
    expect(fontFaceCss(theme).split("\n\n")[0]).toBe(`@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url("fonts/inter-latin-normal.woff2") format("woff2");
  unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}`);
  });

  it("loads fonts from another place, unscoped, for the editor canvas", () => {
    const { nodes } = editableDemoSite();
    const theme = { ...nodes.theme_1, font_heading: "lora" };
    const css = siteCss(theme, { scope: ".site-canvas", fontUrlPrefix: "/fonts/" });
    expect(css).toMatch(/^@font-face \{\n {2}font-family: "Lora";/);
    expect(css).toContain(`src: url("/fonts/lora-latin-normal.woff2")`);
    expect(css).not.toContain(".site-canvas @font-face");
  });

  it("previews every webfont with its upright latin file", () => {
    const css = fontPreviewCss("/fonts/");
    const sources = [...css.matchAll(/src: url\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(sources).toHaveLength(8);
    for (const source of sources) expect(source).toMatch(/^\/fonts\/[a-z-]+-latin-normal\.woff2$/);
    expect(css).toContain('font-family: "Playfair Display";');
  });

  it("takes every themeable value in the base styles from custom properties", () => {
    expect(BASE_CSS).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b/i);
    expect(BASE_CSS).not.toMatch(/font-family:(?!\s*var\()/);
    expect(BASE_CSS).not.toMatch(/border-radius:(?!\s*var\()/);
  });

  it("has no comments, which scoping for the editor canvas would split at commas", () => {
    expect(BASE_CSS).not.toContain("/*");
  });

  it("styles every block type and the page landmarks", () => {
    for (const selector of [
      ".hero",
      ".rich-text",
      ".services",
      ".twi-inner",
      ".gallery-grid",
      ".team-list",
      ".portrait",
      ".logo-row",
      ".cta",
      ".button-secondary",
      ".testimonial-list",
      ".testimonial-photo",
      ".site-header",
      ".site-nav",
      ".site-footer",
    ]) {
      expect(BASE_CSS).toContain(selector);
    }
  });
});

describe("scoped stylesheet", () => {
  const theme = () => {
    const { doc } = editableDemoSite();
    return new RenderContext(doc, "/").node("theme_1", "theme");
  };
  const preludes = (css: string) =>
    [...css.matchAll(/([^{}]+)\{/g)]
      .map((m) => (m[1] ?? "").trim())
      .filter((p) => !p.startsWith("@"));

  it("leaves the unscoped stylesheet unchanged", () => {
    expect(siteCss(theme())).toBe(`${themeCss(theme())}\n${BASE_CSS}`);
  });

  it("confines every rule to the scope element", () => {
    const css = siteCss(theme(), { scope: ".site-canvas" });
    for (const prelude of preludes(css)) {
      for (const selector of prelude.split(",")) {
        expect(selector.trim(), prelude).toMatch(/^\.site-canvas(\s|$)/);
      }
    }
  });

  it("maps :root, html and body to the scope element itself", () => {
    const css = siteCss(theme(), { scope: ".site-canvas" });
    expect(css).toMatch(/^\.site-canvas \{\n {2}--color-primary: #8a4b1f;/);
    expect(css).toContain(".site-canvas {\n  container-type: inline-size;");
    expect(css).not.toMatch(/:root|(^|\s)(html|body)\s*\{/m);
  });

  it("scopes rules inside the container query", () => {
    const css = siteCss(theme(), { scope: ".site-canvas" });
    expect(css).toMatch(/@container \(min-width: 48rem\) \{\s*\.site-canvas \.site-logo \{/);
    expect(css).toMatch(/\n {2}\.site-canvas \.hero-inner \{/);
  });
});
