import type { I18n } from "$lib/i18n";
import type { MenuEntry as MenuItem } from "$lib/ui/PopoverMenu.svelte";
import {
  cannotDelete,
  duplicatePage,
  type MenuPosition,
  moveMenuItem,
  removeMenuGroup,
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
  renameGroup(entry: Extract<MenuEntry, { kind: "group" }>): void;
}

/** The entries of the list an item is in: the menu, or its group's links. */
function siblings(editor: EditorState, position: MenuPosition): MenuEntry[] {
  if (position.group === undefined) return editor.menu;
  const group = editor.menu.find((e) => e.itemId === position.group);
  return group?.kind === "group" ? group.entries : [];
}

/** Move up and Move down within the item's list, disabled at the ends with the reason. */
function moves(editor: EditorState, position: MenuPosition, t: I18n["t"]): MenuItem[] {
  const inGroup = position.group !== undefined;
  const last = siblings(editor, position).at(-1)?.position.index ?? 0;
  const to = (index: number) => ({ group: position.group, index });
  return [
    {
      label: t("editor.pageMenu.moveUp"),
      disabledReason:
        position.index <= 0
          ? t(inGroup ? "editor.pageMenu.firstInGroup" : "editor.pageMenu.firstInMenu")
          : undefined,
      run: () => moveMenuItem(editor.session, position, to(position.index - 1)),
    },
    {
      label: t("editor.pageMenu.moveDown"),
      disabledReason:
        position.index >= last
          ? t(inGroup ? "editor.pageMenu.lastInGroup" : "editor.pageMenu.lastInMenu")
          : undefined,
      run: () => moveMenuItem(editor.session, position, to(position.index + 1)),
    },
  ];
}

/** "Move out of group" for a link in a group (it goes right after the group), else "Move to …". */
function grouping(editor: EditorState, position: MenuPosition, t: I18n["t"]): MenuItem[] {
  if (position.group !== undefined) {
    const group = editor.menu.find((e) => e.itemId === position.group);
    return [
      {
        label: t("editor.pageMenu.moveOutOfGroup"),
        run: () =>
          moveMenuItem(editor.session, position, { index: (group?.position.index ?? -1) + 1 }),
      },
    ];
  }
  return editor.menu.flatMap((entry) =>
    entry.kind === "group"
      ? [
          {
            label: entry.label,
            group: t("editor.pageMenu.moveToGroup"),
            run: () =>
              moveMenuItem(editor.session, position, {
                group: entry.itemId,
                index: Number.MAX_SAFE_INTEGER,
              }),
          },
        ]
      : [],
  );
}

/** The actions for a page, in the sidebar's menu section or under "Not in menu". */
export function pageMenuEntries(
  editor: EditorState,
  page: EditorPage,
  t: I18n["t"],
  actions: PageMenuActions,
): MenuItem[] {
  const position = page.menuPosition;
  const inMenu = position !== undefined;
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
    ...(position ? [...moves(editor, position, t), ...grouping(editor, position, t)] : []),
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
    ...moves(editor, entry.position, t),
    ...grouping(editor, entry.position, t),
    {
      label: t("editor.pageMenu.removeFromMenu"),
      run: () => removeMenuItem(editor.session, entry.position),
    },
  ];
}

/** The actions for a group of the menu. */
export function groupMenuEntries(
  editor: EditorState,
  entry: Extract<MenuEntry, { kind: "group" }>,
  t: I18n["t"],
  actions: PageMenuActions,
): MenuItem[] {
  return [
    { label: t("editor.pageMenu.rename"), run: () => actions.renameGroup(entry) },
    ...moves(editor, entry.position, t),
    {
      label: t("editor.pageMenu.removeGroup"),
      run: () => removeMenuGroup(editor.session, entry.itemId),
    },
  ];
}
