import { validateSite } from "@static-cms/site";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import {
  addExternalLink,
  addPage,
  cannotDelete,
  countLinksTo,
  deletePage,
  duplicatePage,
  moveMenuItem,
  removeMenuItem,
  setExternalLink,
  setHome,
  setPageSlug,
  setPageTitle,
  setSeoDescription,
  showInMenu,
} from "./pages";
import { EditorState } from "./state.svelte";

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function editor() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
}

const node = (s: Session, id: string) => s.get(id) as AnyNode;
const pageIds = (s: Session) => node(s, "site_1").pages.nodes as string[];
const navIds = (s: Session) => node(s, "nav_1").items.nodes as string[];
const menuLabels = (s: Session) => navIds(s).map((id) => node(s, id).label.content);
const errors = (s: Session) => validateSite(s.doc).problems.filter((p) => p.severity === "error");

describe("addPage", () => {
  it("adds a page with a slug, one text block and a menu item at the end", () => {
    const { session: s } = editor();
    const id = addPage(s, "Ceník");
    if (!id) throw new Error("no page added");
    expect(node(s, id)).toMatchObject({ title: "Ceník", slug: "cenik", seo_description: "" });
    const blocks = node(s, id).blocks.nodes as string[];
    expect(blocks.map((b) => node(s, b).type)).toEqual(["rich_text"]);
    expect(pageIds(s).at(-1)).toBe(id);
    expect(node(s, navIds(s).at(-1) as string)).toMatchObject({ type: "page_link", page_id: id });
    expect(menuLabels(s).at(-1)).toBe("Ceník");
    expect(errors(s)).toEqual([]);
  });

  it("makes the slug unique", () => {
    const { session: s } = editor();
    const id = addPage(s, "Kontakt") as string;
    expect(node(s, id).slug).toBe("kontakt-2");
  });

  it("adds nothing for an empty title", () => {
    const { session: s } = editor();
    const before = s.doc;
    expect(addPage(s, "  ")).toBeUndefined();
    expect(s.doc).toBe(before);
  });

  it("is undone in one step", () => {
    const { session: s } = editor();
    const id = addPage(s, "Ceník") as string;
    s.undo();
    expect(pageIds(s)).toEqual(["page_home", "page_contact"]);
    expect(menuLabels(s)).toEqual(["Úvod", "Kontakt"]);
    expect(s.get(id)).toBeUndefined();
  });
});

describe("deletePage", () => {
  it("removes the page, its blocks and its menu item; links elsewhere become problems", () => {
    const { session: s } = editor();
    const blocks = node(s, "page_contact").blocks.nodes as string[];
    // A text link and the hero's call to action on the home page.
    expect(countLinksTo(s.doc, "page_contact")).toBe(2);
    expect(deletePage(s, "page_contact")).toBe(true);
    expect(pageIds(s)).toEqual(["page_home"]);
    expect(menuLabels(s)).toEqual(["Úvod"]);
    for (const id of ["page_contact", "nav_contact", ...blocks]) expect(s.get(id)).toBeUndefined();
    expect(errors(s).map((p) => [p.code, p.nodeId, p.category])).toEqual([
      ["missing-page", "cta_order", "site"],
      ["missing-page", "internal_contact", "site"],
    ]);
  });

  it("is undone in one step, with the page, its blocks and its menu item in place", () => {
    const { session: s } = editor();
    const before = structuredClone($state.snapshot(s.doc));
    deletePage(s, "page_contact");
    s.undo();
    expect(s.doc).toEqual(before);
  });

  it("refuses the home page and the last page", () => {
    const { session: s } = editor();
    expect(cannotDelete(s.doc, "page_home")).toMatch(/Set another page as home first/);
    expect(deletePage(s, "page_home")).toBe(false);
    expect(pageIds(s)).toEqual(["page_home", "page_contact"]);
    expect(cannotDelete(s.doc, "page_contact")).toBeUndefined();
  });

  it("counts links elsewhere, not links on the page itself or its own menu item", () => {
    const { session: s } = editor();
    // Kontakt: a text link and a call to action on the home page; its menu item doesn't count.
    expect(countLinksTo(s.doc, "page_contact")).toBe(2);
    // Home: only its own menu item points to it.
    expect(countLinksTo(s.doc, "page_home")).toBe(0);
    const copy = duplicatePage(s, "page_contact") as string;
    expect(countLinksTo(s.doc, copy)).toBe(0);
  });
});

