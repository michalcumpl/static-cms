import { validate_document } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { editorSchema } from "./schema";
import { EditorState } from "./state.svelte";
import {
  availableBlocks,
  blockInsertionPoint,
  deleteSelectedNode,
  insertBlock,
  insertItem,
  isFixedList,
  itemInsertionPoint,
  moveSelectedNode,
  selectedNode,
} from "./structure";

function setup() {
  const editor = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
  const { session } = editor;
  const blocks = () => (session.get(["site_1", "pages", 0, "blocks"]) as { nodes: string[] }).nodes;
  const types = () => blocks().map((id) => (session.get(id) as { type: string }).type);
  const selectNode = (path: (string | number)[], index: number) => {
    session.selection = { type: "node", path, anchor_offset: index, focus_offset: index + 1 };
  };
  const gap = (index: number) => {
    session.selection = {
      type: "node",
      path: ["site_1", "pages", 0, "blocks"],
      anchor_offset: index,
      focus_offset: index,
    };
  };
  const valid = () => expect(() => validate_document(session.doc, editorSchema)).not.toThrow();
  return { session, blocks, types, selectNode, gap, valid };
}

describe("fixed lists", () => {
  it("covers navigation items, pages and the hero's image and action", () => {
    const { session } = setup();
    expect(isFixedList(session, ["site_1", "nav", "items"])).toBe(true);
    expect(isFixedList(session, ["site_1", "pages"])).toBe(true);
    expect(isFixedList(session, ["hero_1", "image"])).toBe(true);
    expect(isFixedList(session, ["site_1", "pages", 0, "blocks", 0, "action"])).toBe(true);
    expect(isFixedList(session, ["site_1", "pages", 0, "blocks"])).toBe(false);
    expect(isFixedList(session, ["list_about", "items"])).toBe(false);
  });

  it("can't be deleted from or reordered", () => {
    const { session, selectNode } = setup();
    selectNode(["site_1", "nav", "items"], 0);
    expect(selectedNode(session)).toBeUndefined();
    expect(deleteSelectedNode(session)).toBe(false);
    expect(moveSelectedNode(session, 1)).toBe(false);
    expect((session.get(["site_1", "nav", "items"]) as { nodes: string[] }).nodes).toEqual([
      "nav_home",
      "nav_contact",
    ]);
  });
});

describe("block insertion", () => {
  it("offers the hero only at the top of a page without one", () => {
    const { session, gap } = setup();
    gap(0);
    expect(availableBlocks(session, "site_1", 0)).toEqual([
      "rich_text",
      "services",
      "text_with_image",
      "gallery",
      "team",
      "logos",
      "contact",
      "opening_hours",
    ]); // home has a hero
    session.selection = null;
    expect(availableBlocks(session, "site_1", 1)).toEqual([
      "rich_text",
      "services",
      "text_with_image",
      "gallery",
      "team",
      "logos",
      "contact",
      "opening_hours",
    ]); // end of Kontakt
    session.selection = {
      type: "node",
      path: ["site_1", "pages", 1, "blocks"],
      anchor_offset: 0,
      focus_offset: 0,
    };
    expect(availableBlocks(session, "site_1", 1)).toEqual([
      "hero",
      "rich_text",
      "services",
      "text_with_image",
      "gallery",
      "team",
      "logos",
      "contact",
      "opening_hours",
    ]);
  });

  it("inserts after the block that holds the text selection", () => {
    const { session, types, valid } = setup();
    session.selection = {
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 0, "heading"],
      anchor_offset: 0,
      focus_offset: 0,
    };
    expect(blockInsertionPoint(session, "site_1", 0).index).toBe(1);
    expect(insertBlock(session, "site_1", 0, "services")).toBe(true);
    expect(types()).toEqual(["hero", "services", "services", "rich_text"]);
    valid();
  });

  it("creates each block with placeholder content and puts the caret in it", () => {
    const { session, blocks, gap, valid } = setup();
    gap(3);
    insertBlock(session, "site_1", 0, "rich_text");
    const block = session.get(blocks()[3] as string) as { body: { nodes: string[] } };
    const heading = session.get(block.body.nodes[0] as string) as {
      type: string;
      content: { content: string };
      level: number;
    };
    expect(heading).toMatchObject({ type: "subheading", level: 2, content: { content: "Nadpis" } });
    expect(session.selection).toMatchObject({
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 3, "body", 0, "content"],
    });
    valid();
  });

  it("refuses a hero where it isn't offered", () => {
    const { session, types, gap } = setup();
    gap(2);
    expect(insertBlock(session, "site_1", 0, "hero")).toBe(false);
    expect(types()).toEqual(["hero", "services", "rich_text"]);
  });
});

describe("moving and deleting", () => {
  it("moves the selected block and keeps it selected", () => {
    const { session, types, selectNode, valid } = setup();
    selectNode(["site_1", "pages", 0, "blocks"], 2);
    expect(moveSelectedNode(session, -1)).toBe(true);
    expect(types()).toEqual(["hero", "rich_text", "services"]);
    expect(session.selection).toMatchObject({ anchor_offset: 1, focus_offset: 2 });
    expect(moveSelectedNode(session, -1)).toBe(true);
    expect(moveSelectedNode(session, -1)).toBe(false);
    valid();
  });

  it("moves list items and service items within their list", () => {
    const { session, selectNode } = setup();
    selectNode(["services_1", "items"], 0);
    moveSelectedNode(session, 1);
    expect((session.get(["services_1", "items"]) as { nodes: string[] }).nodes[1]).toBe(
      "service_bread",
    );
  });

  it("deletes the selected block, and undo brings it back", () => {
    const { session, types, selectNode, valid } = setup();
    selectNode(["site_1", "pages", 0, "blocks"], 1);
    expect(deleteSelectedNode(session)).toBe(true);
    expect(types()).toEqual(["hero", "rich_text"]);
    valid();
    session.undo();
    expect(types()).toEqual(["hero", "services", "rich_text"]);
  });
});

describe("item insertion", () => {
  it("adds a service after the one holding the caret", () => {
    const { session, valid } = setup();
    session.selection = {
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 1, "items", 2, "name"],
      anchor_offset: 0,
      focus_offset: 0,
    };
    expect(insertItem(session)).toBe(true);
    const items = (session.get(["services_1", "items"]) as { nodes: string[] }).nodes;
    expect(items).toHaveLength(4);
    expect(session.get(items[3] as string)).toMatchObject({
      type: "service_item",
      name: { content: "Nová služba" },
    });
    expect(session.selection).toMatchObject({
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 1, "items", 3, "name"],
    });
    valid();
  });

  it("adds a list item inside rich text", () => {
    const { session, valid } = setup();
    session.selection = {
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 2, "body", 2, "items", 0, "content"],
      anchor_offset: 0,
      focus_offset: 0,
    };
    insertItem(session);
    expect((session.get(["list_about", "items"]) as { nodes: string[] }).nodes).toHaveLength(4);
    valid();
  });

  it("does nothing outside lists", () => {
    const { session } = setup();
    session.selection = {
      type: "text",
      path: ["site_1", "nav", "items", 0, "label"],
      anchor_offset: 0,
      focus_offset: 0,
    };
    expect(itemInsertionPoint(session)).toBeUndefined();
    expect(insertItem(session)).toBe(false);
  });
});
