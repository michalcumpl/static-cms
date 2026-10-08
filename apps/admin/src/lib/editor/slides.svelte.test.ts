import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { setBlockLook } from "./looks";
import { EditorState } from "./state.svelte";
import { canDuplicate, duplicateSelectedNode, insertItem, itemLimit } from "./structure";
import { setItemLink } from "./transforms";

// Slides of the hero slideshow in the editor (hero-slideshow design decision 4).

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

const slidesPath = ["site_1", "pages", 0, "blocks", 0, "slides"];

function setup() {
  const editor = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p"),
  );
  const { session } = editor;
  const get = (id: string) => session.get(id) as AnyNode;
  const slides = () => get("hero_1").slides.nodes as string[];
  const select = (index: number) => {
    session.selection = {
      type: "node",
      path: slidesPath,
      anchor_offset: index,
      focus_offset: index + 1,
    } as never;
  };
  return { session, get, slides, select };
}

describe("slides", () => {
  it("Make the hero a slideshow: two empty slides in the same step", () => {
    const { session, get, slides } = setup();
    setBlockLook(session, "hero_1", "layout", "slideshow");
    expect(get("hero_1").layout).toBe("slideshow");
    expect(slides()).toHaveLength(2);
    expect(get(slides()[0] as string)).toMatchObject({ type: "slide", target_id: "", url: "" });
    session.undo();
    expect(get("hero_1")).toMatchObject({ layout: "beside", slides: { nodes: [] } });
  });

  it("keeps the slides when the look changes back and forth", () => {
    const { session, get, slides } = setup();
    setBlockLook(session, "hero_1", "layout", "slideshow");
    const kept = slides();
    setBlockLook(session, "hero_1", "layout", "cover");
    setBlockLook(session, "hero_1", "layout", "slideshow");
    expect(get("hero_1").slides.nodes).toEqual(kept);
  });

  it("Ninth slide: adding and duplicating stop at eight", () => {
    const { session, slides, select } = setup();
    setBlockLook(session, "hero_1", "layout", "slideshow");
    for (let i = 2; i < 8; i++) {
      select(0);
      expect(insertItem(session)).toBe(true);
    }
    expect(slides()).toHaveLength(8);
    select(0);
    expect(insertItem(session)).toBe(false);
    expect(canDuplicate(session, slides()[0] as string)).toBe(false);
    expect(itemLimit(session, slides()[0] as string)).toBe("maxCards");
    select(0);
    expect(duplicateSelectedNode(session)).toBe(false);
  });

  it("links a slide like a card, one step each", () => {
    const { session, get, slides } = setup();
    setBlockLook(session, "hero_1", "layout", "slideshow");
    const id = slides()[0] as string;
    const tr = session.tr;
    setItemLink(tr, id, { page: "page_contact" });
    session.apply(tr);
    expect(get(id)).toMatchObject({ target_id: "page_contact", url: "" });
    session.undo();
    expect(get(id).target_id).toBe("");
  });
});
