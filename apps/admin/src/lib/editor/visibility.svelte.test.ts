import { renderSite } from "@webmio/render";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";
import { selectedVisibility, setBlockHidden } from "./visibility";

// Showing and hiding blocks (template-system, site-editing delta).

function setup() {
  const { session } = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p"),
  );
  const hidden = (id: string) => (session.get(id) as { hidden: boolean }).hidden;
  return { session, hidden };
}

const home = ["site_1", "pages", 0, "blocks"];
const aboutParagraph = [...home, 2, "body", 1, "content"];

describe("showing and hiding blocks", () => {
  it("offers the switch for the selected block, and for the block holding the caret", () => {
    const { session } = setup();
    session.selection = { type: "node", path: home, anchor_offset: 1, focus_offset: 2 };
    expect(selectedVisibility(session)).toEqual({
      id: "services_1",
      type: "services",
      hidden: false,
    });
    session.selection = { type: "text", path: aboutParagraph, anchor_offset: 0, focus_offset: 0 };
    expect(selectedVisibility(session)).toMatchObject({ id: "rich_text_about", hidden: false });
    session.selection = null as never;
    expect(selectedVisibility(session)).toBeUndefined();
  });

  // The scenario's testimonials, with the demo site's services block.
  it("Hide a block: hidden in one step, off the preview, and undo shows it again", () => {
    const { session, hidden } = setup();
    setBlockHidden(session, "services_1", true);
    expect(hidden("services_1")).toBe(true);
    const preview = renderSite(session.doc);
    if (!preview.ok) throw new Error("render failed");
    expect(preview.site.pages[0]?.html).not.toContain("Co pečeme");
    session.undo();
    expect(hidden("services_1")).toBe(false);
  });

  it("shows a hidden block again in one step", () => {
    const { session, hidden } = setup();
    setBlockHidden(session, "hero_1", true);
    setBlockHidden(session, "hero_1", false);
    expect(hidden("hero_1")).toBe(false);
    session.undo();
    expect(hidden("hero_1")).toBe(true);
  });

  it("Edit a hidden block: typing changes the text and the block stays hidden", () => {
    const { session, hidden } = setup();
    setBlockHidden(session, "rich_text_about", true);
    session.selection = { type: "text", path: aboutParagraph, anchor_offset: 0, focus_offset: 0 };
    session.apply(session.tr.insert_text("Nově: "));
    const text = (session.get(aboutParagraph) as { content: string }).content;
    expect(text.startsWith("Nově: ")).toBe(true);
    expect(hidden("rich_text_about")).toBe(true);
  });

  it("does nothing for a node that isn't a block", () => {
    const { session } = setup();
    const before = structuredClone(session.doc);
    setBlockHidden(session, "theme_1", true);
    expect(session.doc).toEqual(before);
  });
});
