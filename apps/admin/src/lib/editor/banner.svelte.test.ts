import { validateSite } from "@webmio/model";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { addButton, buttonBlockOf, canRemoveButton, removeButton } from "./buttons";
import { BLOCK_TYPES } from "./handles";
import { OPTIONAL_IMAGE_OWNERS } from "./image-slots";
import { EditorState } from "./state.svelte";
import { insertBlockAt } from "./structure";
import { insertableBlocks, removeImage, setImage } from "./transforms";

// Banners in the editor (banner-block, site-editing delta "Banner in the editor").

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;
type Doc = Parameters<typeof buttonBlockOf>[0];

const homeBlocks = ["site_1", "pages", 0, "blocks"];

/** The demo editor with a banner inserted after the home page's first block. */
function setup() {
  const editor = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p"),
  );
  const { session } = editor;
  insertBlockAt(session, homeBlocks, 1, "banner");
  const get = (id: string) => session.get(id) as AnyNode;
  const bannerId = get("page_home").blocks.nodes[1] as string;
  return { session, get, bannerId };
}

function apply(s: Session, change: (tr: Session["tr"]) => unknown) {
  const tr = s.tr;
  const result = change(tr);
  s.apply(tr);
  return result;
}

describe("banner block", () => {
  it("is offered anywhere, after the call to action", () => {
    expect(BLOCK_TYPES.indexOf("banner")).toBe(BLOCK_TYPES.indexOf("call_to_action") + 1);
    const blocks = [{ type: "hero" }, { type: "rich_text" }, { type: "services" }];
    for (const index of [1, 2, 3]) expect(insertableBlocks(blocks, index)).toContain("banner");
    expect(insertableBlocks([{ type: "rich_text" }], 0)).toContain("banner");
  });

  it("Insert a banner mid-page: a heading in the site's language, the caret in it, one undo", () => {
    const { session, get, bannerId } = setup();
    expect(get(bannerId)).toMatchObject({
      type: "banner",
      heading: { content: "Nadpis" },
      text: { content: "" },
      image: { nodes: [] },
      action: { nodes: [] },
    });
    expect(session.selection).toMatchObject({ path: [...homeBlocks, 1, "heading"] });
    expect(validateSite(session.doc).problems.filter((p) => p.severity === "error")).toEqual([]);
    session.undo();
    expect(get("page_home").blocks.nodes).not.toContain(bannerId);
  });

  it("Give the banner a button: one at most, and it can be removed", () => {
    const { session, bannerId } = setup();
    const doc = () => session.doc as unknown as Doc;
    expect(buttonBlockOf(doc(), bannerId)).toMatchObject({ type: "banner", max: 1, buttons: [] });
    expect(addButton(session, bannerId)).toBe(true);
    expect(addButton(session, bannerId)).toBe(false);
    const [buttonId] = buttonBlockOf(doc(), bannerId)?.buttons ?? [];
    expect(session.get(buttonId as string)).toMatchObject({
      type: "page_link",
      page_id: "page_home",
    });
    expect(canRemoveButton(doc(), buttonId as string)).toBe(true);
    removeButton(session, buttonId as string);
    expect(buttonBlockOf(doc(), bannerId)?.buttons).toEqual([]);
  });

  it("Give the banner a photo, and take it away again", () => {
    const { session, get, bannerId } = setup();
    expect(OPTIONAL_IMAGE_OWNERS).toContain("banner");
    const imageId = apply(session, (tr) =>
      setImage(tr, bannerId, { key: "letadlo-1a2b", width: 2400, height: 1200 }),
    ) as string;
    expect(get(bannerId).image.nodes).toEqual([imageId]);
    apply(session, (tr) => removeImage(tr, bannerId));
    expect(get(bannerId).image.nodes).toEqual([]);
  });
});