describe("setHome", () => {
  it("changes only the home page ID and is undone in one step", () => {
    const { session: s } = editor();
    setHome(s, "page_contact");
    expect(node(s, "site_1").home_page_id).toBe("page_contact");
    expect(node(s, "page_home").slug).toBe("uvod");
    expect(node(s, "page_contact").slug).toBe("kontakt");
    expect(pageIds(s)).toEqual(["page_home", "page_contact"]);
    expect(menuLabels(s)).toEqual(["Úvod", "Kontakt"]);
    expect(errors(s)).toEqual([]);
    s.undo();
    expect(node(s, "site_1").home_page_id).toBe("page_home");
  });

  it("makes the previous home deletable", () => {
    const { session: s } = editor();
    setHome(s, "page_contact");
    expect(deletePage(s, "page_home")).toBe(true);
    expect(errors(s)).toEqual([]);
  });
});

describe("duplicatePage", () => {
  it("copies the richest page under fresh IDs, right after the original", () => {
    const { session: s } = editor();
    const before = new Set(Object.keys(s.doc.nodes));
    const copy = duplicatePage(s, "page_home") as string;
    expect(pageIds(s)).toEqual(["page_home", copy, "page_contact"]);
    expect(node(s, copy)).toMatchObject({ title: "Úvod (copy)", slug: "uvod-copy" });
    expect(navIds(s).map((id) => node(s, id).page_id)).toEqual(["page_home", copy, "page_contact"]);
    expect(menuLabels(s)[1]).toBe("Úvod (copy)");
    const added = Object.keys(s.doc.nodes).filter((id) => !before.has(id));
    // The page, each block and nested node, each mark, and the menu item.
    expect(added.length).toBeGreaterThan(10);
    expect(errors(s)).toEqual([]);
    expect(validateSite(s.doc).problems).toEqual([]);
  });

  it("has the same content, and editing the copy leaves the original alone", () => {
    const { session: s } = editor();
    const copy = duplicatePage(s, "page_home") as string;
    const textOf = (pageId: string) => {
      const [heroId] = node(s, pageId).blocks.nodes as string[];
      return node(s, heroId as string).heading.content as string;
    };
    expect(textOf(copy)).toBe(textOf("page_home"));
    const [copyHero] = node(s, copy).blocks.nodes as string[];
    s.apply(
      s.tr.set([copyHero as string, "heading"], { content: "Jiný", marks: [], annotations: [] }),
    );
    expect(textOf("page_home")).toBe("Čerstvý chléb každé ráno");
  });

  it("keeps links pointing where the original's did", () => {
    const { session: s } = editor();
    const copy = duplicatePage(s, "page_home") as string;
    const copied = [...Object.values(s.doc.nodes)].filter(
      (n) => (n as AnyNode).type === "internal_link",
    ) as AnyNode[];
    // The original's text link to Kontakt, and the copy's.
    expect(copied.length).toBe(2);
    expect(copied.every((n) => n.page_id === "page_contact")).toBe(true);
    expect(copy).not.toBe("page_home");
  });

  it("adds no menu item when the original has none, and is undone in one step", () => {
    const { session: s } = editor();
    showInMenu(s, "page_contact", false);
    const before = structuredClone($state.snapshot(s.doc));
    const copy = duplicatePage(s, "page_contact") as string;
    expect(navIds(s).some((id) => node(s, id).page_id === copy)).toBe(false);
    s.undo();
    expect(s.doc).toEqual(before);
  });
});

describe("setPageTitle", () => {
  it("makes the slug and menu label follow while they match the old title", () => {
    const { session: s } = editor();
    setPageTitle(s, "page_contact", "Napište nám");
    expect(node(s, "page_contact")).toMatchObject({ title: "Napište nám", slug: "napiste-nam" });
    expect(menuLabels(s)).toEqual(["Úvod", "Napište nám"]);
  });

  it("keeps a customised slug and label", () => {
    const { session: s } = editor();
    setPageSlug(s, "page_contact", "about");
    s.apply(
      s.tr.set(["nav_contact", "label"], { content: "Kdo jsme", marks: [], annotations: [] }),
    );
    setPageTitle(s, "page_contact", "O firmě");
    expect(node(s, "page_contact")).toMatchObject({ title: "O firmě", slug: "about" });
    expect(menuLabels(s)).toEqual(["Úvod", "Kdo jsme"]);
  });

  it("follows keystroke by keystroke, and a typing burst undoes as one step", () => {
    const { session: s } = editor();
    for (const title of ["Kontakt", "Kontakty", "Kontakty!"].slice(1)) {
      setPageTitle(s, "page_contact", title);
    }
    expect(node(s, "page_contact")).toMatchObject({ title: "Kontakty!", slug: "kontakty" });
    expect(menuLabels(s)[1]).toBe("Kontakty!");
    s.undo();
    expect(node(s, "page_contact")).toMatchObject({ title: "Kontakt", slug: "kontakt" });
    expect(menuLabels(s)[1]).toBe("Kontakt");
  });
});

