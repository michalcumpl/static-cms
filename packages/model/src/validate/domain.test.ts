import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes, loadFixture } from "../testing.js";
import { contrastRatio } from "../themes.js";
import { validateSite } from "./index.js";

function errors(input: unknown) {
  return validateSite(input).problems.filter((p) => p.severity === "error");
}

function addPage(nodes: LooseNodes, id: string, slug: string, title = id) {
  nodes[id] = {
    id,
    type: "page",
    title,
    slug,
    seo_description: `${title}.`,
    translation_key: id,
    share_image: { nodes: [], marks: [], annotations: [] },
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
    nodes.site_1.schema_version = 1;
    expect(errors(doc).map((p) => p.code)).toEqual([
      "unsupported-version",
      "invalid-language",
      "invalid-base-url",
    ]);
  });

  it("rejects schema version 5, which must be upgraded first", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.schema_version = 5;
    expect(errors(doc).map((p) => p.code)).toEqual(["unsupported-version"]);
    expect(validateSite(loadFixture("demo-site-v5.json")).valid).toBe(false);
  });

  it("rejects schema version 11, which must be upgraded first", () => {
    expect(errors(loadFixture("demo-site-v11.json")).map((p) => p.code)).toContain(
      "unsupported-version",
    );
  });

  it("reports two pages with the same translation key, naming both", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.translation_key = "page_home";
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "duplicate-translation-key",
        category: "site",
        nodeId: "page_contact",
        message:
          '"Úvod" and "Kontakt" are paired with the same page in other languages; only one of them can be.',
      }),
    ]);
  });

  it("reports an empty translation key", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.translation_key = " ";
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "invalid-value",
        nodeId: "page_contact",
        property: "translation_key",
      }),
    ]);
  });

  it("treats the page named by home_page_id as home, wherever it is listed", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.pages.nodes = ["page_contact", "page_home"];
    expect(validateSite(doc).problems).toEqual([]);
  });

  it("reports a home page ID that is not a page of the site", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.home_page_id = "page_gone";
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "missing-home",
        category: "site",
        nodeId: "site_1",
        property: "home_page_id",
      }),
    ]);
  });

  it("requires the home page to have a slug too", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_home.slug = "";
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "invalid-slug", nodeId: "page_home" }),
    ]);
  });

  it("reports a home slug that another page also uses", () => {
    const { doc, nodes } = editableDemoSite();
    addPage(nodes, "page_intro", "uvod");
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "duplicate-slug", nodeId: "page_intro" }),
    ]);
  });

  it("reports duplicate slugs naming both pages by title", () => {
    const { doc, nodes } = editableDemoSite();
    addPage(nodes, "page_contact_2", "kontakt", "Contact us");
    const [problem, ...rest] = errors(doc);
    expect(rest).toEqual([]);
    expect(problem).toMatchObject({ code: "duplicate-slug", nodeId: "page_contact_2" });
    expect(problem?.message).toBe('"Kontakt" and "Contact us" have the same address "kontakt".');
  });

  it("warns about a page that is in the menu twice", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.nav_contact_2 = { ...nodes.nav_contact, id: "nav_contact_2" };
    nodes.nav_1.items.nodes.push("nav_contact_2");
    const result = validateSite(doc);
    expect(result.valid).toBe(true);
    expect(result.problems).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "duplicate-menu-item",
        nodeId: "nav_contact_2",
      }),
    ]);
    expect(result.problems[0]?.message).toBe('"Kontakt" is in the menu more than once.');
  });

  it("reports non-normalized slugs with a suggestion", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.slug = "Kontakt Us";
    const [problem] = errors(doc);
    expect(problem).toMatchObject({ code: "invalid-slug", nodeId: "page_contact" });
    expect(problem?.message).toContain('"kontakt-us"');
  });

  it("requires a slug for every page", () => {
    const { doc, nodes } = editableDemoSite();
    addPage(nodes, "page_empty", "");
    expect(errors(doc)).toEqual([expect.objectContaining({ code: "invalid-slug" })]);
  });

  it("reports links to pages that are not in the site", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.nav_contact.page_id = "page_gone";
    nodes.internal_contact.page_id = "hero_1";
    const problems = errors(doc);
    expect(problems.map((p) => [p.code, p.category, p.nodeId])).toEqual([
      ["missing-page", "site", "nav_contact"],
      ["missing-page", "site", "internal_contact"],
    ]);
    // nav_contact is in the menu; internal_contact is a text link on the home page.
    expect(problems.map((p) => p.message)).toEqual([
      "A menu item points to a page that no longer exists.",
      'A link on "Úvod" points to a page that no longer exists.',
    ]);
  });

  it("names pages by title, never by node ID, in page messages", () => {
    const { doc, nodes } = editableDemoSite();
    addPage(nodes, "page_empty", "", "Ceník");
    nodes.page_home.blocks.nodes = ["rich_text_about", "hero_1", "services_1"];
    const messages = errors(doc).map((p) => p.message);
    expect(messages).toContain('"Ceník" needs an address.');
    expect(messages).toContain('The hero must be the first block of "Úvod".');
    expect(messages.join(" ")).not.toMatch(/page_/);
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

  it("requires known image dimensions", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.width = 0;
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "missing-image-size",
        category: "site",
        nodeId: "image_hero",
        property: "width",
      }),
    ]);
  });

  it("accepts a focal point in the upper third", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.focus_x = 40;
    nodes.image_hero.focus_y = 30;
    expect(validateSite(doc).problems).toEqual([]);
  });

  it("refuses a focal point outside the image", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.focus_x = 120;
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "invalid-focal-point",
        category: "site",
        nodeId: "image_hero",
        property: "focus_x",
      }),
    ]);
  });

  it("refuses a focal point that isn't a whole number", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.focus_y = 12.5;
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "invalid-value", nodeId: "image_hero" }),
    ]);
  });

  it("refuses a path as an image source", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.src = "../secret.png";
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "invalid-media-key", nodeId: "image_hero" }),
    ]);
  });

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
    const [problem, onPanels, ...rest] = errors(doc);
    expect(rest).toEqual([]);
    expect(problem).toMatchObject({ code: "low-contrast", nodeId: "theme_1" });
    expect(problem?.message).toMatch(/^Text on background: contrast 2\.85:1/);
    // Grey text is just as hard to read on the paler panels.
    expect(onPanels?.message).toMatch(/^Text on panels: /);
  });

  it("requires hex colors, catalog fonts and safe CSS lengths in the theme", () => {
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

  it("reports an unknown font", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.theme_1.font_heading = "comic-sans";
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "invalid-theme-value",
        property: "font_heading",
        message: expect.stringContaining("heading font must be chosen from the list of fonts"),
      }),
    ]);
  });

  it("reports a font list instead of a catalog font", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.theme_1.font_body = "Georgia, serif";
    expect(errors(doc)).toEqual([
      expect.objectContaining({
        code: "invalid-theme-value",
        property: "font_body",
        message: expect.stringContaining("body font must be chosen from the list of fonts"),
      }),
    ]);
  });

  it("accepts system fonts", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.theme_1.font_heading = "georgia";
    nodes.theme_1.font_body = "system-sans";
    expect(errors(doc)).toEqual([]);
  });

  it("reports pale links and buttons on the background", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.theme_1.color_primary = "#7fb2e5";
    nodes.theme_1.color_background = "#ffffff";
    nodes.theme_1.color_secondary = "#ffffff";
    const found = errors(doc);
    expect(found.map((p) => [p.code, p.property])).toEqual([
      ["low-contrast", "color_primary"],
      ["low-contrast", "color_primary"],
    ]);
    expect(found[0]?.message).toMatch(/^Links and buttons: contrast 2\.23:1/);
    expect(found[1]?.message).toMatch(/^Links and buttons on panels: /);
  });

  it("reports text on a dark secondary colour", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.theme_1.color_text = "#1a1a1a";
    nodes.theme_1.color_secondary = "#3b3b3b";
    const found = errors(doc).filter((p) => p.message.startsWith("Text on panels"));
    expect(found).toEqual([
      expect.objectContaining({ code: "low-contrast", nodeId: "theme_1", property: "color_text" }),
    ]);
  });

  it("finds no contrast problem when every pair passes", () => {
    const { doc, nodes } = editableDemoSite();
    Object.assign(nodes.theme_1, {
      color_primary: "#1f5a8a",
      color_secondary: "#e8eef4",
      color_background: "#ffffff",
      color_text: "#1a1a1a",
    });
    expect(validateSite(doc).problems.filter((p) => p.code === "low-contrast")).toEqual([]);
  });

  it("allows one logo, described by the site name", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.logo_img = { ...nodes.image_hero, id: "logo_img", alt: "", decorative: false };
    nodes.site_1.logo.nodes = ["logo_img"];
    expect(validateSite(doc).problems).toEqual([]);
    nodes.logo_img_2 = { ...nodes.logo_img, id: "logo_img_2" };
    nodes.site_1.logo.nodes.push("logo_img_2");
    expect(errors(doc)).toEqual([
      expect.objectContaining({ code: "too-many-items", nodeId: "site_1", property: "logo" }),
    ]);
  });

  it("warns when the name is hidden but there is no logo", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.header_show_name = false;
    const result = validateSite(doc);
    expect(result.valid).toBe(true);
    expect(result.problems).toEqual([
      expect.objectContaining({
        code: "name-without-logo",
        severity: "warning",
        property: "header_show_name",
      }),
    ]);
    nodes.logo_img = { ...nodes.image_hero, id: "logo_img" };
    nodes.site_1.logo.nodes = ["logo_img"];
    expect(validateSite(doc).problems).toEqual([]);
  });

  it("finds no theme problem in the fixtures", () => {
    for (const name of ["demo-site.json", "starter-site.json", "image-blocks-site.json"]) {
      const problems = validateSite(loadFixture(name)).problems;
      expect(
        problems.filter((p) => p.nodeId === "theme_1"),
        name,
      ).toEqual([]);
    }
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
