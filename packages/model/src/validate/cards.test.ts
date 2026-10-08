import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../testing.js";
import { validateSite } from "./index.js";

// The cards block (cards, site-document delta).

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/** The demo site with a cards block of `count` titled cards at the top of "Kontakt". */
function site(count = 3, props: Record<string, unknown> = {}) {
  const { doc, nodes } = editableDemoSite();
  const ids = Array.from({ length: count }, (_, i) => card(nodes, i + 1));
  nodes.cards_1 = {
    id: "cards_1",
    type: "cards",
    heading: text(""),
    layout: "below",
    items: list(ids),
    ...props,
  };
  nodes.page_contact.blocks.nodes.unshift("cards_1");
  return { doc, nodes };
}

function card(nodes: LooseNodes, n: number, props: Record<string, unknown> = {}): string {
  const id = `card_${n}`;
  nodes[id] = {
    id,
    type: "card",
    image: list(),
    title: text(`Karta ${n}`),
    text: text(""),
    target_id: "",
    url: "",
    ...props,
  };
  return id;
}

const problems = (doc: unknown) =>
  validateSite(doc).problems.map((p) => ({
    code: p.code,
    severity: p.severity,
    message: p.message,
  }));

describe("cards", () => {
  it("Cards block", () => {
    const { doc, nodes } = site();
    nodes.card_1.image = list(["image_hero"]);
    nodes.card_2.target_id = "page_home";
    expect(problems(doc)).toEqual([]);
  });

  it("Category tiles", () => {
    const { doc, nodes } = site(4, { layout: "over" });
    for (let n = 1; n <= 4; n++) {
      nodes[`img_${n}`] = { ...nodes.image_hero, id: `img_${n}` };
      Object.assign(nodes[`card_${n}`], { image: list([`img_${n}`]), target_id: "page_home" });
    }
    expect(problems(doc)).toEqual([]);
  });

  it("Card without a title", () => {
    const { doc, nodes } = site();
    nodes.card_2.title = text(" ");
    expect(problems(doc)).toEqual([
      { code: "empty-title", severity: "error", message: 'Card 2 on "Kontakt" needs a title.' },
    ]);
  });

  it("Link to a project without a page", () => {
    const { doc, nodes } = site();
    nodes.project_1 = {
      id: "project_1",
      type: "project",
      name: text("PETROF 160"),
      category_id: "",
      summary: text(""),
      body: list(),
      facts: list(),
      cover: list(["image_hero"]),
      photos: list(),
      video_url: "",
      slug: "petrof-160",
    };
    nodes.site_1.projects = list(["project_1"]);
    nodes.card_1.target_id = "project_1";
    expect(problems(doc)).toEqual([
      expect.objectContaining({ code: "broken-card-link", severity: "warning" }),
    ]);
    expect(validateSite(doc).valid).toBe(true);
    // With a listing page, the project has a page and the link is fine.
    nodes.site_1.projects_page_id = "page_contact";
    expect(problems(doc)).toEqual([]);
  });

  it("Unsafe address", () => {
    const { doc, nodes } = site();
    nodes.card_1.url = "javascript:alert(1)";
    expect(problems(doc)).toEqual([expect.objectContaining({ code: "unsafe-link" })]);
  });

  it("Thirteen cards", () => {
    const { doc } = site(13);
    expect(problems(doc)).toEqual([
      expect.objectContaining({ code: "too-many-items", severity: "error" }),
    ]);
  });

  it("reports a page and an address on one card, a deleted page, and no cards", () => {
    const both = site();
    Object.assign(both.nodes.card_1, { target_id: "page_home", url: "https://example.org" });
    expect(problems(both.doc)).toEqual([expect.objectContaining({ code: "invalid-value" })]);
    const gone = site();
    gone.nodes.card_1.target_id = "page_gone";
    expect(problems(gone.doc)).toEqual([expect.objectContaining({ code: "broken-card-link" })]);
    const none = site(0);
    expect(problems(none.doc)).toEqual([
      expect.objectContaining({ code: "empty-block", severity: "error" }),
    ]);
  });
});
