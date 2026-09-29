import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { canvasCss, withEditLinks } from "./canvas-css";

describe("withEditLinks", () => {
  it("adds a .link twin for every selector that styles an a element", () => {
    const css = withEditLinks(
      `a {\n  color: red;\n}\n.site-nav a:hover,\n.x a[aria-current="page"] {\n  color: blue;\n}\n`,
    );
    expect(css).toContain("a,\n.link {");
    expect(css).toContain(
      '.site-nav a:hover,\n.x a[aria-current="page"],\n.site-nav .link:hover,\n.x .link[aria-current="page"] {',
    );
  });

  it("leaves selectors without an a element alone", () => {
    const css = ".nav, .label, abbr, .a-b, span.a {\n  color: red;\n}\n";
    expect(withEditLinks(css)).toBe(css);
  });
});

describe("canvasCss", () => {
  const nodes = (doc: unknown) => (doc as { nodes: Record<string, Record<string, unknown>> }).nodes;

  it("scopes the site stylesheet and styles edit-mode links like published links", () => {
    const css = canvasCss(demoSite(), ".site-canvas");
    expect(css).toContain("--color-primary: #8a4b1f;");
    expect(css).toContain(".site-canvas .link {");
    expect(css).toMatch(/\.site-canvas \.site-nav \.link\[aria-current="page"\] \{/);
    expect(css.indexOf(".site-canvas .link {\n  text-decoration: underline;")).toBe(0);
  });

  it("falls back to a safe theme when the saved theme is invalid", () => {
    const doc = demoSite();
    const theme = nodes(doc).theme_1 as Record<string, unknown>;
    theme.color_primary = "red; } body { display: none";
    const css = canvasCss(doc, ".site-canvas");
    expect(css).not.toContain("display: none");
    expect(css).toContain("--color-primary: #1f5a8a;");
  });
});
