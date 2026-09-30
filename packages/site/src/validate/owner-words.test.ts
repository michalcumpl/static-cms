import { describe, expect, it } from "vitest";
import { editableImageBlocksSite, type LooseNodes } from "../test/fixtures.js";
import { validateSite } from "./index.js";

const text = (content: string) => ({ content, marks: [], annotations: [] });

describe("messages owners read", () => {
  it("say which page an image without a description is on", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.image_gallery_2.alt = "";
    const [problem] = validateSite(doc).problems;
    expect(problem).toMatchObject({ code: "missing-alt", nodeId: "image_gallery_2" });
    expect(problem?.message).toBe(
      'An image on "Galerie" needs a description (alt text), or mark it as decorative.',
    );
  });

  it("call a call to action a button, on its page", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.cta_order.label.content = "";
    const [problem] = validateSite(doc).problems;
    expect(problem).toMatchObject({ code: "empty-link-label", nodeId: "cta_order" });
    expect(problem?.message).toBe('A button on "Úvod" needs a label.');
  });

  it("call a menu entry a menu item", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.nav_home.label.content = "";
    expect(validateSite(doc).problems[0]?.message).toBe("A menu item needs a label.");
  });
});

/** Breaks the fixture in as many owner-fixable ways as possible at once. */
function brokenSite(): { doc: unknown; nodes: LooseNodes } {
  const { doc, nodes } = editableImageBlocksSite();
  nodes.page_contact.slug = "Kontakt Us";
  nodes.page_gallery.slug = "uvod";
  nodes.page_gallery.title = "";
  nodes.sub_order.level = 3;
  nodes.sub_address.level = 3;
  nodes.image_hero.alt = "";
  nodes.image_voucher.decorative = true;
  nodes.image_gallery_1.src = "../x.png";
  nodes.image_gallery_3.width = 0;
  nodes.cta_order.label = text("");
  nodes.cta_order.page_id = "page_gone";
  nodes.nav_contact.label = text("");
  nodes.internal_contact.page_id = "page_gone";
  nodes.link_map.href = "javascript:alert(1)";
  nodes.person_martina.name = text("");
  nodes.logo_p6.name = text("");
  nodes.logo_p6.page_id = "page_gone";
  nodes.logo_harmonie.url = "ftp://harmonie.example";
  nodes.sub_about.content = text("");
  nodes.hero_1.heading = text("");
  nodes.team_1.people.nodes = [];
  delete nodes.person_katerina;
  delete nodes.person_martina;
  delete nodes.image_katerina;
  nodes.page_home.blocks.nodes = ["services_1", "hero_1", "rich_text_about"];
  return { doc, nodes };
}

describe("owners' words", () => {
  const { doc, nodes } = brokenSite();
  const problems = validateSite(doc).problems.filter((p) => p.category === "site");
  const ids = Object.keys(nodes);

  it("covers many kinds of site problems", () => {
    const codes = new Set(problems.map((p) => p.code));
    for (const code of [
      "invalid-slug",
      "duplicate-slug",
      "missing-title",
      "heading-skip",
      "missing-alt",
      "decorative-with-alt",
      "invalid-media-key",
      "missing-image-size",
      "empty-link-label",
      "missing-page",
      "unsafe-link",
      "empty-name",
      "empty-block",
      "empty-heading",
      "hero-not-first",
    ]) {
      expect(codes, code).toContain(code);
    }
  });

  it.each(problems.map((p) => [p.code, p.message]))("%s: %s", (_code, message) => {
    for (const id of ids) expect(message, `node ID ${id}`).not.toMatch(new RegExp(`\\b${id}\\b`));
    expect(message).not.toMatch(/\bslug\b/i);
    expect(message).not.toMatch(/\b(seo_description|page_id|image_side|home_page_id|href|src)\b/);
  });
});
