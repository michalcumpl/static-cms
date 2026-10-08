import { describe, expect, it } from "vitest";
import { editableImageBlocksSite, type LooseNodes } from "../testing.js";
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
  nodes.site_1.team.nodes = [];
  delete nodes.person_katerina;
  delete nodes.person_martina;
  delete nodes.image_katerina;
  nodes.page_home.blocks.nodes = ["services_1", "hero_1", "rich_text_about"];
  nodes.page_home.seo_description = "";
  nodes.image_share = {
    id: "image_share",
    type: "image",
    src: "share",
    alt: "",
    decorative: false,
    width: 300,
    height: 200,
    focus_x: 50,
    focus_y: 50,
  };
  nodes.page_home.share_image = { nodes: ["image_share"], marks: [], annotations: [] };
  nodes.image_favicon = {
    id: "image_favicon",
    type: "image",
    src: "logo",
    alt: "",
    decorative: false,
    width: 32,
    height: 32,
    focus_x: 50,
    focus_y: 50,
  };
  nodes.site_1.favicon = { nodes: ["image_favicon"], marks: [], annotations: [] };
  nodes.location_1.phone = "321 123";
  nodes.location_1.email = "objednavky";
  nodes.range_a = { id: "range_a", type: "time_range", opens: "08:00", closes: "13:00" };
  nodes.range_b = { id: "range_b", type: "time_range", opens: "12:00", closes: "07:00" };
  nodes.day_wed.ranges = { nodes: ["range_a", "range_b"], marks: [], annotations: [] };
  nodes.contact_1 = {
    id: "contact_1",
    type: "contact",
    heading: { content: "Kontakt", marks: [], annotations: [] },
    show_address: true,
    show_phone: false,
    show_email: false,
    show_map: true,
    location_id: "",
  };
  nodes.page_contact.blocks.nodes.push("contact_1");
  nodes.t_1 = {
    id: "t_1",
    type: "testimonial",
    quote: { content: "", marks: [], annotations: [] },
    name: { content: "", marks: [], annotations: [] },
    detail: { content: "", marks: [], annotations: [] },
    image: { nodes: [], marks: [], annotations: [] },
  };
  nodes.testimonials_1 = {
    id: "testimonials_1",
    type: "testimonials",
    heading: { content: "Reference", marks: [], annotations: [] },
    show: "all",
    chosen: { nodes: [], marks: [], annotations: [] },
  };
  nodes.site_1.testimonials = { nodes: ["t_1"], marks: [], annotations: [] };
  nodes.faq_1 = {
    id: "faq_1",
    type: "faq_item",
    question: { content: "Rozvážíte?", marks: [], annotations: [] },
    answer: { content: "", marks: [], annotations: [] },
  };
  nodes.site_1.faqs = { nodes: ["faq_1"], marks: [], annotations: [] };
  nodes.faq_ref_gone = { id: "faq_ref_gone", type: "item_ref", item_id: "faq_gone" };
  nodes.faq_block = {
    id: "faq_block",
    type: "faq",
    heading: { content: "Dotazy", marks: [], annotations: [] },
    show: "chosen",
    chosen: { nodes: ["faq_ref_gone"], marks: [], annotations: [] },
  };
  nodes.page_contact.blocks.nodes.push("faq_block");
  nodes.social_bad = { id: "social_bad", type: "social_link", url: "instagram.com/pekarna" };
  nodes.business_1.social = { nodes: ["social_bad"], marks: [], annotations: [] };
  nodes.cta_1 = {
    id: "cta_1",
    type: "call_to_action",
    heading: { content: "", marks: [], annotations: [] },
    text: { content: "", marks: [], annotations: [] },
    actions: { nodes: [], marks: [], annotations: [] },
  };
  nodes.page_contact.blocks.nodes.push("testimonials_1", "cta_1");
  Object.assign(nodes.theme_1, {
    color_primary: "#7fb2e5",
    color_secondary: "#3b3b3b",
    color_text: "zelená",
    font_heading: "Georgia, serif",
    content_width: "wide",
  });
  nodes.site_1.header_show_name = false;
  // Key figures and steps (figures-and-steps).
  nodes.figure_1 = { id: "figure_1", type: "figure", value: text(""), label: text("") };
  nodes.figure_2 = {
    id: "figure_2",
    type: "figure",
    value: text("více než tři sta milionů korun českých"),
    label: text("pod správou"),
  };
  nodes.figures_1 = {
    id: "figures_1",
    type: "figures",
    heading: text(""),
    items: { nodes: ["figure_1", "figure_2"], marks: [], annotations: [] },
  };
  nodes.step_1 = { id: "step_1", type: "step", title: text(""), text: text("") };
  nodes.steps_1 = {
    id: "steps_1",
    type: "steps",
    heading: text(""),
    items: { nodes: ["step_1"], marks: [], annotations: [] },
  };
  nodes.page_contact.blocks.nodes.push("figures_1", "steps_1");
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
      "no-description",
      "small-share-image",
      "small-favicon",
      "invalid-phone",
      "invalid-email",
      "invalid-hours",
      "nothing-to-show",
      "empty-quote",
      "empty-answer",
      "missing-item",
      "invalid-social-url",
      "invalid-color",
      "invalid-theme-value",
      "low-contrast",
      "name-without-logo",
      "empty-value",
      "empty-label",
      "long-figure",
      "empty-title",
    ]) {
      expect(codes, code).toContain(code);
    }
  });

  it.each(problems.map((p) => [p.code, p.message]))("%s: %s", (_code, message) => {
    for (const id of ids) expect(message, `node ID ${id}`).not.toMatch(new RegExp(`\\b${id}\\b`));
    expect(message).not.toMatch(/\bslug\b/i);
    expect(message).not.toMatch(
      /\b(seo_description|page_id|image_side|home_page_id|href|src|map_url|postal_code|hours_note|show_in_footer|business_type|opens|closes|time_range|opening_day|color_primary|color_secondary|color_background|color_text|font_heading|font_body|content_width|header_show_name|logo_item)\b/,
    );
  });
});
