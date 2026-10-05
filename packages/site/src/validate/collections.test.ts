import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../test/fixtures.js";
import { validateSite } from "./index.js";

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
const problems = (doc: unknown) =>
  validateSite(doc).problems.map((p) => [p.severity, p.code, p.nodeId, p.message]);

/** The demo site with two people, a testimonial and a question, each shown on "Kontakt". */
function site(): { doc: unknown; nodes: LooseNodes } {
  const { doc, nodes } = editableDemoSite();
  nodes.image_jana = {
    id: "image_jana",
    type: "image",
    src: "jana-1a2b",
    alt: "Jana Nováková",
    decorative: false,
    width: 600,
    height: 600,
  };
  nodes.person_jana = {
    id: "person_jana",
    type: "person",
    name: text("Jana Nováková"),
    role: text("Pekařka"),
    text: text(""),
    image: list(["image_jana"]),
  };
  nodes.testimonial_1 = {
    id: "testimonial_1",
    type: "testimonial",
    quote: text("Nejlepší chleba v Kolíně."),
    name: text("Petr"),
    detail: text(""),
    image: list([]),
  };
  nodes.faq_delivery = {
    id: "faq_delivery",
    type: "faq_item",
    question: text("Rozvážíte?"),
    answer: text("Ano, po Kolíně zdarma."),
  };
  nodes.faq_order = {
    id: "faq_order",
    type: "faq_item",
    question: text("Do kdy objednat dort?"),
    answer: text("Tři dny předem."),
  };
  nodes.site_1.team = list(["person_jana"]);
  nodes.site_1.testimonials = list(["testimonial_1"]);
  nodes.site_1.faqs = list(["faq_delivery", "faq_order"]);
  for (const [id, type] of [
    ["team_1", "team"],
    ["testimonials_1", "testimonials"],
    ["faq_1", "faq"],
  ] as const) {
    nodes[id] = { id, type, heading: text(""), show: "all", chosen: list([]) };
    nodes.page_contact.blocks.nodes.push(id);
  }
  return { doc, nodes };
}

/** Makes the home page's services block show `itemIds` as chosen items. */
function choose(nodes: LooseNodes, itemIds: string[]): void {
  const refs = itemIds.map((item_id, i) => {
    const id = `ref_${i + 1}`;
    nodes[id] = { id, type: "item_ref", item_id };
    return id;
  });
  nodes.services_1.show = "chosen";
  nodes.services_1.chosen = list(refs);
}

describe("collections", () => {
  it("Valid collections", () => {
    expect(problems(site().doc)).toEqual([]);
  });

  it("Service without a name", () => {
    const { doc, nodes } = site();
    nodes.service_cakes.name = text(" ");
    expect(problems(doc)).toEqual([
      [
        "error",
        "empty-name",
        "service_cakes",
        "Service 3 needs a name; edit it in a services block on any page.",
      ],
    ]);
  });

  it("Question without an answer", () => {
    const { doc, nodes } = site();
    nodes.faq_order.answer = text("");
    expect(problems(doc)).toEqual([
      [
        "error",
        "empty-answer",
        "faq_order",
        "Question 2 needs its answer; edit it in a questions block on any page.",
      ],
    ]);
  });

  it("names a person's portrait by the person in image messages", () => {
    const { doc, nodes } = site();
    nodes.image_jana.alt = "";
    expect(problems(doc)).toEqual([
      ["error", "missing-alt", "image_jana", expect.stringContaining("in Person 1")],
    ]);
  });

  it("Item inside a block", () => {
    const { doc, nodes } = site();
    nodes.services_1.show = "chosen";
    nodes.services_1.chosen = list(["service_bread"]);
    expect(problems(doc).map(([, code, id]) => [code, id])).toContainEqual([
      "disallowed-type",
      "services_1",
    ]);
  });
});

describe("collection blocks", () => {
  it("Highlights on the home page", () => {
    const { doc, nodes } = site();
    choose(nodes, ["service_cakes", "service_bread"]);
    expect(problems(doc)).toEqual([]);
  });

  it("Reference to a deleted item", () => {
    const { doc, nodes } = site();
    choose(nodes, ["service_gone"]);
    expect(problems(doc)).toEqual([
      [
        "error",
        "missing-item",
        "ref_1",
        'The services block on "Úvod" shows an item that no longer exists; remove it from the block.',
      ],
    ]);
  });

  it("Reference to another collection", () => {
    const { doc, nodes } = site();
    choose(nodes, ["person_jana"]);
    expect(problems(doc).map(([, code, id]) => [code, id])).toEqual([
      ["wrong-collection", "ref_1"],
    ]);
  });

  it("Same item twice", () => {
    const { doc, nodes } = site();
    choose(nodes, ["service_bread", "service_bread"]);
    expect(problems(doc).map(([, code, id]) => [code, id])).toEqual([["duplicate-item", "ref_2"]]);
  });

  it("All of an empty collection", () => {
    const { doc, nodes } = site();
    nodes.site_1.faqs = list([]);
    delete nodes.faq_delivery;
    delete nodes.faq_order;
    const result = validateSite(doc);
    expect(result.valid).toBe(true);
    expect(problems(doc)).toEqual([
      [
        "warning",
        "empty-block",
        "faq_1",
        'The questions block on "Kontakt" has nothing to show yet; add the first one in the block.',
      ],
    ]);
  });

  it("warns about a block with no chosen items", () => {
    const { doc, nodes } = site();
    choose(nodes, []);
    expect(problems(doc)).toEqual([
      ["warning", "empty-block", "services_1", 'The services block on "Úvod" is empty.'],
    ]);
  });

  it("refuses chosen items in a block that shows all", () => {
    const { doc, nodes } = site();
    choose(nodes, ["service_bread"]);
    nodes.services_1.show = "all";
    expect(problems(doc).map(([, code, id]) => [code, id])).toEqual([
      ["chosen-items-unused", "services_1"],
    ]);
    expect(validateSite(doc).problems[0]?.category).toBe("site");
  });
});

describe("social profiles", () => {
  const withProfiles = (...urls: string[]) => {
    const { doc, nodes } = site();
    nodes.business_1.social = list(
      urls.map((url, i) => {
        const id = `social_${i + 1}`;
        nodes[id] = { id, type: "social_link", url };
        return id;
      }),
    );
    return doc;
  };

  it("Instagram profile", () => {
    expect(problems(withProfiles("https://www.instagram.com/pekarnaulipy"))).toEqual([]);
  });

  it("Profile without https", () => {
    expect(problems(withProfiles("http://facebook.com/pekarna"))).toEqual([
      [
        "error",
        "invalid-social-url",
        "social_1",
        "Social profile 1 must be a link starting with https://, like https://www.instagram.com/your-business.",
      ],
    ]);
  });

  it("warns about the same profile twice", () => {
    const doc = withProfiles("https://x.com/pekarna", "https://x.com/pekarna");
    expect(problems(doc).map(([severity, code, id]) => [severity, code, id])).toEqual([
      ["warning", "duplicate-social-url", "social_2"],
    ]);
  });
});
