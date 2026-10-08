import { validateSite } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { setBlockLook } from "./looks";
import { EditorState } from "./state.svelte";
import {
  canDuplicate,
  deleteSelectedNode,
  duplicateSelectedNode,
  insertBlockAt,
  insertItem,
  itemLimit,
} from "./structure";
import { setCardLink } from "./transforms";

// Cards in the editor (cards design decision 4).

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

const contactBlocks = ["site_1", "pages", 1, "blocks"];

function setup() {
  const editor = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p"),
  );
  const { session } = editor;
  const get = (id: string) => session.get(id) as AnyNode;
  insertBlockAt(session, contactBlocks, 0, "cards");
  const blockId = get("page_contact").blocks.nodes[0] as string;
  const cards = () => get(blockId).items.nodes as string[];
  const selectCard = (index: number) => {
    session.selection = {
      type: "node",
      path: [...contactBlocks, 0, "items"],
      anchor_offset: index,
      focus_offset: index + 1,
    } as never;
  };
  const errors = () => validateSite(session.doc).problems.filter((p) => p.severity === "error");
  return { editor, session, get, blockId, cards, selectCard, errors };
}

describe("cards block", () => {
  it("Insert cards: three empty cards, the caret in the first title", () => {
    const { session, get, blockId, cards } = setup();
    expect(get(blockId)).toMatchObject({
      type: "cards",
      layout: "below",
      heading: { content: "" },
    });
    expect(cards()).toHaveLength(3);
    expect(get(cards()[0] as string)).toMatchObject({ type: "card", target_id: "", url: "" });
    expect(session.selection).toMatchObject({
      type: "text",
      path: [...contactBlocks, 0, "items", 0, "title"],
    });
  });

  it("adds, duplicates and deletes cards, one step each, within one to twelve", () => {
    const { session, cards, selectCard } = setup();
    selectCard(0);
    expect(insertItem(session)).toBe(true);
    expect(cards()).toHaveLength(4);
    session.undo();
    expect(cards()).toHaveLength(3);
    selectCard(1);
    expect(duplicateSelectedNode(session)).toBe(true);
    expect(cards()).toHaveLength(4);
    for (let i = 4; i < 12; i++) {
      selectCard(0);
      insertItem(session);
    }
    expect(cards()).toHaveLength(12);
    selectCard(0);
    expect(insertItem(session)).toBe(false);
    expect(canDuplicate(session, cards()[0] as string)).toBe(false);
    expect(itemLimit(session, cards()[0] as string)).toBe("maxCards");
  });

  it("Last card can't be deleted", () => {
    const { session, cards, selectCard } = setup();
    selectCard(0);
    deleteSelectedNode(session);
    selectCard(0);
    deleteSelectedNode(session);
    expect(cards()).toHaveLength(1);
    expect(itemLimit(session, cards()[0] as string)).toBe("lastCard");
    selectCard(0);
    expect(deleteSelectedNode(session)).toBe(false);
    expect(cards()).toHaveLength(1);
  });

  it("sets the look as one step", () => {
    const { session, get, blockId } = setup();
    setBlockLook(session, blockId, "layout", "over");
    expect(get(blockId).layout).toBe("over");
    session.undo();
    expect(get(blockId).layout).toBe("below");
  });
});

describe("card links", () => {
  it("links to a page, an item and an address, one step each; refuses unsafe ones", () => {
    const { session, get, cards, errors } = setup();
    const id = cards()[0] as string;
    const link = (target: Parameters<typeof setCardLink>[2]) => {
      const tr = session.tr;
      const result = setCardLink(tr, id, target);
      if (result.ok) session.apply(tr);
      return result;
    };
    link({ page: "page_home" });
    expect(get(id)).toMatchObject({ target_id: "page_home", url: "" });
    link({ address: "https://example.org" });
    expect(get(id)).toMatchObject({ target_id: "", url: "https://example.org" });
    link({ item: "service_bread" });
    expect(get(id)).toMatchObject({ target_id: "service_bread", url: "" });
    expect(link({ address: "javascript:alert(1)" })).toMatchObject({ ok: false });
    expect(get(id).target_id).toBe("service_bread");
    session.undo();
    expect(get(id).url).toBe("https://example.org");
    link(null);
    expect(get(id)).toMatchObject({ target_id: "", url: "" });
    // Titles are still empty, so validation names them; links are fine.
    expect(errors().every((p) => p.code === "empty-title")).toBe(true);
  });
});
