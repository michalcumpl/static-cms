import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../testing.js";
import { validateSite } from "./index.js";

const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

function addImage(nodes: LooseNodes, id: string, width = 1200, height = 800, alt = "Pult") {
  nodes[id] = { id, type: "image", src: `${id}-1a2b`, alt, decorative: false, width, height };
  return id;
}

function problemsOf(doc: unknown) {
  return validateSite(doc).problems;
}

describe("favicon and share images", () => {
  it("allows at most one favicon", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.favicon = list([addImage(nodes, "logo_a"), addImage(nodes, "logo_b")]);
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "too-many-items", nodeId: "site_1", property: "favicon" }),
    );
  });

  it("allows at most one share image per page and for the site", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.share_image = list([addImage(nodes, "a"), addImage(nodes, "b")]);
    nodes.site_1.share_image = list([addImage(nodes, "c"), addImage(nodes, "d")]);
    const tooMany = problemsOf(doc).filter((p) => p.code === "too-many-items");
    expect(tooMany.map((p) => [p.nodeId, p.property])).toEqual([
      ["site_1", "share_image"],
      ["page_contact", "share_image"],
    ]);
    expect(tooMany[1]?.message).toBe('"Kontakt" can have at most one share image.');
  });

  it("needs no description for the favicon", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.favicon = list([addImage(nodes, "logo", 512, 512, "")]);
    expect(problemsOf(doc)).toEqual([]);
  });

  it("names a share image without a description by its page", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.share_image = list([addImage(nodes, "mapa", 1200, 630, "")]);
    nodes.site_1.share_image = list([addImage(nodes, "pult", 1200, 630, "")]);
    const messages = problemsOf(doc)
      .filter((p) => p.code === "missing-alt")
      .map((p) => [p.nodeId, p.message]);
    expect(messages).toEqual([
      [
        "mapa",
        'The share image of "Kontakt" needs a description (alt text), or mark it as decorative.',
      ],
      ["pult", "The site's share image needs a description (alt text), or mark it as decorative."],
    ]);
  });

  it("warns about a small share image", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.share_image = list([addImage(nodes, "mapa", 400, 300)]);
    const result = validateSite(doc);
    expect(result.valid).toBe(true);
    expect(result.problems).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "small-share-image",
        nodeId: "mapa",
        message:
          'The share image of "Kontakt" is only 400 pixels wide; link previews need at least 600 (1200 is best).',
      }),
    ]);
  });

  it("warns about a small favicon, judged by its longer side", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.favicon = list([addImage(nodes, "logo", 64, 64)]);
    expect(problemsOf(doc)).toEqual([
      expect.objectContaining({ severity: "warning", code: "small-favicon", nodeId: "logo" }),
    ]);
    nodes.logo.width = 400;
    nodes.logo.height = 100;
    expect(problemsOf(doc)).toEqual([]);
  });
});

describe("description for search engines", () => {
  it("warns about a page without a description when the site has none", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.seo_description = " ";
    const result = validateSite(doc);
    expect(result.valid).toBe(true);
    expect(result.problems).toEqual([
      expect.objectContaining({
        severity: "warning",
        category: "site",
        code: "no-description",
        nodeId: "page_contact",
        property: "seo_description",
        message:
          '"Kontakt" has no description for search engines and link previews. Add one to the page, or a description of the whole site.',
      }),
    ]);
  });

  it("uses the site's description as the fallback", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.seo_description = "";
    nodes.site_1.description = "Rodinná pekárna v Kolíně";
    expect(problemsOf(doc)).toEqual([]);
  });

  it("lists the warning after errors", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.seo_description = "";
    nodes.image_hero.alt = "";
    expect(problemsOf(doc).map((p) => p.code)).toEqual(["missing-alt", "no-description"]);
  });
});
