import { validateSite } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { imageBlocksSite } from "$lib/server/demo";
import { selectedLookBlock, setBlockLook } from "./looks";
import { EditorState } from "./state.svelte";
import { duplicateSelectedNode, insertBlockAt } from "./structure";

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function setup(pageId?: string) {
  const editor = new EditorState(
    { document: imageBlocksSite(), version: "v1", problems: [] },
    projectPaths("p"),
  );
  if (pageId) editor.showPage(pageId);
  const { session } = editor;
  const get = (id: string) => session.get(id) as AnyNode;
  const select = (path: (string | number)[], index: number) => {
    session.selection = { type: "node", path, anchor_offset: index, focus_offset: index + 1 };
  };
  return { session, get, select };
}

const blocksPath = (page: number) => ["site_1", "pages", page, "blocks"];
const errors = (doc: unknown) => validateSite(doc).problems.filter((p) => p.severity === "error");

describe("block looks", () => {
  it("offers the selected block's look, and sets it as one undo step", () => {
    const { session, get, select } = setup();
    select(blocksPath(0), 0);
    expect(selectedLookBlock(session)).toMatchObject({
      id: "hero_1",
      property: "layout",
      values: ["beside", "cover", "slideshow"],
      value: "beside",
      missingImage: false,
    });
    setBlockLook(session, "hero_1", "layout", "cover");
    expect(get("hero_1").layout).toBe("cover");
    session.undo();
    expect(get("hero_1").layout).toBe("beside");
  });

  it("finds the block holding the caret", () => {
    const { session } = setup();
    session.selection = {
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 1, "heading"],
      anchor_offset: 0,
      focus_offset: 0,
    };
    expect(selectedLookBlock(session)).toMatchObject({ id: "services_1", value: "cards" });
  });

  it("sets each block type's look", () => {
    const { session, get } = setup();
    setBlockLook(session, "services_1", "layout", "accordion");
    setBlockLook(session, "team_1", "layout", "list");
    setBlockLook(session, "gallery_work", "image_fit", "whole");
    expect(get("services_1").layout).toBe("accordion");
    expect(get("team_1").layout).toBe("list");
    expect(get("gallery_work").image_fit).toBe("whole");
    expect(errors(session.doc)).toEqual([]);
  });

  it("ignores a value the block doesn't have", () => {
    const { session, get } = setup();
    setBlockLook(session, "team_1", "layout", "accordion");
    setBlockLook(session, "hero_1", "image_fit", "whole");
    expect(get("team_1").layout).toBe("cards");
    expect(get("hero_1").image_fit).toBeUndefined();
  });

  it("notes a full-photo hero without a photo", () => {
    const { session, select } = setup();
    const tr = session.tr;
    tr.set(["hero_1", "image"], { nodes: [], marks: [], annotations: [] });
    session.apply(tr);
    setBlockLook(session, "hero_1", "layout", "cover");
    select(blocksPath(0), 0);
    expect(selectedLookBlock(session)?.missingImage).toBe(true);
  });

  it("has no look for other blocks", () => {
    const { session, select } = setup();
    select(blocksPath(0), 2);
    expect(selectedLookBlock(session)).toBeUndefined();
  });

  it("starts new blocks with the default look", () => {
    const { session, get } = setup("page_contact");
    const path = blocksPath(1);
    for (const type of ["gallery", "team", "services", "hero"] as const) {
      expect(insertBlockAt(session, path, 0, type)).toBe(true);
    }
    const [hero, services, team, gallery] = get("page_contact").blocks.nodes.map(get);
    expect(hero).toMatchObject({ type: "hero", layout: "beside" });
    expect(services).toMatchObject({ type: "services", layout: "cards" });
    expect(team).toMatchObject({ type: "team", layout: "cards" });
    expect(gallery).toMatchObject({ type: "gallery", image_fit: "fill" });
    expect(errors(session.doc)).toEqual([]);
  });

  it("keeps the look of a duplicated block", () => {
    const { session, get, select } = setup("page_gallery");
    setBlockLook(session, "gallery_work", "image_fit", "whole");
    setBlockLook(session, "team_1", "layout", "list");
    select(blocksPath(2), 1);
    expect(duplicateSelectedNode(session)).toBe(true);
    const blocks = get("page_gallery").blocks.nodes;
    expect(get(blocks[2])).toMatchObject({ type: "gallery", image_fit: "whole" });
    select(blocksPath(2), 3);
    expect(duplicateSelectedNode(session)).toBe(true);
    expect(get(get("page_gallery").blocks.nodes[4])).toMatchObject({
      type: "team",
      layout: "list",
    });
  });
});
