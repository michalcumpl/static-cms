import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite, imageBlocksSite } from "$lib/server/demo";
import {
  BLOCK_DESCRIPTIONS,
  BLOCK_NAMES,
  handleTargets,
  selectionLabel,
  unavailableReason,
} from "./handles";
import { EditorState } from "./state.svelte";

function setup(document: unknown = demoSite()) {
  return new EditorState({ document, version: "v1", problems: [] }, projectPaths("p")).session;
}

const home = ["site_1", "pages", 0, "blocks"];
const gallery = ["site_1", "pages", 2, "blocks"];

describe("handleTargets", () => {
  it("finds the service and its services block from inside the service's text", () => {
    const session = setup();
    const { block, item } = handleTargets(session, [...home, 1, "items", 2, "description"]);
    expect(block).toMatchObject({ listPath: home, index: 1, id: "services_1", type: "services" });
    expect(item).toMatchObject({
      listPath: [...home, 1, "items"],
      index: 2,
      id: "service_cakes",
      type: "service_item",
    });
  });

  it("finds a bullet of a text block's list as an item, and a paragraph as only the block", () => {
    const session = setup();
    const bullet = handleTargets(session, [...home, 2, "body", 2, "items", 1, "content"]);
    expect(bullet.item).toMatchObject({ id: "li_2", type: "list_item" });
    const paragraph = handleTargets(session, [...home, 2, "body", 1, "content"]);
    expect(paragraph).toEqual({ block: expect.objectContaining({ id: "rich_text_about" }) });
  });

  it("finds people and gallery photos", () => {
    const session = setup(imageBlocksSite());
    expect(handleTargets(session, [...gallery, 2, "people", 0, "name"]).item?.type).toBe("person");
    expect(handleTargets(session, [...gallery, 1, "items", 2]).item?.id).toBe("gallery_item_3");
  });

  it("gives no item for the hero's fixed slots, and nothing outside the blocks", () => {
    const session = setup();
    expect(handleTargets(session, [...home, 0, "action", 0, "label"])).toEqual({
      block: expect.objectContaining({ type: "hero" }),
    });
    expect(handleTargets(session, [...home, 0, "image", 0])).toEqual({
      block: expect.objectContaining({ type: "hero" }),
    });
    expect(handleTargets(session, ["site_1", "nav", "items", 0, "label"])).toEqual({});
    expect(handleTargets(session, ["site_1"])).toEqual({});
  });
});

describe("selectionLabel", () => {
  const select = (session: ReturnType<typeof setup>, path: (string | number)[], index: number) => {
    session.selection = { type: "node", path, anchor_offset: index, focus_offset: index + 1 };
  };

  it("names a selected block", () => {
    const session = setup();
    select(session, home, 1);
    expect(selectionLabel(session)).toBe("Services block");
  });

  it("names a selected item with its place in the list", () => {
    const session = setup(imageBlocksSite());
    select(session, [...gallery, 1, "items"], 2);
    expect(selectionLabel(session)).toBe("Photo 3 of 3");
    const demo = setup();
    select(demo, [...home, 2, "body", 2, "items"], 2);
    expect(selectionLabel(demo)).toBe("List item 3 of 3");
  });

  it("says nothing for the caret, a paragraph or the navigation", () => {
    const session = setup();
    session.selection = {
      type: "text",
      path: [...home, 2, "body", 1, "content"],
      anchor_offset: 0,
      focus_offset: 3,
    };
    expect(selectionLabel(session)).toBeUndefined();
    select(session, [...home, 2, "body"], 1);
    expect(selectionLabel(session)).toBeUndefined();
    select(session, ["site_1", "nav", "items"], 0);
    expect(selectionLabel(session)).toBeUndefined();
  });
});

describe("unavailableReason", () => {
  const withHero = [{ type: "hero" }, { type: "services" }];

  it("says why a hero can't go between blocks or onto a page with one", () => {
    expect(unavailableReason("hero", withHero, 1)).toBe("A page has only one hero");
    expect(unavailableReason("hero", [{ type: "services" }], 1)).toBe(
      "Only at the top of a page without a hero",
    );
    expect(unavailableReason("hero", [{ type: "services" }], 0)).toBeUndefined();
  });

  it("says nothing goes above a hero", () => {
    expect(unavailableReason("gallery", withHero, 0)).toBe("The hero stays at the top of the page");
    expect(unavailableReason("gallery", withHero, 1)).toBeUndefined();
  });

  it("describes every block", () => {
    for (const type of Object.keys(BLOCK_NAMES) as (keyof typeof BLOCK_NAMES)[]) {
      expect(BLOCK_DESCRIPTIONS[type], type).toMatch(/^[A-Z].+[^.]$/);
    }
  });
});
