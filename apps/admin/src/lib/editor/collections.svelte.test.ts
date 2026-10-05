import { blockItems, validateSite } from "@webmio/site";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import {
  addItem,
  chooseItem,
  deleteItem,
  otherPagesShowing,
  pageCollections,
  setBlockMode,
  unchosenItems,
} from "./collections";
import { createCommandsAndKeymap } from "./commands";
import { EditorState } from "./state.svelte";
import { deleteSelectedNode, duplicateSelectedNode, moveSelectedNode } from "./structure";

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

/**
 * The demo site with a second services block on "Kontakt" showing chosen services: "Kváskový
 * chléb" and "Dorty na objednávku". The home page's block shows all three.
 */
function setup(options: { page?: string; lang?: string } = {}) {
  const doc = demoSite() as { nodes: AnyNode };
  doc.nodes.ref_bread = { id: "ref_bread", type: "item_ref", item_id: "service_bread" };
  doc.nodes.ref_cakes = { id: "ref_cakes", type: "item_ref", item_id: "service_cakes" };
  doc.nodes.services_pick = {
    id: "services_pick",
    type: "services",
    heading: { content: "Doporučujeme", marks: [], annotations: [] },
    show: "chosen",
    chosen: { nodes: ["ref_bread", "ref_cakes"], marks: [], annotations: [] },
  };
  doc.nodes.page_contact.blocks.nodes.push("services_pick");
  const editor = new EditorState(
    { document: doc, version: "v1", problems: [] },
    projectPaths("p"),
    options.lang
      ? { lang: options.lang, primaryLang: "cs", languages: [] }
      : { lang: "cs", primaryLang: "cs", languages: [] },
  );
  if (options.page) editor.showPage(options.page);
  const s = editor.session;
  const get = (id: string) => s.get(id) as AnyNode;
  const names = (blockId: string) =>
    blockItems(s.doc as never, get(blockId) as never).map((item) =>
      item.type === "service_item" ? item.name.content : "",
    );
  const pick = () => editor.collections.find((view) => view.blockId === "services_pick");
  const errors = () => validateSite(s.doc).problems.filter((p) => p.severity === "error");
  return { editor, s, get, names, pick, errors };
}

const selectItem = (s: Session, index: number) => {
  s.selection = {
    type: "node",
    path: ["site_1", "services"],
    anchor_offset: index,
    focus_offset: index + 1,
  };
};

describe("pageCollections", () => {
  it("mounts an item editable in the first block of the page that shows it, and previews it later", () => {
    const s = setup().s;
    const doc = s.doc as { nodes: AnyNode };
    const views = pageCollections(doc as never, ["services_1", "services_pick"]);
    expect(views[0]).toMatchObject({ mode: "all", wholeList: true });
    expect(views[1]?.mode).toBe("chosen");
    expect(views[1]?.items.map((i) => [i.itemId, i.editable])).toEqual([
      ["service_bread", false],
      ["service_cakes", false],
    ]);
  });

  it("Same service twice on one page: the later block showing all of them can't be one list", () => {
    const s = setup().s;
    const views = pageCollections(s.doc as never, ["services_pick", "services_1"]);
    expect(views[0]?.items.every((i) => i.editable)).toBe(true);
    expect(views[1]).toMatchObject({ wholeList: false });
    expect(views[1]?.items.map((i) => i.editable)).toEqual([false, true, false]);
  });
});

describe("items in a block showing chosen items", () => {
  it("Remove a highlight", () => {
    const { s, names, editor } = setup({ page: "page_contact" });
    selectItem(s, 2);
    expect(deleteSelectedNode(s)).toBe(true);
    expect(names("services_pick")).toEqual(["Kváskový chléb"]);
    expect(names("services_1")).toHaveLength(3);
    expect(editor.collections[0]?.items).toHaveLength(1);
  });

  it("moves an item within the block only", () => {
    const { s, names } = setup({ page: "page_contact" });
    selectItem(s, 2);
    expect(moveSelectedNode(s, -1)).toBe(true);
    expect(names("services_pick")).toEqual(["Dorty na objednávku", "Kváskový chléb"]);
    expect(names("services_1")).toEqual([
      "Kváskový chléb",
      "Rohlíky a housky",
      "Dorty na objednávku",
    ]);
  });

  it("Add an existing service to the highlights", () => {
    const { s, names, pick } = setup({ page: "page_contact" });
    const view = pick();
    if (!view) throw new Error("no block");
    expect(unchosenItems(s.doc as never, view)).toEqual(["service_rolls"]);
    chooseItem(s, view, "service_rolls");
    expect(names("services_pick")).toEqual([
      "Kváskový chléb",
      "Dorty na objednávku",
      "Rohlíky a housky",
    ]);
    expect(s.get(["site_1", "services"])).toMatchObject({
      nodes: expect.arrayContaining(["service_rolls"]),
    });
  });

  it("adds a new item to the collection and to the block", () => {
    const { s, get, pick, names } = setup({ page: "page_contact" });
    const view = pick();
    if (!view) throw new Error("no block");
    const id = addItem(s, "site_1", view, view.items[0]);
    expect(get("site_1").services.nodes.at(1)).toBe(id);
    expect(names("services_pick")).toEqual([
      "Kváskový chléb",
      "Nová služba",
      "Dorty na objednávku",
    ]);
  });

  it("duplicates an item into the collection and the block, right after the original", () => {
    const { s, get, names } = setup({ page: "page_contact" });
    selectItem(s, 0);
    expect(duplicateSelectedNode(s)).toBe(true);
    expect(get("site_1").services.nodes).toHaveLength(4);
    expect(names("services_pick")).toEqual([
      "Kváskový chléb",
      "Kváskový chléb",
      "Dorty na objednávku",
    ]);
  });
});

