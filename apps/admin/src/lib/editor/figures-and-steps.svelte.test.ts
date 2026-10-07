import { validateSite } from "@webmio/model";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { translate } from "$lib/i18n/translate";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { selectionLabel } from "./handles";
import { EditorState } from "./state.svelte";
import { canInsertItem, insertBlockAt, insertItem } from "./structure";
import type { BlockType } from "./transforms";

// Key figures and steps in the editor (figures-and-steps design decision 4).

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
  translate("en", key, params);
const blocksPath = ["site_1", "pages", 1, "blocks"];

/** "Kontakt" with a block of `type` added at its end; returns the session and the block's index. */
function withBlock(type: BlockType): { s: Session; index: number } {
  const { session: s } = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
  const index = (s.get(blocksPath) as { nodes: string[] }).nodes.length;
  expect(insertBlockAt(s, blocksPath, index, type)).toBe(true);
  return { s, index };
}
const block = (s: Session, index: number) => s.get([...blocksPath, index]) as AnyNode;
const items = (s: Session, index: number) =>
  (block(s, index).items.nodes as string[]).map((id) => s.get(id) as AnyNode);
const caretIn = (s: Session, index: number, item: number, property: string) => {
  s.selection = {
    type: "text",
    path: [...blocksPath, index, "items", item, property],
    anchor_offset: 0,
    focus_offset: 0,
  };
};

describe("inserting", () => {
  it("Insert key figures: three empty figures, the caret in the first value", () => {
    const { s, index } = withBlock("figures");
    expect(block(s, index)).toMatchObject({ type: "figures", heading: { content: "" } });
    expect(items(s, index).map((f) => [f.type, f.value.content, f.label.content])).toEqual([
      ["figure", "", ""],
      ["figure", "", ""],
      ["figure", "", ""],
    ]);
    expect(s.selection).toMatchObject({
      type: "text",
      path: [...blocksPath, index, "items", 0, "value"],
    });
  });

  it("a new steps block has a heading, three empty steps and the caret in the heading", () => {
    const { s, index } = withBlock("steps");
    expect(block(s, index).heading.content).toBe("Jak to funguje");
    expect(items(s, index)).toHaveLength(3);
    expect(s.selection).toMatchObject({ path: [...blocksPath, index, "heading"] });
    const codes = validateSite(s.doc).problems.map((p) => p.code);
    expect(codes.filter((c) => c === "empty-title")).toHaveLength(3);
  });
});

describe("items", () => {
  it("Add a step: after the second, and the third moves down", () => {
    const { s, index } = withBlock("steps");
    const third = block(s, index).items.nodes[2];
    caretIn(s, index, 1, "title");
    expect(insertItem(s)).toBe(true);
    const ids = block(s, index).items.nodes as string[];
    expect(ids).toHaveLength(4);
    expect(ids[3]).toBe(third);
    expect(s.get(ids[2] as string)).toMatchObject({ type: "step", title: { content: "" } });
    expect(s.selection).toMatchObject({ path: [...blocksPath, index, "items", 2, "title"] });
  });

  it("adds figures up to six, and no seventh", () => {
    const { s, index } = withBlock("figures");
    for (const at of [2, 3, 4]) {
      caretIn(s, index, at, "label");
      expect(insertItem(s)).toBe(true);
    }
    expect(items(s, index)).toHaveLength(6);
    caretIn(s, index, 5, "label");
    expect(canInsertItem(s)).toBe(false);
    expect(insertItem(s)).toBe(false);
    expect(items(s, index)).toHaveLength(6);
  });
});

describe("names", () => {
  it("names figures and steps with their place", () => {
    const figures = withBlock("figures");
    figures.s.selection = {
      type: "node",
      path: [...blocksPath, figures.index, "items"],
      anchor_offset: 1,
      focus_offset: 2,
    };
    expect(selectionLabel(figures.s, t)).toBe("Figure 2 of 3");
    const steps = withBlock("steps");
    steps.s.selection = {
      type: "node",
      path: [...blocksPath, steps.index, "items"],
      anchor_offset: 0,
      focus_offset: 1,
    };
    expect(selectionLabel(steps.s, t)).toBe("Step 1 of 3");
    steps.s.selection = {
      type: "node",
      path: blocksPath,
      anchor_offset: steps.index,
      focus_offset: steps.index + 1,
    };
    expect(selectionLabel(steps.s, t)).toBe("Steps block");
  });
});
