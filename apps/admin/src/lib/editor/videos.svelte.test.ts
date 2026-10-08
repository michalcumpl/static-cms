import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";
import {
  canDuplicate,
  deleteSelectedNode,
  duplicateSelectedNode,
  insertBlockAt,
  insertItem,
  itemLimit,
} from "./structure";
import { imagePropertyOf, setImage, setVideoUrl } from "./transforms";

// Videos in the editor (video design decision 4).

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
  insertBlockAt(session, contactBlocks, 0, "videos");
  const blockId = get("page_contact").blocks.nodes[0] as string;
  const videos = () => get(blockId).items.nodes as string[];
  const select = (index: number) => {
    session.selection = {
      type: "node",
      path: [...contactBlocks, 0, "items"],
      anchor_offset: index,
      focus_offset: index + 1,
    } as never;
  };
  return { session, get, blockId, videos, select };
}

describe("videos block", () => {
  it("starts with one empty video, the caret in its title", () => {
    const { session, get, blockId, videos } = setup();
    expect(get(blockId)).toMatchObject({ type: "videos", heading: { content: "" } });
    expect(videos()).toHaveLength(1);
    expect(get(videos()[0] as string)).toMatchObject({ type: "video", url: "" });
    expect(session.selection).toMatchObject({ path: [...contactBlocks, 0, "items", 0, "title"] });
  });

  it("adds and duplicates videos, one step each, keeping one to twelve", () => {
    const { session, videos, select } = setup();
    select(0);
    expect(deleteSelectedNode(session)).toBe(false);
    expect(itemLimit(session, videos()[0] as string)).toBe("lastCard");
    expect(insertItem(session)).toBe(true);
    expect(videos()).toHaveLength(2);
    session.undo();
    expect(videos()).toHaveLength(1);
    select(0);
    expect(duplicateSelectedNode(session)).toBe(true);
    for (let i = 2; i < 12; i++) {
      select(0);
      insertItem(session);
    }
    expect(videos()).toHaveLength(12);
    expect(canDuplicate(session, videos()[0] as string)).toBe(false);
  });

  it("sets a YouTube or Vimeo address as one step, and refuses anything else", () => {
    const { session, get, videos } = setup();
    const id = videos()[0] as string;
    const set = (url: string) => {
      const tr = session.tr;
      const ok = setVideoUrl(tr, id, url);
      if (ok) session.apply(tr);
      return ok;
    };
    expect(set(" https://youtu.be/wNdrFte2T4w ")).toBe(true);
    expect(get(id).url).toBe("https://youtu.be/wNdrFte2T4w");
    expect(set("https://www.youtube.com/@anideti")).toBe(false);
    expect(get(id).url).toBe("https://youtu.be/wNdrFte2T4w");
    expect(set("https://vimeo.com/697475416")).toBe(true);
    session.undo();
    expect(get(id).url).toBe("https://youtu.be/wNdrFte2T4w");
  });

  it("puts a chosen image in the video's poster", () => {
    const { session, get, videos } = setup();
    const id = videos()[0] as string;
    expect(imagePropertyOf("video")).toBe("poster");
    const tr = session.tr;
    setImage(tr, id, { key: "poster-1", width: 1280, height: 720 });
    session.apply(tr);
    expect(get(id).poster.nodes).toHaveLength(1);
  });
});
