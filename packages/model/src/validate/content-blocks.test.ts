import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../testing.js";
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
    hidden: false,
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
    focus_x: 50,
    focus_y: 50,
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
    hidden: false,
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
      ["empty-quote", "t_petr", "Testimonial 2 needs its quote; edit it in About you."],
      ["empty-name", "t_petr", "Testimonial 2 needs the person's name; edit it in About you."],
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

describe("key figures and steps (figures-and-steps)", () => {
  /** The demo's home page with a figures block and, on "Kontakt", a steps block. */
  function withBlocks(figureCount = 3) {
    const { doc, nodes } = editableDemoSite();
    const figureIds = Array.from({ length: figureCount }, (_, i) => {
      const id = `fig_${i + 1}`;
      nodes[id] = { id, type: "figure", value: text(`${i + 1}0+`), label: text("let") };
      return id;
    });
    nodes.figures_1 = {
      id: "figures_1",
      type: "figures",
      hidden: false,
      heading: text(""),
      items: list(figureIds),
    };
    nodes.page_home.blocks.nodes.push("figures_1");
    const stepIds = ["Posouzení", "Žádost", "Schválení"].map((title, i) => {
      const id = `step_${i + 1}`;
      nodes[id] = { id, type: "step", title: text(title), text: text("") };
      return id;
    });
    nodes.steps_1 = {
      id: "steps_1",
      type: "steps",
      hidden: false,
      heading: text("Jak to funguje"),
      items: list(stepIds),
    };
    nodes.page_contact.blocks.nodes.push("steps_1");
    return { doc, nodes };
  }
  const found = (doc: unknown, code: string) =>
    validateSite(doc).problems.filter((p) => p.code === code);

  it("Valid figures and steps", () => {
    const { doc } = withBlocks();
    expect(validateSite(doc).problems.filter((p) => p.severity === "error")).toEqual([]);
  });

  it("Figure without a label", () => {
    const { doc, nodes } = withBlocks();
    nodes.fig_2.value = text("40+");
    nodes.fig_2.label = text("");
    expect(found(doc, "empty-label")).toEqual([
      expect.objectContaining({
        nodeId: "fig_2",
        severity: "error",
        message: 'Figure 2 on "Úvod" needs its label.',
      }),
    ]);
  });

  it("a figure without its number", () => {
    const { doc, nodes } = withBlocks();
    nodes.fig_1.value = text(" ");
    expect(found(doc, "empty-value")[0]).toMatchObject({ nodeId: "fig_1", property: "value" });
  });

  it("Seven figures", () => {
    const { doc } = withBlocks(7);
    expect(found(doc, "too-many-items")).toEqual([
      expect.objectContaining({ nodeId: "figures_1", severity: "error" }),
    ]);
    expect(found(withBlocks(6).doc, "too-many-items")).toEqual([]);
  });

  it("Long value", () => {
    const { doc, nodes } = withBlocks();
    nodes.fig_3.value = text("více než tři sta milionů korun českých");
    const [warning] = found(doc, "long-figure");
    expect(warning).toMatchObject({ nodeId: "fig_3", severity: "warning" });
    expect(validateSite(doc).problems.filter((p) => p.severity === "error")).toEqual([]);
  });

  it("Steps without a heading", () => {
    const { doc, nodes } = withBlocks();
    nodes.steps_1.heading = text("");
    expect(found(doc, "empty-heading")[0]).toMatchObject({
      nodeId: "steps_1",
      severity: "error",
      message: expect.stringContaining('"Kontakt"'),
    });
  });

  it("a step without a title", () => {
    const { doc, nodes } = withBlocks();
    nodes.step_2.title = text("");
    expect(found(doc, "empty-title")[0]).toMatchObject({
      nodeId: "step_2",
      message: 'Step 2 on "Kontakt" needs its title.',
    });
  });

  it("warns about empty blocks", () => {
    const { doc, nodes } = withBlocks();
    nodes.figures_1.items = list([]);
    nodes.steps_1.items = list([]);
    expect(found(doc, "empty-block").map((p) => [p.nodeId, p.severity])).toEqual(
      expect.arrayContaining([
        ["figures_1", "warning"],
        ["steps_1", "warning"],
      ]),
    );
  });
});

describe("block variants (block-variants)", () => {
  it("Full-photo hero", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.layout = "cover";
    expect(validateSite(doc).problems.filter((p) => p.code === "cover-without-image")).toEqual([]);
  });

  it("Full-photo hero without a photo", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.layout = "cover";
    nodes.hero_1.image = list([]);
    const problems = validateSite(doc).problems;
    expect(problems.find((p) => p.code === "cover-without-image")).toMatchObject({
      nodeId: "hero_1",
      severity: "warning",
    });
    expect(problems.filter((p) => p.severity === "error")).toEqual([]);
  });

  it("Unknown layout", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.services_1.layout = "grid";
    expect(validateSite(doc).problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid-value", nodeId: "services_1", severity: "error" }),
      ]),
    );
  });
});
