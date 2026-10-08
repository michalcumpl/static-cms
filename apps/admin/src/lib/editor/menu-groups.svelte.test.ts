import { validateSite } from "@webmio/model";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { i18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { groupMenuEntries, pageMenuEntries } from "./page-menu";
import {
  addMenuGroup,
  addPage,
  deletePage,
  duplicatePage,
  moveMenuItem,
  removeMenuGroup,
  renameMenuGroup,
  setPageTitle,
  showInMenu,
} from "./pages";
import { EditorState } from "./state.svelte";

// Groups in the menu, in the editor (menu-groups, site-editing delta).

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

const node = (s: Session, id: string) => s.get(id) as AnyNode;
const label = (s: Session, id: string) => node(s, id).label.content as string;
/** The menu as labels, a group as `{ label: [its labels] }`. */
const menu = (s: Session): unknown[] =>
  (node(s, "nav_1").items.nodes as string[]).map((id) =>
    node(s, id).type === "menu_group"
      ? { [label(s, id)]: (node(s, id).items.nodes as string[]).map((i) => label(s, i)) }
      : label(s, id),
  );
const errors = (s: Session) => validateSite(s.doc).problems.filter((p) => p.severity === "error");

/** The demo site (Úvod, Kontakt) with pages "Eventy" and "Výstavy", and a group "Projekty". */
function editor() {
  const state = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
  const s = state.session;
  const eventy = addPage(s, "Eventy") as string;
  const vystavy = addPage(s, "Výstavy") as string;
  const group = addMenuGroup(s, " Projekty ") as string;
  return { state, s, eventy, vystavy, group };
}

describe("menu groups", () => {
  it("adds a labelled, empty group at the end, and none without a label", () => {
    const { s, group } = editor();
    expect(menu(s)).toEqual(["Úvod", "Kontakt", "Eventy", "Výstavy", { Projekty: [] }]);
    expect(node(s, group)).toMatchObject({ type: "menu_group" });
    expect(addMenuGroup(s, " ")).toBeUndefined();
  });

  it("Group four pages: moves pages in one at a time, each one undo", () => {
    const { s, group } = editor();
    moveMenuItem(s, { index: 2 }, { group, index: 0 });
    moveMenuItem(s, { index: 2 }, { group, index: 1 });
    expect(menu(s)).toEqual(["Úvod", "Kontakt", { Projekty: ["Eventy", "Výstavy"] }]);
    expect(errors(s)).toEqual([]);
    s.undo();
    expect(menu(s)).toEqual(["Úvod", "Kontakt", "Výstavy", { Projekty: ["Eventy"] }]);
  });

  it("moves within a group, out of it, and refuses a group inside a group", () => {
    const { s, group } = editor();
    moveMenuItem(s, { index: 2 }, { group, index: 0 });
    moveMenuItem(s, { index: 2 }, { group, index: 9 });
    moveMenuItem(s, { group, index: 1 }, { group, index: 0 });
    expect(menu(s)).toEqual(["Úvod", "Kontakt", { Projekty: ["Výstavy", "Eventy"] }]);
    moveMenuItem(s, { group, index: 0 }, { index: 0 });
    expect(menu(s)).toEqual(["Výstavy", "Úvod", "Kontakt", { Projekty: ["Eventy"] }]);
    const other = addMenuGroup(s, "Výroba") as string;
    const before = s.doc;
    moveMenuItem(s, { index: 4 }, { group, index: 0 });
    expect(s.doc).toBe(before);
    expect(node(s, other).items.nodes).toEqual([]);
  });

  it("renames a group, refusing an empty label", () => {
    const { s, group } = editor();
    expect(renameMenuGroup(s, group, "Realizace")).toBe(true);
    expect(renameMenuGroup(s, group, "")).toBe(false);
    expect(label(s, group)).toBe("Realizace");
  });

  it("Remove a group: its links stay where it was, in order", () => {
    const { s, group } = editor();
    moveMenuItem(s, { index: 4 }, { index: 1 });
    moveMenuItem(s, { index: 3 }, { group, index: 0 });
    moveMenuItem(s, { index: 3 }, { group, index: 1 });
    expect(menu(s)).toEqual(["Úvod", { Projekty: ["Eventy", "Výstavy"] }, "Kontakt"]);
    removeMenuGroup(s, group);
    expect(menu(s)).toEqual(["Úvod", "Eventy", "Výstavy", "Kontakt"]);
    s.undo();
    expect(menu(s)).toEqual(["Úvod", { Projekty: ["Eventy", "Výstavy"] }, "Kontakt"]);
  });

  it("Hide a page that is in a group, and show it again at the end of the menu", () => {
    const { s, group, eventy } = editor();
    moveMenuItem(s, { index: 2 }, { group, index: 0 });
    moveMenuItem(s, { index: 2 }, { group, index: 1 });
    showInMenu(s, eventy, false);
    expect(menu(s)).toEqual(["Úvod", "Kontakt", { Projekty: ["Výstavy"] }]);
    showInMenu(s, eventy, true, { group, index: 0 });
    expect(menu(s)).toEqual(["Úvod", "Kontakt", { Projekty: ["Eventy", "Výstavy"] }]);
  });

  it("deletes, duplicates and renames pages in a group in their place", () => {
    const { s, group, eventy, vystavy } = editor();
    moveMenuItem(s, { index: 2 }, { group, index: 0 });
    moveMenuItem(s, { index: 2 }, { group, index: 1 });
    duplicatePage(s, eventy);
    setPageTitle(s, vystavy, "Výstavy a veletrhy");
    expect(menu(s)).toEqual([
      "Úvod",
      "Kontakt",
      { Projekty: ["Eventy", "Eventy (copy)", "Výstavy a veletrhy"] },
    ]);
    deletePage(s, eventy);
    expect(menu(s)).toEqual([
      "Úvod",
      "Kontakt",
      { Projekty: ["Eventy (copy)", "Výstavy a veletrhy"] },
    ]);
    expect(errors(s)).toEqual([]);
  });

  it("lists groups in the editor's menu, and pages in them by position", () => {
    const { state, s, group, eventy } = editor();
    moveMenuItem(s, { index: 2 }, { group, index: 0 });
    expect(state.menu.map((e) => e.kind)).toEqual(["page", "page", "page", "group"]);
    const entry = state.menu[3];
    expect(entry?.kind === "group" && entry.entries.map((e) => e.itemId)).toHaveLength(1);
    expect(state.pages.find((p) => p.id === eventy)?.menuPosition).toEqual({ group, index: 0 });
  });

  it("offers each group in a page's actions, and moving out of a group", () => {
    const { state, s, group, eventy } = editor();
    const { t } = i18n("en");
    const actions = {
      rename() {},
      confirmDelete() {},
      duplicated() {},
      editLink() {},
      renameGroup() {},
    };
    const page = () => state.pages.find((p) => p.id === eventy) as never;
    const into = pageMenuEntries(state, page(), t, actions).find((e) => e.label === "Projekty");
    expect(into?.group).toBe("Move to group");
    into?.run();
    expect(menu(s)).toEqual(["Úvod", "Kontakt", "Výstavy", { Projekty: ["Eventy"] }]);
    const entries = pageMenuEntries(state, page(), t, actions);
    expect(entries.find((e) => e.label === "Move up")?.disabledReason).toBe(
      "Already first in the group",
    );
    entries.find((e) => e.label === "Move out of group")?.run();
    expect(menu(s)).toEqual(["Úvod", "Kontakt", "Výstavy", { Projekty: [] }, "Eventy"]);
    const groupEntry = state.menu.find((e) => e.kind === "group") as never;
    groupMenuEntries(state, groupEntry, t, actions)
      .find((e) => e.label === "Remove group (keep its links)")
      ?.run();
    expect(menu(s)).toEqual(["Úvod", "Kontakt", "Výstavy", "Eventy"]);
    expect(node(s, "nav_1").items.nodes).not.toContain(group);
  });
});
