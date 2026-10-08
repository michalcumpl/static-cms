import { validateSite } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite, imageBlocksSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";
import { canDuplicate, duplicateSelectedNode } from "./structure";

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function setup(document: unknown = demoSite(), pageId?: string) {
  const editor = new EditorState({ document, version: "v1", problems: [] }, projectPaths("p"));
  if (pageId) editor.showPage(pageId);
  const { session } = editor;
  const get = (id: string) => session.get(id) as AnyNode;
  const select = (path: (string | number)[], index: number) => {
    session.selection = { type: "node", path, anchor_offset: index, focus_offset: index + 1 };
  };
  /** Every node ID of a subtree, found through the document's node references. */
  const subtree = (id: string): string[] => {
    const node = get(id);
    const ids = [id];
    for (const value of Object.values(node)) {
      const v = value as AnyNode;
      if (Array.isArray(v?.nodes)) for (const child of v.nodes) ids.push(...subtree(child));
      if (Array.isArray(v?.marks)) for (const mark of v.marks) ids.push(mark.node_id);
    }
    return ids;
  };
  return { session, get, select, subtree };
}

const blocksPath = (page: number) => ["site_1", "pages", page, "blocks"];
const errors = (doc: unknown) => validateSite(doc).problems.filter((p) => p.severity === "error");

describe("duplicateSelectedNode", () => {
  it("copies a services block right after it, showing the same services, as one step", () => {
    const { session, get, select } = setup();
    select(blocksPath(0), 1);
    expect(duplicateSelectedNode(session)).toBe(true);
    const blocks = get("page_home").blocks.nodes;
    expect(blocks).toHaveLength(4);
    const [original, copy] = [blocks[1], blocks[2]];
    expect(get(copy)).toMatchObject({
      type: "services",
      layout: "cards",
      heading: get(original).heading,
      show: "all",
    });
    // The services themselves stay once in the site.
    expect(get("site_1").services.nodes).toHaveLength(3);
    expect(session.selection).toMatchObject({
      path: blocksPath(0),
      anchor_offset: 2,
      focus_offset: 3,
    });
    expect(errors(session.doc)).toEqual([]);
    session.undo();
    expect(get("page_home").blocks.nodes).toHaveLength(3);
  });

  it("leaves the original alone when the copy changes", () => {
    const { session, get, select } = setup(imageBlocksSite());
    select(blocksPath(2), 0);
    duplicateSelectedNode(session);
    const copy = get("page_gallery").blocks.nodes[1];
    session.apply(session.tr.set([copy, "heading"], { ...get(copy).heading, content: "Nový" }));
    expect(get("twi_voucher").heading.content).not.toBe("Nový");
  });

  it("copies a person with an image node of their own, same media and description", () => {
    const { session, get, select } = setup(imageBlocksSite(), "page_gallery");
    const people = get("site_1").team.nodes;
    select(["site_1", "team"], people.indexOf("person_katerina"));
    duplicateSelectedNode(session);
    const after = get("site_1").team.nodes;
    const copy = get(after[people.indexOf("person_katerina") + 1]);
    expect(copy.name.content).toBe("Kateřina");
    const [imageId] = copy.image.nodes;
    expect(imageId).not.toBe("image_katerina");
    expect(get(imageId)).toMatchObject({
      src: get("image_katerina").src,
      alt: get("image_katerina").alt,
      decorative: get("image_katerina").decorative,
    });
  });

  it("copies a gallery photo right after it", () => {
    const { session, get, select } = setup(imageBlocksSite());
    select([...blocksPath(2), 1, "items"], 0);
    duplicateSelectedNode(session);
    const items = get("gallery_work").items.nodes;
    expect(items).toHaveLength(4);
    expect(get(items[1]).caption.content).toBe("Malování na plátno");
    expect(errors(session.doc)).toEqual([]);
  });

  it("never copies a hero, or anything in a fixed list", () => {
    const { session, select } = setup();
    expect(canDuplicate(session, "hero_1")).toBe(false);
    select(blocksPath(0), 0);
    const doc = session.doc;
    expect(duplicateSelectedNode(session)).toBe(false);
    select(["site_1", "nav", "items"], 0);
    expect(duplicateSelectedNode(session)).toBe(false);
    expect(session.doc).toBe(doc);
  });
});
