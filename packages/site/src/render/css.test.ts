import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../test/fixtures.js";
import { BASE_CSS } from "./css.js";
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

  it("takes every themeable value in the base styles from custom properties", () => {
    expect(BASE_CSS).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b/i);
    expect(BASE_CSS).not.toMatch(/font-family:(?!\s*var\()/);
    expect(BASE_CSS).not.toMatch(/border-radius:(?!\s*var\()/);
  });

  it("styles every block type and the page landmarks", () => {
    for (const selector of [
      ".hero",
      ".rich-text",
      ".services",
      ".site-header",
      ".site-nav",
      ".site-footer",
    ]) {
      expect(BASE_CSS).toContain(selector);
    }
  });
});
