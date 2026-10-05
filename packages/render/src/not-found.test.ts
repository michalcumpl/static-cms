import { editableDemoSite } from "@webmio/model/testing";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { type RenderOptions, renderSite } from "./index.js";

function notFound(lang = "cs", options: RenderOptions = {}) {
  const { doc, nodes } = editableDemoSite();
  nodes.site_1.lang = lang;
  nodes.site_1.description = "Rodinná pekárna";
  nodes.image_logo = {
    id: "image_logo",
    type: "image",
    src: "logo-1a2b",
    alt: "",
    decorative: false,
    width: 512,
    height: 512,
  };
  nodes.site_1.favicon = { nodes: ["image_logo"], marks: [], annotations: [] };
  const result = renderSite(doc, options);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.notFound;
}

describe("not-found page", () => {
  it("speaks Czech on a Czech site", () => {
    const html = notFound("cs");
    expect(html).toContain('<h1 class="page-title">Stránka nenalezena</h1>');
    expect(html).toContain("<title>Stránka nenalezena – Pekárna U Lípy</title>");
    expect(html).toContain('<a href="/">Přejít na úvodní stránku</a>');
    expect(html).toContain('<html lang="cs">');
  });

  it("uses the primary language subtag", () => {
    expect(notFound("cs-CZ")).toContain("Stránka nenalezena");
  });

  it("falls back to English for other languages", () => {
    const html = notFound("fr");
    expect(html).toContain('<h1 class="page-title">Page not found</h1>');
    expect(html).toContain('<a href="/">Go to the home page</a>');
  });

  it("has the site's header, menu, footer and favicon, with links from the base path", () => {
    const html = notFound("cs", { basePath: "/web/" });
    expect(html).toContain('<a class="site-name" href="/web/">Pekárna U Lípy</a>');
    expect(html).toContain('href="/web/kontakt/"');
    expect(html).toContain('href="/web/assets/style.css"');
    expect(html).toContain('<link rel="icon" href="/web/favicon.ico" sizes="32x32">');
    expect(html).toContain('<footer class="site-footer">');
    expect(html).not.toContain('aria-current="page"');
  });

  it("has no description, canonical link, share metadata or structured data", () => {
    const html = notFound("cs", { siteUrl: "https://anideti.cz" });
    for (const text of ['name="description"', "canonical", "og:", "twitter:", "ld+json"]) {
      expect(html).not.toContain(text);
    }
  });

  it("passes html-validate", async () => {
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    const report = await validator.validateString(notFound());
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });
});
