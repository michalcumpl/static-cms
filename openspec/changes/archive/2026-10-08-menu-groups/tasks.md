# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`), and every
site string to each site language. The type check and the untranslated-text test enforce this.

## 1. Model

- [x] 1.1 The `menu_group` type in `nav.items`, `MenuGroupNode`, validation (`empty-link-label`
  for a group, `empty-menu-group`, duplicates across groups) (decision 1). Verify with unit
  tests "Projects grouped", "A page in a group and outside it", "Group without a label or
  links" and "Group inside a group".
- [x] 1.2 The builder's `menuGroup` (decision 5). Verify: its every-block site has a group and
  validates.

## 2. Rendering and export

- [x] 2.1 The group markup, the current group's style, styles for wide and narrow headers
  (decision 2). Verify with unit tests "Projects grouped", "Current page inside a group", an
  empty group not rendered, `html-validate`, and snapshots unchanged apart from the stylesheet.
- [x] 2.2 `MENU_SCRIPT`, `useScript("menu")` and the export (decision 2). Verify with unit test
  "No groups, no script", an export test for `assets/menu.js`, and e2e "Escape closes the
  group" and "Click outside" in a browser.

## 3. Editor

- [x] 3.1 Menu positions in `state.svelte.ts` and the menu actions in `pages.ts` (groups, moves
  between lists, hiding and deleting pages in groups) (decision 3). Verify with unit tests for
  each action and its undo, "Remove a group" and "Hide a page that is in a group".
- [x] 3.2 The sidebar: groups and their links, "Add group", the "⋯" actions, dragging into and
  out of groups (decision 3). Verify with e2e "Group four pages" and "Remove a group".
- [x] 3.3 The canvas's `MenuGroup` with its editable label (decision 3). Verify with e2e "Edit a
  group's label on the canvas".

## 4. Languages

- [x] 4.1 Copying a page finds its link inside groups (decision 4). Verify with unit test "Copy a
  page from a menu group".

## 5. Example and finish

- [x] 5.1 Scénografie's menu with the "Projekty" group (local only), checked and with a
  screenshot of the open group at desktop and phone widths.
- [x] 5.2 Mark `docs/layouts.md` item 18 and `docs/roadmap.md` row 9g done; run typecheck, lint,
  unit tests and the full e2e suite, and record any deviations in design.md under "Changes made
  while building".
