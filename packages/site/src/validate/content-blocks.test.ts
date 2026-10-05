import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../test/fixtures.js";
import { validateSite } from "./index.js";

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

function button(nodes: LooseNodes, id: string, label: string, pageId = "page_contact") {
  nodes[id] = { id, type: "page_link", label: text(label), page_id: pageId };
  return id;
}

/** The demo's home page with a call to action and a testimonials block after its blocks. */
function site() {
  const { doc, nodes } = editableDemoSite();
  nodes.cta_1 = {
    id: "cta_1",
    type: "call_to_action",
    heading: text("Upečeme vám dort"),
    text: text("Na objednávku do tří dnů."),
    actions: list([
      button(nodes, "cta_btn_order", "Objednat"),
      button(nodes, "cta_btn_call", "Zavolat"),
    ]),
  };
  nodes.photo_jana = {
    id: "photo_jana",
    type: "image",
    src: "jana-1a2b",
    alt: "",
    decorative: true,
    width: 400,
    height: 400,
  };
  nodes.t_jana = {
    id: "t_jana",
    type: "testimonial",
    quote: text("Nejlepší chleba v Kolíně."),
    name: text("Jana Nováková"),
    detail: text("zákaznice od roku 2015"),
    image: list(["photo_jana"]),
  };
  nodes.t_petr = {
    id: "t_petr",
    type: "testimonial",
    quote: text("Dort na svatbu byl skvělý."),
    name: text("Petr"),
    detail: text(""),
    image: list([]),
  };
  nodes.testimonials_1 = {
    id: "testimonials_1",
    type: "testimonials",
    heading: text("Co o nás říkají"),
    show: "all",
    chosen: list([]),
  };
  nodes.site_1.testimonials = list(["t_jana", "t_petr"]);
  nodes.page_home.blocks.nodes.push("cta_1", "testimonials_1");
  return { doc, nodes };
}

const problems = (doc: unknown) => validateSite(doc).problems;

describe("call to action and testimonials", () => {
  it("are valid when filled in", () => {
    expect(problems(site().doc)).toEqual([]);
  });

  it("need a heading on the call to action", () => {
    const { doc, nodes } = site();
    nodes.cta_1.heading = text(" ");
    expect(problems(doc)).toEqual([
      expect.objectContaining({
        code: "empty-heading",
        nodeId: "cta_1",
        message: 'The call to action on "Úvod" needs a heading.',
      }),
    ]);
  });

  it("allow at most two buttons", () => {
    const { doc, nodes } = site();
    nodes.cta_1.actions.nodes.push(button(nodes, "cta_btn_third", "Další"));
    expect(problems(doc)).toEqual([
      expect.objectContaining({ code: "too-many-items", nodeId: "cta_1", property: "actions" }),
    ]);
  });

  it("warn about a call to action without buttons", () => {
    const { doc, nodes } = site();
    nodes.cta_1.actions = list([]);
    delete nodes.cta_btn_order;
    delete nodes.cta_btn_call;
    const result = validateSite(doc);
    expect(result.valid).toBe(true);
    expect(result.problems).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "empty-block",
        message: 'The call to action on "Úvod" has no button.',
      }),
    ]);
  });

  it("need a quote and a name on every testimonial", () => {
    const { doc, nodes } = site();
    nodes.t_petr.quote = text("");
    nodes.t_petr.name = text("");
    expect(problems(doc).map((p) => [p.code, p.nodeId, p.message])).toEqual([
      [
        "empty-quote",
        "t_petr",
        "Testimonial 2 needs its quote; edit it in a testimonials block on any page.",
      ],
      [
        "empty-name",
        "t_petr",
        "Testimonial 2 needs the person's name; edit it in a testimonials block on any page.",
      ],
    ]);
  });

  it("allow at most one photo, described or decorative", () => {
    const { doc, nodes } = site();
    nodes.photo_jana.decorative = false;
    nodes.photo_2 = { ...nodes.photo_jana, id: "photo_2", alt: "Petr" };
    nodes.t_jana.image.nodes.push("photo_2");
    expect(
      problems(doc)
        .map((p) => p.code)
        .sort(),
    ).toEqual(["missing-alt", "too-many-items"]);
  });

  it("warn about an empty testimonials block", () => {
    const { doc, nodes } = site();
    nodes.site_1.testimonials = list([]);
    for (const id of ["t_jana", "t_petr", "photo_jana"]) delete nodes[id];
    expect(problems(doc)).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "empty-block",
        nodeId: "testimonials_1",
      }),
    ]);
  });

  it("call a link to a removed page a button on its page", () => {
    const { doc, nodes } = site();
    nodes.cta_btn_call.page_id = "page_gone";
    expect(problems(doc)).toEqual([
      expect.objectContaining({
        code: "missing-page",
        nodeId: "cta_btn_call",
        message: 'A button on "Úvod" points to a page that no longer exists.',
      }),
    ]);
  });
});
