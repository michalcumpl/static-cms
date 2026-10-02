import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import {
  addButton,
  buttonBlockOf,
  canRemoveButton,
  removeButton,
  selectedButton,
  setButtonAddress,
  setButtonPage,
} from "./buttons";
import { EditorState } from "./state.svelte";
import { insertBlockAt } from "./structure";
import type { BlockType } from "./transforms";

/** Adds a block at the end of a page, as the "+ Add block" after its last block does. */
function appendBlock(s: Session, pageIndex: number, type: BlockType): boolean {
  const path = ["site_1", "pages", pageIndex, "blocks"];
  return insertBlockAt(s, path, (s.get(path) as { nodes: string[] }).nodes.length, type);
}

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;
type Doc = Parameters<typeof buttonBlockOf>[0];

/** An editor whose "Kontakt" page ends with a new call to action; returns its ID. */
function withCallToAction() {
  const { session: s } = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
  appendBlock(s, 1, "call_to_action");
  const blocks = (s.get("page_contact") as AnyNode).blocks.nodes as string[];
  const ctaId = blocks.find((id) => (s.get(id) as AnyNode).type === "call_to_action") as string;
  return { s, ctaId };
}

const node = (s: Session, id: string) => s.get(id) as AnyNode;
const buttons = (s: Session, blockId: string) =>
  (buttonBlockOf(s.doc as unknown as Doc, blockId)?.buttons ?? []).map((id) => node(s, id));

describe("where a button points", () => {
  it("points at a page, and undo restores the previous target", () => {
    const { s, ctaId } = withCallToAction();
    const [button] = buttons(s, ctaId);
    setButtonPage(s, button?.id, "page_contact");
    expect(buttons(s, ctaId)[0]).toMatchObject({ type: "page_link", page_id: "page_contact" });
    s.undo();
    expect(buttons(s, ctaId)[0]).toMatchObject({ page_id: "page_home" });
  });

  it("points at a tel: address, keeping the label, and back at a page", () => {
    const { s, ctaId } = withCallToAction();
    const [button] = buttons(s, ctaId);
    expect(setButtonAddress(s, button?.id, " tel:+420321123456 ")).toEqual({
      ok: true,
      href: "tel:+420321123456",
    });
    const [call] = buttons(s, ctaId);
    expect(call).toMatchObject({
      type: "external_link",
      url: "tel:+420321123456",
      label: { content: "Tlačítko" },
    });
    // The new button is selected, so the panel stays on it.
    expect(selectedButton(s).button?.id).toBe(call?.id);
    setButtonPage(s, call?.id, "page_contact");
    expect(buttons(s, ctaId)[0]).toMatchObject({ type: "page_link", page_id: "page_contact" });
  });

  it("refuses an unsafe address and keeps the target", () => {
    const { s, ctaId } = withCallToAction();
    const [button] = buttons(s, ctaId);
    const before = s.doc;
    const result = setButtonAddress(s, button?.id, "javascript:alert(1)");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("isn't allowed");
    expect(s.doc).toBe(before);
  });
});

describe("adding and removing buttons", () => {
  it("adds a second button to a call to action, but no third", () => {
    const { s, ctaId } = withCallToAction();
    expect(addButton(s, ctaId)).toBe(true);
    expect(buttons(s, ctaId)).toHaveLength(2);
    expect(addButton(s, ctaId)).toBe(false);
    s.undo();
    expect(buttons(s, ctaId)).toHaveLength(1);
  });

  it("never removes a call to action's last button", () => {
    const { s, ctaId } = withCallToAction();
    const [only] = buttons(s, ctaId);
    expect(canRemoveButton(s.doc as unknown as Doc, only?.id)).toBe(false);
    expect(removeButton(s, only?.id)).toBe(false);
    addButton(s, ctaId);
    expect(removeButton(s, only?.id)).toBe(true);
    expect(buttons(s, ctaId)).toHaveLength(1);
  });

  it("gives a hero without a button one to the home page, and removes it", () => {
    const { s } = withCallToAction();
    expect(buttons(s, "hero_1")).toHaveLength(1);
    const [heroButton] = buttons(s, "hero_1");
    expect(removeButton(s, heroButton?.id)).toBe(true);
    expect(buttons(s, "hero_1")).toEqual([]);
    expect(addButton(s, "hero_1")).toBe(true);
    expect(buttons(s, "hero_1")[0]).toMatchObject({
      type: "page_link",
      page_id: "page_home",
      label: { content: "Tlačítko" },
    });
    expect(addButton(s, "hero_1")).toBe(false);
  });
});

describe("selectedButton", () => {
  it("finds the button whose label has the caret, and its block", () => {
    const { s } = withCallToAction();
    s.selection = {
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 0, "action", 0, "label"],
      anchor_offset: 0,
      focus_offset: 0,
    } as never;
    const found = selectedButton(s);
    expect(found.button?.id).toBe("cta_order");
    expect(found.block).toMatchObject({ id: "hero_1", property: "action", max: 1 });
  });

  it("finds just the block when the caret is in its heading", () => {
    const { s } = withCallToAction();
    s.selection = {
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 0, "heading"],
      anchor_offset: 0,
      focus_offset: 0,
    } as never;
    expect(selectedButton(s)).toMatchObject({ button: undefined, block: { id: "hero_1" } });
  });

  it("finds nothing outside a hero or call to action", () => {
    const { s } = withCallToAction();
    s.selection = {
      type: "text",
      path: ["site_1", "nav", "items", 0, "label"],
      anchor_offset: 0,
      focus_offset: 0,
    } as never;
    expect(selectedButton(s)).toEqual({});
  });
});
