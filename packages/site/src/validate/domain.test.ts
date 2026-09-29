import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../test/fixtures.js";
import { contrastRatio } from "./domain.js";
import { validateSite } from "./index.js";

function errors(input: unknown) {
  return validateSite(input).problems.filter((p) => p.severity === "error");
}

function addPage(nodes: LooseNodes, id: string, slug: string) {
  nodes[id] = {
    id,
    type: "page",
    title: id,
    slug,
    seo_description: "",
    blocks: { nodes: [], marks: [], annotations: [] },
  };
  nodes.site_1.pages.nodes.push(id);
}

describe("validateSite: site rules", () => {
  it("requires the root to be a site", () => {
    const { doc } = editableDemoSite();
    doc.document_id = "page_home";
    expect(errors(doc)).toContainEqual(expect.objectContaining({ code: "root-not-site" }));
  });

  it("requires a language", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.lang = " ";
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "missing-language", nodeId: "site_1", property: "lang" }),
    ]);
  });

  it("rejects malformed languages, base URLs and schema versions", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.lang = "czech language";
    nodes.site_1.base_url = "ftp://pekarna.example";
    nodes.site_1.schema_version = 2;
    expect(errors(doc).map((p) => p.code)).toEqual([
      "unsupported-version",
      "invalid-language",
      "invalid-base-url",
    ]);
  });

  it("requires the home page slug to be empty", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_home.slug = "uvod";
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "home-slug", nodeId: "page_home" }),
    ]);
  });

  it("reports duplicate slugs naming both pages", () => {
    const { doc, nodes } = editableDemoSite();
    addPage(nodes, "page_contact_2", "kontakt");
    const [problem, ...rest] = errors(doc);
    expect(rest).toEqual([]);
    expect(problem).toMatchObject({ code: "duplicate-slug", nodeId: "page_contact_2" });
    expect(problem?.message).toContain("page_contact");
    expect(problem?.message).toContain("page_contact_2");
  });

  it("reports non-normalized slugs with a suggestion", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.slug = "Kontakt Us";
    const [problem] = errors(doc);
    expect(problem).toMatchObject({ code: "invalid-slug", nodeId: "page_contact" });
    expect(problem?.message).toContain('"kontakt-us"');
  });

  it("requires a slug for pages other than home", () => {
    const { doc, nodes } = editableDemoSite();
    addPage(nodes, "page_empty", "");
    expect(errors(doc)).toEqual([expect.objectContaining({ code: "invalid-slug" })]);
  });

  it("reports links to pages that are not in the site", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.nav_contact.page_id = "page_gone";
    nodes.internal_contact.page_id = "hero_1";
    expect(errors(doc).map((p) => [p.code, p.nodeId])).toEqual([
      ["missing-page", "nav_contact"],
      ["missing-page", "internal_contact"],
    ]);
  });

  it("requires link labels", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.cta_order.label.content = "";
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "empty-link-label", nodeId: "cta_order" }),
    ]);
  });

  it("requires a hero to be the first block", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_home.blocks.nodes = ["rich_text_about", "hero_1", "services_1"];
    expect(errors(doc)).toContainEqual(
      expect.objectContaining({ code: "hero-not-first", nodeId: "hero_1" }),
    );
  });

  it("allows at most one hero image and action, and requires a heading", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_2 = { ...nodes.image_hero, id: "image_2" };
    nodes.hero_1.image.nodes.push("image_2");
    nodes.hero_1.heading.content = "";
    expect(errors(doc).map((p) => [p.code, p.property])).toEqual([
      ["empty-heading", "heading"],
      ["too-many-items", "image"],
    ]);
  });

  it("reports a level 3 subheading before any level 2 heading", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.sub_address.level = 3;
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "heading-skip", nodeId: "sub_address" }),
    ]);
  });

  it("counts a services heading as a level 2 heading", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.sub_about.level = 3;
    expect(errors(doc)).toEqual([]);
    nodes.services_1.heading.content = "";
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "heading-skip", nodeId: "sub_about" }),
    ]);
  });

  it("requires alt text unless the image is decorative", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.alt = "";
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "missing-alt", nodeId: "image_hero", property: "alt" }),
    ]);
    nodes.image_hero.decorative = true;
    expect(errors(doc)).toEqual([]);
    nodes.image_hero.alt = "Chléb";
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "decorative-with-alt", nodeId: "image_hero" }),
    ]);
  });

  it.each(["../secret.png", "img/hero.png", ".hidden", ""])("rejects media key %j", (src) => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.src = src;
    expect(errors(doc)).toEqual([expect.objectContaining({ code: "invalid-media-key" })]);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<b>hi</b>",
    "//evil.example/",
    "kontakt",
    "https://",
  ])("rejects unsafe link %j", (href) => {
    const { doc, nodes } = editableDemoSite();
    nodes.link_map.href = href;
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "unsafe-link", nodeId: "link_map", property: "href" }),
    ]);
  });

  it.each(["https://example.com/a?b#c", "mailto:a@example.com", "tel:+420123", "/kontakt/"])(
    "accepts link %j",
    (href) => {
      const { doc, nodes } = editableDemoSite();
      nodes.link_map.href = href;
      expect(errors(doc)).toEqual([]);
    },
  );

  it("checks external navigation links too", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.ext_1 = {
      id: "ext_1",
      type: "external_link",
      label: { content: "Mapa", marks: [], annotations: [] },
      url: "javascript:void(0)",
    };
    nodes.nav_1.items.nodes.push("ext_1");
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "unsafe-link", nodeId: "ext_1", property: "url" }),
    ]);
  });

  it("reports low text contrast with the measured ratio", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.theme_1.color_text = "#999999";
    nodes.theme_1.color_background = "#ffffff";
    const [problem, ...rest] = errors(doc);
    expect(rest).toEqual([]);
    expect(problem).toMatchObject({ code: "low-contrast", nodeId: "theme_1" });
    expect(problem?.message).toContain("2.85:1");
  });

  it("requires hex colors and safe CSS values in the theme", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.theme_1.color_primary = "red";
    nodes.theme_1.radius = "1rem; } body { display: none";
    nodes.theme_1.font_body = "Inter; color: red";
    expect(errors(doc).map((p) => [p.code, p.property])).toEqual([
      ["invalid-color", "color_primary"],
      ["invalid-theme-value", "font_body"],
      ["invalid-theme-value", "radius"],
    ]);
  });

  it("reports several problems in one result", () => {
    const { doc, nodes } = editableDemoSite();
    addPage(nodes, "page_contact_2", "kontakt");
    nodes.image_hero.alt = "";
    const result = validateSite(doc);
    expect(result.valid).toBe(false);
    expect(result.problems.map((p) => p.code).sort()).toEqual(["duplicate-slug", "missing-alt"]);
  });
});

describe("contrastRatio", () => {
  it("matches WCAG reference values", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#fff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});
