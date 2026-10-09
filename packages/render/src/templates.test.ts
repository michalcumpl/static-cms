import { readFileSync } from "node:fs";
import { type LooseNodes, loadFixture } from "@webmio/model/testing";
import { STANDARD, TEMPLATES, type Template, TOKEN_NAMES } from "@webmio/templates";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { siteCss } from "./css.js";
import { renderSite } from "./index.js";

type Doc = { document_id: string; nodes: LooseNodes };

const fixture = (name: string) =>
  readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

/**
 * The stylesheet with the template's token declarations left out and every token reference
 * replaced by the template's value for it (templates spec, "The Standard template").
 */
function substituted(css: string, template: Template): string {
  const withoutTokens = css.replace(/^[^{}\n]+ \{\n {2}--text-small:[^}]*\}\n\n/m, "");
  return withoutTokens.replace(/var\(--([a-z0-9-]+)\)/g, (ref, name: string) =>
    (TOKEN_NAMES as readonly string[]).includes(name)
      ? template.tokens[name as (typeof TOKEN_NAMES)[number]]
      : ref,
  );
}

/** A made-up template whose tokens and styles differ from Standard's. */
const ROOMY: Template = {
  ...STANDARD,
  id: "roomy",
  tokens: { ...STANDARD.tokens, "text-title": "4rem", "block-padding": "3rem" },
  css: ".hero {\n  text-align: center;\n}\n",
};

describe("the Standard template", () => {
  const demo = () => loadFixture("demo-site.json") as Doc;

  it("Demo site unchanged: the stylesheet with Standard's values in place is the old one", () => {
    const theme = demo().nodes.theme_1;
    const webfonts = { ...theme, font_heading: "lora", font_body: "inter" };
    expect(substituted(siteCss(theme, STANDARD), STANDARD)).toBe(fixture("site-css-v12.css"));
    expect(substituted(siteCss(webfonts, STANDARD), STANDARD)).toBe(
      fixture("site-css-v12-webfonts.css"),
    );
    const scoped = siteCss(webfonts, STANDARD, { scope: ".site-canvas", fontUrlPrefix: "/fonts/" });
    expect(substituted(scoped, STANDARD)).toBe(fixture("site-css-v12-scoped.css"));
  });

  it("writes every token once, before the shared styles", () => {
    const css = siteCss(demo().nodes.theme_1, STANDARD);
    for (const name of TOKEN_NAMES) {
      expect(css.match(new RegExp(`--${name}:`, "g")), name).toHaveLength(1);
    }
    expect(css.indexOf("--text-small:")).toBeLessThan(css.indexOf("body {"));
  });
});

describe("rendering with a template", () => {
  it("Template change leaves HTML unchanged", () => {
    const standard = loadFixture("demo-site.json") as Doc;
    const roomy = loadFixture("demo-site.json") as Doc;
    roomy.nodes.site_1.template = "roomy";
    const a = renderSite(standard, { templates: [STANDARD, ROOMY] });
    const b = renderSite(roomy, { templates: [STANDARD, ROOMY] });
    if (!a.ok || !b.ok) throw new Error("render failed");
    expect(b.site.pages.map((p) => p.html)).toEqual(a.site.pages.map((p) => p.html));
    expect(b.site.notFound).toBe(a.site.notFound);
    expect(b.site.css).not.toBe(a.site.css);
  });

  it("Larger headings: the main heading's size is the template's value", () => {
    const doc = loadFixture("demo-site.json") as Doc;
    doc.nodes.site_1.template = "roomy";
    const result = renderSite(doc, { templates: [ROOMY] });
    if (!result.ok) throw new Error("render failed");
    expect(result.site.css).toContain("--text-title: 4rem;");
    expect(result.site.css).toContain("h1 {\n  font-size: var(--text-title);");
    expect(result.site.css.endsWith(".hero {\n  text-align: center;\n}\n")).toBe(true);
  });

  it("uses the current release, also for a document that records an older one", () => {
    const doc = loadFixture("demo-site.json") as Doc;
    doc.nodes.site_1.template = "roomy";
    const result = renderSite(doc, { templates: [{ ...ROOMY, release: 3 }] });
    if (!result.ok) throw new Error("render failed");
    expect(result.site.css).toContain("--text-title: 4rem;");
  });

  it("refuses an unknown template", () => {
    const doc = loadFixture("demo-site.json") as Doc;
    doc.nodes.site_1.template = "bakery";
    const result = renderSite(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.map((p) => p.code)).toEqual(["unknown-template"]);
  });
});

describe("template render checks", () => {
  const FIXTURES = ["demo-site.json", "image-blocks-site.json", "starter-site.json"];
  const validator = new HtmlValidate({
    extends: ["html-validate:recommended"],
    // Doctype case is a style preference; the rendering spec pins lowercase `<!doctype html>`.
    rules: { "doctype-style": "off" },
  });

  it.each(FIXTURES)("every template renders %s into valid pages", async (name) => {
    for (const template of TEMPLATES) {
      const doc = loadFixture(name) as Doc;
      Object.assign(doc.nodes[doc.document_id], {
        template: template.id,
        template_release: template.release,
      });
      const result = renderSite(doc);
      if (!result.ok) {
        throw new Error(
          `Template "${template.id}" on ${name}: ${result.problems.map((p) => p.message).join(" ")}`,
        );
      }
      for (const page of [...result.site.pages, { path: "404.html", html: result.site.notFound }]) {
        const report = await validator.validateString(page.html);
        const messages = report.results.flatMap((r) =>
          r.messages.map((m) => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`),
        );
        expect(messages, `Template "${template.id}" on ${name}, ${page.path}`).toEqual([]);
      }
    }
  });
});