describe("setPageSlug and setSeoDescription", () => {
  it("normalises the slug", () => {
    const { session: s } = editor();
    setPageSlug(s, "page_contact", "O Nás!");
    expect(node(s, "page_contact").slug).toBe("o-nas");
  });

  it("sets the SEO description", () => {
    const { session: s } = editor();
    setSeoDescription(s, "page_contact", "Kde nás najdete");
    expect(node(s, "page_contact").seo_description).toBe("Kde nás najdete");
  });
});

describe("menu", () => {
  it("reorders items", () => {
    const { session: s } = editor();
    moveMenuItem(s, 1, 0);
    expect(menuLabels(s)).toEqual(["Kontakt", "Úvod"]);
    s.undo();
    expect(menuLabels(s)).toEqual(["Úvod", "Kontakt"]);
  });

  it("hides a page from the menu and shows it again at the end, without touching the page", () => {
    const { session: s } = editor();
    const page = JSON.stringify(node(s, "page_home"));
    showInMenu(s, "page_home", false);
    expect(menuLabels(s)).toEqual(["Kontakt"]);
    expect(JSON.stringify(node(s, "page_home"))).toBe(page);
    showInMenu(s, "page_home", true);
    expect(menuLabels(s)).toEqual(["Kontakt", "Úvod"]);
  });

  it("never gives a page a second menu item", () => {
    const { session: s } = editor();
    showInMenu(s, "page_contact", true);
    addPage(s, "Ceník");
    const id = duplicatePage(s, "page_contact") as string;
    showInMenu(s, id, true);
    const pageLinks = navIds(s).map((i) => node(s, i).page_id);
    expect(new Set(pageLinks).size).toBe(pageLinks.length);
    expect(validateSite(s.doc).problems.map((p) => p.code)).not.toContain("duplicate-menu-item");
  });

  it("adds, edits and removes external links", () => {
    const { session: s } = editor();
    expect(addExternalLink(s, "Facebook", "https://facebook.com/pekarna")).toMatchObject({
      ok: true,
    });
    const id = navIds(s).at(-1) as string;
    expect(node(s, id)).toMatchObject({
      type: "external_link",
      url: "https://facebook.com/pekarna",
    });
    expect(menuLabels(s)).toEqual(["Úvod", "Kontakt", "Facebook"]);
    setExternalLink(s, id, "Instagram", "https://instagram.com/pekarna");
    expect(node(s, id)).toMatchObject({ url: "https://instagram.com/pekarna" });
    expect(menuLabels(s)[2]).toBe("Instagram");
    removeMenuItem(s, 2);
    expect(menuLabels(s)).toEqual(["Úvod", "Kontakt"]);
    expect(errors(s)).toEqual([]);
  });

  it("refuses unsafe addresses and empty labels", () => {
    const { session: s } = editor();
    const before = s.doc;
    const unsafe = addExternalLink(s, "Mapa", "javascript:alert(1)");
    expect(unsafe.ok).toBe(false);
    expect(!unsafe.ok && unsafe.message).toMatch(/isn't allowed/);
    expect(addExternalLink(s, " ", "https://example.com").ok).toBe(false);
    expect(s.doc).toBe(before);
  });
});

describe("translation keys", () => {
  it("gives a new page its own key", () => {
    const { session: s } = editor();
    const id = addPage(s, "Ceník") as string;
    expect(node(s, id).translation_key).toBe(id);
  });

  it("gives a duplicate its own key, leaving the original's pairing alone", () => {
    const { session: s } = editor();
    const copy = duplicatePage(s, "page_contact") as string;
    expect(node(s, copy).translation_key).toBe(copy);
    expect(node(s, "page_contact").translation_key).toBe("page_contact");
    expect(errors(s)).toEqual([]);
  });
});
