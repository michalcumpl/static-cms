import { editableDemoSite, type LooseNodes } from "@webmio/model/testing";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

/** The demo site named "Pekárna Kolín", with a logo of the given size unless `width` is 0. */
function site(options: { width?: number; height?: number; showName?: boolean } = {}) {
  const { width = 600, height = 200, showName = true } = options;
  const { doc, nodes } = editableDemoSite();
  nodes.site_1.name = "Pekárna Kolín";
  nodes.site_1.header_show_name = showName;
  if (width > 0) addLogo(nodes, width, height);
  const result = renderSite(doc);
  if (!result.ok) throw new Error(JSON.stringify(result.problems, null, 2));
  return result.site;
}

function addLogo(nodes: LooseNodes, width: number, height: number) {
  nodes.brand = {
    id: "brand",
    type: "image",
    src: "pekarna-7c1e",
    alt: "Ignored: the site name describes the logo",
    decorative: false,
    width,
    height,
    focus_x: 50,
    focus_y: 50,
  };
  nodes.site_1.logo.nodes = ["brand"];
}

const homeLink = (html: string) => html.match(/<a class="site-name" href="\/">(.*?)<\/a>/s)?.[1];

describe("header logo", () => {
  it("shows the name alone without a logo", () => {
    expect(homeLink(site({ width: 0 }).pages[0]?.html ?? "")).toBe("Pekárna Kolín");
  });

  it("shows the logo, described by nothing, followed by the name", () => {
    const link = homeLink(site().pages[0]?.html ?? "");
    expect(link).toBe(
      '<img class="site-logo" src="/assets/images/pekarna-7c1e-600.webp" srcset="/assets/images/pekarna-7c1e-480.webp 480w, /assets/images/pekarna-7c1e-600.webp 600w" sizes="calc(3rem * 3)" alt="" width="600" height="200"><span>Pekárna Kolín</span>',
    );
  });

  it("shows the logo alone, described by the site name", () => {
    const link = homeLink(site({ showName: false }).pages[0]?.html ?? "");
    expect(link).toMatch(/^<img class="site-logo" [^>]*alt="Pekárna Kolín"[^>]*>$/);
    expect(link).not.toContain("loading=");
  });

  it("shows the name when it is hidden but there is no logo", () => {
    expect(homeLink(site({ width: 0, showName: false }).pages[0]?.html ?? "")).toBe(
      "Pekárna Kolín",
    );
  });

  it("sizes the logo by its shape", () => {
    const html = site({ width: 800, height: 300 }).pages[0]?.html ?? "";
    expect(html).toContain('sizes="calc(3rem * 2.67)"');
  });

  it("shows the logo on every page and the not-found page", () => {
    const rendered = site({ showName: false });
    for (const html of [...rendered.pages.map((p) => p.html), rendered.notFound]) {
      expect(html).toContain('class="site-logo"');
    }
  });

  it("passes html-validate", async () => {
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    for (const showName of [true, false]) {
      const rendered = site({ showName });
      for (const html of [rendered.pages[0]?.html ?? "", rendered.notFound]) {
        const report = await validator.validateString(html);
        expect(
          report.results.flatMap((r) => r.messages.map((m) => `${m.ruleId}: ${m.message}`)),
        ).toEqual([]);
      }
    }
  });
});
