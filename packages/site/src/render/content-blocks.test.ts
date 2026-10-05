import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { usedMediaFiles } from "../images.js";
import { editableDemoSite } from "../test/fixtures.js";
import { renderSite } from "./index.js";

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

/** The page "Kontakt" with a call to action and testimonials (one with a photo). */
function site() {
  const { doc, nodes } = editableDemoSite();
  nodes.btn_order = {
    id: "btn_order",
    type: "page_link",
    label: text("Objednat"),
    page_id: "page_contact",
  };
  nodes.btn_call = {
    id: "btn_call",
    type: "external_link",
    label: text("Zavolat"),
    url: "tel:+420321123456",
  };
  nodes.cta_1 = {
    id: "cta_1",
    type: "call_to_action",
    heading: text("Upečeme vám dort"),
    text: text(""),
    actions: list(["btn_order", "btn_call"]),
  };
  nodes.photo_jana = {
    id: "photo_jana",
    type: "image",
    src: "jana-1a2b",
    alt: "",
    decorative: true,
    width: 600,
    height: 600,
  };
  nodes.t_jana = {
    id: "t_jana",
    type: "testimonial",
    quote: text("Nejlepší chleba v Kolíně."),
    name: text("Jana Nováková"),
    detail: text("zákaznice od roku 2015"),
    image: list([]),
  };
  nodes.t_petr = {
    id: "t_petr",
    type: "testimonial",
    quote: text("Dort na svatbu byl skvělý."),
    name: text("Petr"),
    detail: text(""),
    image: list(["photo_jana"]),
  };
  nodes.testimonials_1 = {
    id: "testimonials_1",
    type: "testimonials",
    heading: text("Co o nás říkají"),
    show: "all",
    chosen: list([]),
  };
  nodes.site_1.testimonials = list(["t_jana", "t_petr"]);
  nodes.page_contact.blocks.nodes.push("cta_1", "testimonials_1");
  return { doc, nodes };
}

function contactPage(doc: unknown): string {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.pages.find((p) => p.path === "kontakt/index.html")?.html ?? "";
}

const section = (html: string, cls: string) => {
  const start = html.indexOf(`<section class="block ${cls}">`);
  return html.slice(start, html.indexOf("</section>", start));
};

describe("call to action", () => {
  it("renders the heading and two buttons, the second secondary", () => {
    const cta = section(contactPage(site().doc), "cta");
    expect(cta).toContain("<h2>Upečeme vám dort</h2>");
    expect(cta).toContain('<a class="button" href="/kontakt/">Objednat</a>');
    expect(cta).toContain(
      '<a class="button button-secondary" href="tel:+420321123456">Zavolat</a>',
    );
    expect(cta).not.toContain("cta-text");
  });

  it("renders its text when it has one", () => {
    const { doc, nodes } = site();
    nodes.cta_1.text = text("Na objednávku do tří dnů.");
    expect(section(contactPage(doc), "cta")).toContain(
      '<p class="cta-text">Na objednávku do tří dnů.</p>',
    );
  });
});

describe("testimonials", () => {
  it("renders each testimonial as a figure with a quote and caption", () => {
    const html = section(contactPage(site().doc), "testimonials");
    expect(html).toContain("<h2>Co o nás říkají</h2>");
    expect(html).toMatch(
      /<figure class="testimonial">\s*<blockquote><p>Nejlepší chleba v Kolíně\.<\/p><\/blockquote>\s*<figcaption>\s*<span class="testimonial-name">Jana Nováková<\/span>\s*<span class="testimonial-detail">zákaznice od roku 2015<\/span>/,
    );
  });

  it("shows a photo with its size and lazy loading", () => {
    const html = section(contactPage(site().doc), "testimonials");
    expect(html).toMatch(/<img [^>]*class="testimonial-photo"[^>]*>/);
    expect(html).toContain('sizes="4rem"');
    expect(html).toContain('loading="lazy"');
  });

  it("puts photos among the media files the site uses", () => {
    expect(usedMediaFiles(site().doc)).toContain("jana-1a2b-600.webp");
  });
});

describe("a page with both blocks", () => {
  it("passes html-validate", async () => {
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    const report = await validator.validateString(contactPage(site().doc));
    const messages = report.results.flatMap((r) =>
      r.messages.map((m) => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`),
    );
    expect(messages).toEqual([]);
  });
});
