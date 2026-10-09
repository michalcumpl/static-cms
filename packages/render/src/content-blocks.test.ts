import { usedMediaFiles } from "@webmio/model";
import { editableDemoSite } from "@webmio/model/testing";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
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
    hidden: false,
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
    focus_x: 50,
    focus_y: 50,
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
    hidden: false,
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

describe("focal points", () => {
  it("are styled only on the page that shows them", () => {
    const { doc, nodes } = site();
    nodes.photo_jana = { ...nodes.photo_jana, focus_x: 40, focus_y: 30 };
    const result = renderSite(doc);
    if (!result.ok) throw new Error("invalid");
    const pages = result.site.pages.map((p) => [p.path, p.html.includes("<style>")]);
    expect(pages).toEqual(pages.map(([path]) => [path, path === "kontakt/index.html"]));
    expect(result.site.notFound).not.toContain("<style>");
  });
});

describe("a page with both blocks", () => {
  it("passes html-validate, with a photo framed off-centre", async () => {
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    const { doc, nodes } = site();
    nodes.photo_jana = { ...nodes.photo_jana, focus_x: 40, focus_y: 30 };
    const page = contactPage(doc);
    expect(page).toContain("<style>.focus-40-30{object-position:40% 30%}</style>\n  </head>");
    expect(page).toMatch(/<img class="testimonial-photo focus-40-30"/);
    const report = await validator.validateString(page);
    const messages = report.results.flatMap((r) =>
      r.messages.map((m) => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`),
    );
    expect(messages).toEqual([]);
  });
});

/** "Kontakt" with key figures (with or without a heading) and three steps. */
function figuresAndSteps(heading = "") {
  const { doc, nodes } = editableDemoSite();
  const figures = [
    ["10+ let", "na trhu"],
    ["40+", "zemí našich klientů"],
    ["300 mil. Kč", "pod správou"],
  ].map(([value, label], i) => {
    const id = `fig_${i + 1}`;
    nodes[id] = { id, type: "figure", value: text(value ?? ""), label: text(label ?? "") };
    return id;
  });
  nodes.figures_1 = {
    id: "figures_1",
    type: "figures",
    hidden: false,
    heading: text(heading),
    items: list(figures),
  };
  const steps = [
    ["Posouzení", "Projdeme vaše příjmy a plány."],
    ["Žádost", ""],
    ["Schválení", "Až do čerpání."],
  ].map(([title, body], i) => {
    const id = `step_${i + 1}`;
    nodes[id] = { id, type: "step", title: text(title ?? ""), text: text(body ?? "") };
    return id;
  });
  // Bold on "příjmy", as the editor marks it.
  nodes.strong_income = { id: "strong_income", type: "strong" };
  nodes.step_1.text.marks = [{ start_offset: 14, end_offset: 20, node_id: "strong_income" }];
  nodes.steps_1 = {
    id: "steps_1",
    type: "steps",
    hidden: false,
    heading: text("Jak to funguje"),
    items: list(steps),
  };
  nodes.page_contact.blocks.nodes.push("figures_1", "steps_1");
  return doc;
}

describe("key figures (figures-and-steps)", () => {
  it("renders each figure's value and label in their own elements", () => {
    const html = section(contactPage(figuresAndSteps()), "figures");
    expect(html).not.toContain("<h2>");
    expect(html).toMatch(
      /<ul class="figure-list figure-columns-3">\s*<li class="figure">\s*<p class="figure-value">10\+ let<\/p>\s*<p class="figure-label">na trhu<\/p>/,
    );
    expect(html.match(/class="figure"/g)).toHaveLength(3);
  });

  it("renders its heading when it has one", () => {
    expect(section(contactPage(figuresAndSteps("V číslech")), "figures")).toContain(
      "<h2>V číslech</h2>",
    );
  });
});

describe("steps (figures-and-steps)", () => {
  it("Steps markup: a heading and an ordered list of titled steps", () => {
    const html = section(contactPage(figuresAndSteps()), "steps");
    expect(html).toContain("<h2>Jak to funguje</h2>");
    expect(html).toContain('<ol class="step-list">');
    expect(html.match(/<h3 class="step-title">/g)).toHaveLength(3);
    expect(html).toContain(
      '<p class="step-text">Projdeme vaše <strong>příjmy</strong> a plány.</p>',
    );
  });

  it("leaves out an empty text", () => {
    const html = section(contactPage(figuresAndSteps()), "steps");
    expect(html).toMatch(/<h3 class="step-title">Žádost<\/h3>\s*<\/li>/);
  });

  it("passes html-validate with both blocks", async () => {
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    const report = await validator.validateString(contactPage(figuresAndSteps("V číslech")));
    const messages = report.results.flatMap((r) =>
      r.messages.map((m) => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`),
    );
    expect(messages).toEqual([]);
  });
});

describe("figure columns", () => {
  it("puts up to four figures in one row, and five or six in rows of three", async () => {
    const { figureColumns } = await import("./blocks.js");
    expect([1, 2, 3, 4, 5, 6].map(figureColumns)).toEqual([1, 2, 3, 4, 3, 3]);
  });
});
