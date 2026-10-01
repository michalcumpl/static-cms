import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { canvasCss, canvasTheme, STARTING_THEME, withEditLinks } from "./canvas-css";

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
    const css = canvasCss(canvasTheme(demoSite()), ".site-canvas");
    expect(css).toContain("--color-primary: #8a4b1f;");
    expect(css).toContain(".site-canvas .link {");
    expect(css).toMatch(/\.site-canvas \.site-nav \.link\[aria-current="page"\] \{/);
    expect(css.indexOf(".site-canvas .link {\n  text-decoration: underline;")).toBe(0);
  });

  it("keeps the last valid value of a field that isn't valid, and the other fields", () => {
    const doc = demoSite();
    const theme = nodes(doc).theme_1 as Record<string, unknown>;
    const before = canvasTheme(doc);
    theme.color_primary = "red; } body { display: none";
    theme.font_heading = "lora";
    const now = canvasTheme(doc, before);
    expect(now).toMatchObject({ color_primary: "#8a4b1f", font_heading: "lora" });
    const css = canvasCss(now, ".site-canvas");
    expect(css).not.toContain("display: none");
    expect(css).toContain("--color-primary: #8a4b1f;");
  });

  it("starts from the first preset's values before it has seen valid ones", () => {
    const doc = demoSite();
    (nodes(doc).theme_1 as Record<string, unknown>).color_text = "#12";
    expect(canvasTheme(doc).color_text).toBe(STARTING_THEME.color_text);
    expect(STARTING_THEME.color_primary).toBe("#1f5a8a");
  });

  it("shows a colour that fails contrast", () => {
    const doc = demoSite();
    (nodes(doc).theme_1 as Record<string, unknown>).color_primary = "#7fb2e5";
    const css = canvasCss(canvasTheme(doc), ".site-canvas");
    expect(css).toContain("--color-primary: #7fb2e5;");
  });

  it("loads webfonts from the app's /fonts/, unscoped", () => {
    const doc = demoSite();
    (nodes(doc).theme_1 as Record<string, unknown>).font_heading = "lora";
    const css = canvasCss(canvasTheme(doc), ".site-canvas");
    expect(css).toContain(`src: url("/fonts/lora-latin-normal.woff2") format("woff2");`);
    expect(css).toContain(`--font-heading: "Lora", Georgia, 'Times New Roman', serif;`);
    expect(css).not.toContain(".site-canvas @font-face");
  });
});

describe("canvasCss for image blocks", () => {
  it("scopes the image block styles, including round portraits", () => {
    const css = canvasCss(canvasTheme(demoSite()), ".site-canvas");
    for (const selector of [".portrait", ".gallery-grid img", ".logo-row img", ".twi-inner"]) {
      expect(css, selector).toContain(`.site-canvas ${selector}`);
    }
  });
});
