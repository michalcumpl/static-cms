import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";

function editor() {
  return new EditorState({ document: demoSite(), version: "v1", problems: [] });
}

describe("EditorState.dirty", () => {
  it("is false for a freshly loaded document", () => {
    expect(editor().dirty).toBe(false);
  });

  it("is true after an edit and false again after undoing it", () => {
    const state = editor();
    const { session } = state;
    session.apply(
      session.tr.set(["hero_1", "heading"], { content: "Jiný nadpis", marks: [], annotations: [] }),
    );
    expect(state.dirty).toBe(true);
    session.undo();
    expect(state.dirty).toBe(false);
  });
});
