import { describe, expect, it } from "vitest";
import { editableImageBlocksSite } from "../testing.js";
import { validateSite } from "./index.js";

// Items taken out of a list stay in `nodes`; their unreachable-node warnings aren't the point here.
const relevant = (doc: unknown) =>
  validateSite(doc).problems.filter((p) => p.code !== "unreachable-node");
const problems = (doc: unknown) =>
  relevant(doc)
    .map((p) => [p.severity, p.code, p.nodeId])
    .sort();

describe("image blocks", () => {
  it("accepts a page with one block of each type", () => {
    const { doc } = editableImageBlocksSite();
    expect(validateSite(doc).problems).toEqual([]);
  });

  it("refuses an unknown image side", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.twi_voucher.image_side = "top";
    expect(problems(doc)).toContainEqual(["error", "invalid-value", "twi_voucher"]);
  });

  it("requires a description for gallery photos", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.image_gallery_2.alt = "";
    expect(problems(doc)).toEqual([["error", "missing-alt", "image_gallery_2"]]);
  });

  it("describes a logo by its name, without alt text of its own", () => {
    const { doc, nodes } = editableImageBlocksSite();
    expect(nodes.image_logo_harmonie.alt).toBe("");
    expect(nodes.image_logo_harmonie.decorative).toBe(false);
    expect(validateSite(doc).problems).toEqual([]);
  });

  it("requires names for people and logos", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.person_martina.name.content = " ";
    nodes.logo_p6.name.content = "";
    const found = validateSite(doc).problems;
    expect(found.map((p) => [p.code, p.nodeId, p.category])).toEqual([
      ["empty-name", "logo_p6", "site"],
      ["empty-name", "person_martina", "site"],
    ]);
    expect(found[0]?.message).toContain("description");
    expect(found[1]?.message).toBe("Person 2 needs a name; edit it in About you.");
  });

  it("warns about empty galleries, teams and logo rows, and stays valid", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.gallery_work.items.nodes = [];
    nodes.site_1.team.nodes = [];
    for (const id of ["person_katerina", "person_martina", "image_katerina"]) delete nodes[id];
    nodes.logos_1.items.nodes = [];
    expect(validateSite(doc).valid).toBe(true);
    expect(problems(doc)).toEqual([
      ["warning", "empty-block", "gallery_work"],
      ["warning", "empty-block", "logos_1"],
      ["warning", "empty-block", "team_1"],
    ]);
  });

  it("requires an image in every gallery photo and logo", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.gallery_item_1.image.nodes = [];
    nodes.logo_harmonie.image.nodes = [];
    // As the editor does: an image taken out of its item is deleted with it.
    delete nodes.image_gallery_1;
    delete nodes.image_logo_harmonie;
    expect(problems(doc)).toEqual([
      ["error", "missing-image", "gallery_item_1"],
      ["error", "missing-image", "logo_harmonie"],
    ]);
  });

  it("checks logo links: an existing page, a safe address, not both", () => {
    const { doc, nodes } = editableImageBlocksSite();
    nodes.logo_p6.page_id = "page_gone";
    nodes.logo_harmonie.url = "javascript:alert(1)";
    expect(problems(doc)).toEqual(
      [
        ["error", "missing-page", "logo_p6"],
        ["error", "unsafe-link", "logo_harmonie"],
      ].sort(),
    );
    const both = editableImageBlocksSite();
    both.nodes.logo_harmonie.page_id = "page_home";
    expect(problems(both.doc)).toContainEqual(["error", "invalid-value", "logo_harmonie"]);
  });

  it("counts image block headings as level 2 headings", () => {
    const { doc, nodes } = editableImageBlocksSite();
    // A level 3 subheading after the gallery's heading is fine.
    nodes.sub_after = {
      id: "sub_after",
      type: "subheading",
      content: { content: "Více", marks: [], annotations: [] },
      level: 3,
    };
    nodes.rt_after = {
      id: "rt_after",
      type: "rich_text",
      body: { nodes: ["sub_after"], marks: [], annotations: [] },
    };
    nodes.page_gallery.blocks.nodes = ["gallery_work", "rt_after"];
    expect(relevant(doc)).toEqual([]);
  });
});
