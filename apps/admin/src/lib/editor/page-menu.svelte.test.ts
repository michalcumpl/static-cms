import { describe, expect, it, vi } from "vitest";
import { i18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { linkMenuEntries, type PageMenuActions, pageMenuEntries } from "./page-menu";
import { addExternalLink, addPage } from "./pages";
import { type EditorPage, EditorState } from "./state.svelte";

const { t } = i18n("en");

function editor() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
}

const actions = (): PageMenuActions => ({
  rename: vi.fn(),
  confirmDelete: vi.fn(),
  duplicated: vi.fn(),
  editLink: vi.fn(),
});

const entries = (e: EditorState, page: EditorPage, a = actions()) => pageMenuEntries(e, page, t, a);
const labels = (list: { label: string }[]) => list.map((x) => x.label);
const page = (e: EditorState, id: string) => e.pages.find((p) => p.id === id) as EditorPage;
const named = <T extends { label: string }>(list: T[], label: string) =>
  list.find((x) => x.label === label) as T;

describe("the menu of a page in the menu section", () => {
  it("offers every action, with the moves for a page in the menu", () => {
    const e = editor();
    expect(labels(entries(e, page(e, "page_contact")))).toEqual([
      "Rename",
      "Duplicate",
      "Move up",
      "Move down",
      "Remove from menu",
      "Set as home",
      "Delete",
    ]);
  });

  it("disables Move up on the first entry and Move down on the last, with the reason", () => {
    const e = editor();
    const first = entries(e, page(e, "page_home"));
    expect(named(first, "Move up").disabledReason).toBe("Already first in the menu");
    expect(named(first, "Move down").disabledReason).toBeUndefined();
    const last = entries(e, page(e, "page_contact"));
    expect(named(last, "Move down").disabledReason).toBe("Already last in the menu");
    expect(named(last, "Move up").disabledReason).toBeUndefined();
  });

  it("moves the menu item", () => {
    const e = editor();
    named(entries(e, page(e, "page_contact")), "Move up").run();
    expect(e.menu.map((m) => (m.kind === "page" ? m.page.id : m.label))).toEqual([
      "page_contact",
      "page_home",
    ]);
  });

  it("can't delete or re-home the home page, and says why", () => {
    const e = editor();
    const home = entries(e, page(e, "page_home"));
    expect(named(home, "Delete").disabledReason).toBe(
      "The home page can't be deleted. Set another page as home first.",
    );
    expect(named(home, "Set as home").disabledReason).toBe("Already the home page");
    expect(named(entries(e, page(e, "page_contact")), "Delete").disabledReason).toBeUndefined();
  });

  it("sets another page as home", () => {
    const e = editor();
    named(entries(e, page(e, "page_contact")), "Set as home").run();
    expect(e.pages.find((p) => p.isHome)?.id).toBe("page_contact");
  });

  it("asks the component to confirm before deleting, and to rename", () => {
    const e = editor();
    const a = actions();
    const list = entries(e, page(e, "page_contact"), a);
    named(list, "Delete").run();
    named(list, "Rename").run();
    expect(a.confirmDelete).toHaveBeenCalledWith(page(e, "page_contact"));
    expect(a.rename).toHaveBeenCalledWith(page(e, "page_contact"));
    // Nothing was deleted by the menu itself.
    expect(e.pages).toHaveLength(2);
  });

  it("duplicates and reports the new page", () => {
    const e = editor();
    const a = actions();
    named(entries(e, page(e, "page_contact"), a), "Duplicate").run();
    expect(e.pages).toHaveLength(3);
    expect(a.duplicated).toHaveBeenCalledWith(e.pages[2]?.id);
  });
});

describe("the menu of a page that isn't in the menu", () => {
  it("offers Show in menu and no moves", () => {
    const e = editor();
    const id = addPage(e.session, "Ceník") as string;
    named(entries(e, page(e, id)), "Remove from menu").run();
    const list = entries(e, page(e, id));
    expect(labels(list)).toEqual(["Rename", "Duplicate", "Show in menu", "Set as home", "Delete"]);
    named(list, "Show in menu").run();
    expect(page(e, id).menuIndex).toBeDefined();
  });
});

describe("the menu of an external link", () => {
  it("offers Edit, the moves and Remove from menu", () => {
    const e = editor();
    addExternalLink(e.session, "Facebook", "https://facebook.com/anideti");
    const link = e.menu.find((m) => m.kind === "external");
    if (link?.kind !== "external") throw new Error("no link");
    const a = actions();
    const list = linkMenuEntries(e, link, t, a);
    expect(labels(list)).toEqual(["Edit", "Move up", "Move down", "Remove from menu"]);
    expect(named(list, "Move down").disabledReason).toBe("Already last in the menu");
    named(list, "Edit").run();
    expect(a.editLink).toHaveBeenCalledWith(link);
    named(list, "Remove from menu").run();
    expect(e.menu.some((m) => m.kind === "external")).toBe(false);
  });
});
