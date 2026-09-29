import type { Document } from "svedit";
import { afterEach, describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { resolvePage } from "./resolve-page";
import { EditorState, registerActiveEditor } from "./state.svelte";

const loaded = () => demoSite() as Document;

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected an error");
}

let unregister: (() => void) | undefined;
afterEach(() => {
  unregister?.();
  unregister = undefined;
});

describe("resolvePage", () => {
  it("opens the home page when no page is given", () => {
    expect(resolvePage("p_test", undefined, loaded())).toBe("page_home");
  });

  it("opens a page by ID", () => {
    expect(resolvePage("p_test", "page_contact", loaded())).toBe("page_contact");
  });

  it("is not found for an ID that isn't a page", () => {
    expect(thrown(() => resolvePage("p_test", "does-not-exist", loaded()))).toMatchObject({
      status: 404,
    });
    expect(thrown(() => resolvePage("p_test", "hero_1", loaded()))).toMatchObject({
      status: 404,
    });
  });

  it("finds unsaved pages and the unsaved home through the open editor", () => {
    const editor = new EditorState(
      { document: demoSite(), version: "v1", problems: [] },
      projectPaths("p_test"),
    );
    unregister = registerActiveEditor("p_test", editor);
    const { session } = editor;
    const tr = session.tr;
    tr.create({
      id: "page_new",
      type: "page",
      title: "Nová",
      slug: "nova",
      seo_description: "",
      blocks: { nodes: [], marks: [], annotations: [] },
    });
    tr.set(["site_1", "pages"], {
      nodes: ["page_home", "page_contact", "page_new"],
      marks: [],
      annotations: [],
    });
    tr.set(["site_1", "home_page_id"], "page_new");
    session.apply(tr);
    expect(resolvePage("p_test", "page_new", loaded())).toBe("page_new");
    expect(resolvePage("p_test", undefined, loaded())).toBe("page_new");
    // Another project's editor is not consulted.
    expect(thrown(() => resolvePage("p_other", "page_new", loaded()))).toMatchObject({
      status: 404,
    });
  });
});
