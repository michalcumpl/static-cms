import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { SelectFieldTextCommand } from "./commands";
import { EditorState } from "./state.svelte";

function setup() {
  const { session } = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
  const command = new SelectFieldTextCommand({ session, editable: true } as never);
  return { session, command };
}

const paragraph = ["site_1", "pages", 0, "blocks", 2, "body", 1, "content"];

describe("SelectFieldTextCommand", () => {
  it("selects the whole text of the field, and pressing again keeps it", () => {
    const { session, command } = setup();
    session.selection = { type: "text", path: paragraph, anchor_offset: 4, focus_offset: 4 };
    command.execute();
    const text = (session.get(paragraph) as { content: string }).content;
    const all = { type: "text", path: paragraph, anchor_offset: 0, focus_offset: text.length };
    expect(session.selection).toEqual(all);
    command.execute();
    expect(session.selection).toEqual(all);
  });

  it("counts characters the way the editor does (grapheme clusters)", () => {
    const { session, command } = setup();
    session.apply(
      session.tr.set(paragraph, { content: "Dort 🎂👋🏽!", marks: [], annotations: [] }),
    );
    session.selection = { type: "text", path: paragraph, anchor_offset: 0, focus_offset: 0 };
    command.execute();
    expect(session.selection).toMatchObject({ focus_offset: 8 });
  });

  it("leaves a block selection alone, but still takes the key", () => {
    const { session, command } = setup();
    const block = {
      type: "node" as const,
      path: ["site_1", "pages", 0, "blocks"],
      anchor_offset: 2,
      focus_offset: 3,
    };
    session.selection = block;
    expect(command.is_enabled()).toBe(true);
    command.execute();
    expect(session.selection).toEqual(block);
  });
});
