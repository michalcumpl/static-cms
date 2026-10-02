import type { I18n } from "$lib/i18n";
import type { MenuEntry as MenuItem } from "$lib/ui/PopoverMenu.svelte";
import {
  cannotDelete,
  duplicatePage,
  moveMenuItem,
  removeMenuItem,
  setHome,
  showInMenu,
} from "./pages";
import type { EditorPage, EditorState, MenuEntry } from "./state.svelte";

// What the "⋯" menu of an entry in the pages list offers (project-tabs design.md decision 6).
// The rules for what is possible live here, apart from the markup, so they can be tested alone.

/** What the menu needs from the component: dialogs to open and where to go afterwards. */
export interface PageMenuActions {
  rename(page: EditorPage): void;
  /** Asks to confirm, then deletes. */
  confirmDelete(page: EditorPage): void;
  /** The editor switches to the page the duplicate made. */
  duplicated(pageId: string): void;
  editLink(entry: Extract<MenuEntry, { kind: "external" }>): void;
}

/** The menu's last item index, for telling the last entry from the others. */
const lastIndex = (editor: EditorState) => editor.menu.at(-1)?.index ?? 0;

/** Move up and Move down for the menu item at `index`, disabled at the ends with the reason. */
function moves(editor: EditorState, index: number, t: I18n["t"]): MenuItem[] {
  return [
    {
      label: t("editor.pageMenu.moveUp"),
      disabledReason: index <= 0 ? t("editor.pageMenu.firstInMenu") : undefined,
      run: () => moveMenuItem(editor.session, index, index - 1),
    },
    {
      label: t("editor.pageMenu.moveDown"),
      disabledReason: index >= lastIndex(editor) ? t("editor.pageMenu.lastInMenu") : undefined,
      run: () => moveMenuItem(editor.session, index, index + 1),
    },
  ];
}

/** The actions for a page, in the sidebar's menu section or under "Not in menu". */
export function pageMenuEntries(
  editor: EditorState,
  page: EditorPage,
  t: I18n["t"],
  actions: PageMenuActions,
): MenuItem[] {
  const inMenu = page.menuIndex !== undefined;
  const reason = cannotDelete(editor.session.doc, page.id);
  return [
    { label: t("editor.pageMenu.rename"), run: () => actions.rename(page) },
    {
      label: t("editor.pageMenu.duplicate"),
      run: () => {
        const id = duplicatePage(editor.session, page.id);
        if (id) actions.duplicated(id);
      },
    },
    ...(page.menuIndex !== undefined ? moves(editor, page.menuIndex, t) : []),
    {
      label: inMenu ? t("editor.pageMenu.removeFromMenu") : t("editor.pageMenu.showInMenu"),
      run: () => showInMenu(editor.session, page.id, !inMenu),
    },
    {
      label: t("editor.pageMenu.setHome"),
      disabledReason: page.isHome ? t("editor.pageMenu.alreadyHome") : undefined,
      run: () => setHome(editor.session, page.id),
    },
    {
      label: t("editor.pageMenu.delete"),
      disabledReason: reason ? t(`editor.page.cannotDelete.${reason}`) : undefined,
      run: () => actions.confirmDelete(page),
    },
  ];
}

/** The actions for an external link of the menu. */
export function linkMenuEntries(
  editor: EditorState,
  entry: Extract<MenuEntry, { kind: "external" }>,
  t: I18n["t"],
  actions: PageMenuActions,
): MenuItem[] {
  return [
    { label: t("editor.pageMenu.edit"), run: () => actions.editLink(entry) },
    ...moves(editor, entry.index, t),
    {
      label: t("editor.pageMenu.removeFromMenu"),
      run: () => removeMenuItem(editor.session, entry.index),
    },
  ];
}
