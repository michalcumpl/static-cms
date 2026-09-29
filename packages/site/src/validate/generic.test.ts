import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../test/fixtures.js";
import { validateSite } from "./index.js";

function problemsOf(input: unknown) {
  return validateSite(input).problems;
}

describe("validateSite: structure", () => {
  it("rejects input that is not a document", () => {
    for (const input of [null, [], "site", { nodes: {} }, { document_id: "site_1" }]) {
      expect(problemsOf(input).map((p) => p.code)).toEqual(["invalid-document"]);
    }
  });

  it("accepts the demo site without problems", () => {
    const { doc } = editableDemoSite();
    expect(validateSite(doc)).toEqual({ valid: true, problems: [] });
  });

  it("reports a key and id mismatch for the stored key", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.id = "hero_2";
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ severity: "error", code: "id-mismatch", nodeId: "hero_1" }),
    );
  });

  it("reports unknown node types", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.type = "carousel";
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "unknown-type", nodeId: "hero_1" }),
    );
  });

  it.each(["1_page", "page.1", "page__1", ""])("reports invalid identifier %j", (id) => {
    const { doc, nodes } = editableDemoSite();
    nodes[id] = { id, type: "strong" };
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "invalid-id", nodeId: id }),
    );
  });

  it("reports a dangling reference by name", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_home.blocks.nodes.push("services_9");
    const problem = problemsOf(doc).find((p) => p.code === "missing-reference");
    expect(problem).toMatchObject({ nodeId: "page_home", property: "blocks" });
    expect(problem?.message).toContain("services_9");
  });

  it("reports a disallowed child type", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_home.blocks.nodes.push("nav_home");
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "disallowed-type", nodeId: "page_home", property: "blocks" }),
    );
  });

  it("reports a missing root", () => {
    const { doc } = editableDemoSite();
    doc.document_id = "site_9";
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "missing-reference", nodeId: "site_9" }),
    );
  });

  it("warns about unreachable nodes without making the document invalid", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_2 = { ...nodes.hero_1, id: "hero_2" };
    const result = validateSite(doc);
    expect(result.valid).toBe(true);
    expect(result.problems).toEqual([
      expect.objectContaining({ severity: "warning", code: "unreachable-node", nodeId: "hero_2" }),
    ]);
  });

  it("reports reference cycles", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.rich_text_about.body.nodes.push("rich_text_about");
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "cycle", nodeId: "rich_text_about" }),
    );
  });

  it("reports property values of the wrong shape", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.heading = "Čerstvý chléb";
    nodes.sub_about.level = 4;
    nodes.image_hero.decorative = "no";
    const problems = problemsOf(doc).filter((p) => p.code === "invalid-value");
    expect(problems.map((p) => `${p.nodeId}.${p.property}`)).toEqual([
      "image_hero.decorative",
      "hero_1.heading",
      "sub_about.level",
    ]);
  });

  it("reports a mark whose end exceeds its text", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.para_about.content.marks[0].end_offset = 999;
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "invalid-range", nodeId: "para_about", property: "content" }),
    );
  });

  it("reports overlapping marks", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.emphasis_x = { id: "emphasis_x", type: "emphasis" };
    nodes.para_about.content.marks.push({ start_offset: 3, end_offset: 12, node_id: "emphasis_x" });
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "overlapping-marks", nodeId: "para_about" }),
    );
  });

  it("reports marks of a type the property does not allow", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.link_x = { id: "link_x", type: "link", href: "https://example.com" };
    nodes.hero_1.heading.marks.push({ start_offset: 0, end_offset: 3, node_id: "link_x" });
    expect(problemsOf(doc)).toContainEqual(
      expect.objectContaining({ code: "disallowed-type", nodeId: "hero_1", property: "heading" }),
    );
  });

  it("measures mark offsets in grapheme clusters, like Svedit", () => {
    const { doc, nodes } = editableDemoSite();
    // "👋🏽 Ahoj" is 6 graphemes but 9 UTF-16 code units.
    nodes.para_about.content = {
      content: "👋🏽 Ahoj",
      marks: [{ start_offset: 2, end_offset: 6, node_id: "strong_about" }],
      annotations: [],
    };
    expect(problemsOf(doc).filter((p) => p.code === "invalid-range")).toEqual([]);

    nodes.para_about.content.marks[0].end_offset = 7;
    expect(problemsOf(doc).map((p) => p.code)).toContain("invalid-range");
  });

  it("reports all problems together", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.id = "hero_2";
    nodes.page_home.blocks.nodes.push("services_9");
    nodes.para_about.content.marks[0].end_offset = 999;
    const codes = problemsOf(doc).map((p) => p.code);
    expect(codes).toEqual(
      expect.arrayContaining(["id-mismatch", "missing-reference", "invalid-range"]),
    );
  });
});
