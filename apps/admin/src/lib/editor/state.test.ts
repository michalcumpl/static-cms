import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";

function editor() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
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

describe("EditorState pages and menu", () => {
  it("lists the pages with home, slugs, menu positions and editor URLs", () => {
    expect(editor().pages).toEqual([
      {
        id: "page_home",
        title: "Úvod",
        slug: "uvod",
        isHome: true,
        menuPosition: { index: 0 },
        href: "/p/p_test/edit/page_home/",
      },
      {
        id: "page_contact",
        title: "Kontakt",
        slug: "kontakt",
        isHome: false,
        menuPosition: { index: 1 },
        href: "/p/p_test/edit/page_contact/",
      },
    ]);
  });

  it("starts on the home page", () => {
    const state = editor();
    expect(state.currentPageId).toBe("page_home");
    expect(state.currentPage?.title).toBe("Úvod");
    expect(state.pageIndex).toBe(0);
  });

  it("lists the menu in order, with external links, and pages outside the menu", () => {
    const state = editor();
    const { session } = state;
    const tr = session.tr;
    tr.create({
      id: "ext_fb",
      type: "external_link",
      label: { content: "Facebook", marks: [], annotations: [] },
      url: "https://facebook.com/pekarna",
    });
    tr.set(["nav_1", "items"], {
      nodes: ["nav_contact", "ext_fb"],
      marks: [],
      annotations: [],
    });
    session.apply(tr);
    expect(state.menu.map((entry) => [entry.kind, entry.itemId, entry.position.index])).toEqual([
      ["page", "nav_contact", 0],
      ["external", "ext_fb", 1],
    ]);
    expect(state.menu[1]).toMatchObject({ label: "Facebook", url: "https://facebook.com/pekarna" });
    expect(state.unlisted.map((page) => page.id)).toEqual(["page_home"]);
  });

  it("follows the document: a renamed page shows its new title", () => {
    const state = editor();
    state.session.apply(state.session.tr.set(["page_contact", "title"], "Napište nám"));
    expect(state.pages[1]?.title).toBe("Napište nám");
  });

  it("keeps the current page by ID when pages are reordered", () => {
    const state = editor();
    state.showPage("page_contact");
    state.session.apply(
      state.session.tr.set(["site_1", "pages"], {
        nodes: ["page_contact", "page_home"],
        marks: [],
        annotations: [],
      }),
    );
    expect(state.currentPage?.id).toBe("page_contact");
    expect(state.pageIndex).toBe(0);
  });
});
