import { validateSite } from "@webmio/model";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { removeImageFrom, startsDecorative } from "./image-slots";
import { EditorState } from "./state.svelte";
import { insertBlockAt, insertItem, isFixedList } from "./structure";
import type { BlockType } from "./transforms";
import { setImage } from "./transforms";

/** Adds a block at the end of a page, as the "+ Add block" after its last block does. */
function appendBlock(s: Session, pageIndex: number, type: BlockType): boolean {
  const path = ["site_1", "pages", pageIndex, "blocks"];
  return insertBlockAt(s, path, (s.get(path) as { nodes: string[] }).nodes.length, type);
}

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function editor() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
}

const node = (s: Session, id: string) => s.get(id) as AnyNode;
const contactBlocks = (s: Session) =>
  (node(s, "page_contact").blocks.nodes as string[]).map((id) => node(s, id));

describe("inserting the blocks", () => {
  it("creates a call to action with one button to the home page", () => {
    const { session: s } = editor();
    expect(appendBlock(s, 1, "call_to_action")).toBe(true);
    const cta = contactBlocks(s).find((b) => b.type === "call_to_action") as AnyNode;
    expect(cta.heading.content).toBe("Nadpis");
    expect(cta.actions.nodes).toHaveLength(1);
    expect(node(s, cta.actions.nodes[0])).toMatchObject({
      type: "page_link",
      label: { content: "Tlačítko" },
      page_id: "page_home",
    });
  });

  it("creates testimonials with one empty testimonial, a warning-free start but for its texts", () => {
    const { session: s } = editor();
    appendBlock(s, 1, "testimonials");
    const block = contactBlocks(s).find((b) => b.type === "testimonials") as AnyNode;
    expect(block).toMatchObject({ show: "all", chosen: { nodes: [] } });
    const testimonials = node(s, "site_1").testimonials.nodes as string[];
    expect(testimonials).toHaveLength(1);
    expect(node(s, testimonials[0] as string)).toMatchObject({
      type: "testimonial",
      quote: { content: "" },
      name: { content: "" },
    });
    const codes = validateSite(s.doc).problems.map((p) => p.code);
    expect(codes.sort()).toEqual(["empty-name", "empty-quote"]);
  });

  it("keeps the call to action's buttons a fixed list", () => {
    const { session: s } = editor();
    appendBlock(s, 1, "call_to_action");
    const index = contactBlocks(s).findIndex((b) => b.type === "call_to_action");
    expect(isFixedList(s, ["site_1", "pages", 1, "blocks", index, "actions"])).toBe(true);
  });
});

describe("testimonial items", () => {
  it("adds a testimonial after the current one", () => {
    const ed = editor();
    const s = ed.session;
    ed.showPage("page_contact");
    appendBlock(s, 1, "testimonials");
    s.selection = {
      type: "text",
      path: ["site_1", "testimonials", 0, "name"],
      anchor_offset: 0,
      focus_offset: 0,
    } as never;
    expect(insertItem(s)).toBe(true);
    expect(node(s, "site_1").testimonials.nodes).toHaveLength(2);
  });

  it("starts a testimonial's photo decorative, as a portrait, and removes it again", () => {
    expect(startsDecorative("testimonial")).toBe(true);
    expect(startsDecorative("person")).toBe(true);
    expect(startsDecorative("hero")).toBe(false);
    const ed = editor();
    const s = ed.session;
    appendBlock(s, 1, "testimonials");
    const id = node(s, "site_1").testimonials.nodes[0] as string;
    const tr = s.tr;
    setImage(tr, id, { key: "jana-1a2b", width: 400, height: 400 }, { decorative: true });
    s.apply(tr);
    expect(node(s, node(s, id).image.nodes[0])).toMatchObject({ src: "jana-1a2b" });
    removeImageFrom(ed, id);
    expect(node(s, id).image.nodes).toEqual([]);
  });
});