describe("deleting an item", () => {
  it("Delete a shown service: from the collection and every block, undone in one step", () => {
    const { s, get, names, errors } = setup();
    expect(otherPagesShowing(s.doc as never, "service_bread", "page_home")).toEqual([
      "page_contact",
    ]);
    selectItem(s, 0);
    expect(deleteSelectedNode(s)).toBe(true);
    expect(get("site_1").services.nodes).not.toContain("service_bread");
    expect(names("services_pick")).toEqual(["Dorty na objednávku"]);
    expect(get("ref_bread")).toBeUndefined();
    expect(errors()).toEqual([]);
    s.undo();
    expect(names("services_pick")).toEqual(["Kváskový chléb", "Dorty na objednávku"]);
    expect(get("site_1").services.nodes[0]).toBe("service_bread");
  });

  it("deletes with Backspace too, without leaving references behind", () => {
    const { s, get, errors } = setup();
    selectItem(s, 0);
    const { commands } = createCommandsAndKeymap({ session: s, editable: true });
    expect(commands.delete_collection_item.is_enabled()).toBe(true);
    commands.delete_collection_item.execute();
    expect(get("ref_bread")).toBeUndefined();
    expect(errors()).toEqual([]);
  });

  it("deleteItem works from anywhere", () => {
    const { s, names } = setup();
    deleteItem(s, "site_1", "services", "service_cakes");
    expect(names("services_pick")).toEqual(["Kváskový chléb"]);
  });
});

describe("Switch to chosen", () => {
  it("keeps what the block shows, and one undo switches back", () => {
    const { s, get, names } = setup();
    setBlockMode(s, "site_1", "services_1", "chosen");
    expect(get("services_1").show).toBe("chosen");
    expect(names("services_1")).toEqual([
      "Kváskový chléb",
      "Rohlíky a housky",
      "Dorty na objednávku",
    ]);
    s.undo();
    expect(get("services_1")).toMatchObject({ show: "all", chosen: { nodes: [] } });
  });

  it("empties the chosen items when switching back to all", () => {
    const { s, get } = setup();
    setBlockMode(s, "site_1", "services_pick", "all");
    expect(get("services_pick").chosen.nodes).toEqual([]);
    expect(get("ref_bread")).toBeUndefined();
  });
});

describe("keyboard", () => {
  it("Escape from a selected item selects the block of the page that shows it", () => {
    const { s } = setup();
    selectItem(s, 1);
    const { commands } = createCommandsAndKeymap({ session: s, editable: true });
    expect(commands.select_parent.is_enabled()).toBe(true);
    commands.select_parent.execute();
    expect(s.selection).toMatchObject({
      type: "node",
      path: ["site_1", "pages", 0, "blocks"],
      anchor_offset: 1,
      focus_offset: 2,
    });
  });

  it("adds no item with Enter in a block showing chosen items", () => {
    const { s } = setup({ page: "page_contact" });
    s.selection = {
      type: "text",
      path: ["site_1", "services", 0, "name"],
      anchor_offset: 14,
      focus_offset: 14,
    };
    const { commands } = createCommandsAndKeymap({ session: s, editable: true });
    expect(commands.insert_default.is_enabled()).toBe(false);
  });
});

describe("Collections outside the primary language", () => {
  it("No new services in English: nothing added, moved or deleted in a block showing all", () => {
    const { s, get } = setup({ lang: "en" });
    selectItem(s, 0);
    expect(moveSelectedNode(s, 1)).toBe(false);
    expect(duplicateSelectedNode(s)).toBe(false);
    expect(deleteSelectedNode(s)).toBe(false);
    expect(get("site_1").services.nodes).toEqual([
      "service_bread",
      "service_rolls",
      "service_cakes",
    ]);
  });

  it("still lets a block showing chosen items choose, order and remove them", () => {
    const { s, names } = setup({ page: "page_contact", lang: "en" });
    selectItem(s, 2);
    expect(moveSelectedNode(s, -1)).toBe(true);
    expect(deleteSelectedNode(s)).toBe(true);
    expect(names("services_pick")).toEqual(["Kváskový chléb"]);
  });
});
