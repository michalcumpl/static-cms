# Proposal

## Why

Sites with many pages outgrow a single row of menu links: Scénografie's menu has a "Projekty"
group of four pages and a "Zakázková výroba" group of three, plus About and Contact
(`docs/layouts.md`, item 18). Our menu holds only flat links, so its example shows eight items in
one row that wraps on most screens (`docs/roadmap.md`, row 9g).

## What Changes

- **Menu groups:** a menu item can be a group: a label (such as "Projekty") and its own list of
  page links and outside links. Groups are one level deep: a group holds no groups. The group's
  label is not a link.
- **On the site, a group is a dropdown in the menu row** (chosen 2026-10-08 over Scénografie's
  full-screen panel): a button with the group's label that opens its links below it. Links
  outside groups stay plain links beside it, so "About" and "Contact" need no second menu. The
  dropdown is a `<details>` element, so it opens and closes without JavaScript; one open group
  closes the others. A small script, `assets/menu.js`, on every page of a site with groups,
  closes the open group on Escape, on a click outside and when focus leaves it. The group
  holding the current page is marked like a current link.
- **Validation:** a group needs a label (error); a group without links is a warning and isn't
  shown; a page linked twice is reported wherever its links are, inside groups or not.
- **In the editor:** the sidebar's Menu section shows groups with their links indented under
  them. "Add group" asks for a label and adds an empty group at the end. A page or link's "⋯"
  menu gains "Move to group" (with the groups' names) and "Move out of group"; Move up and Move
  down move it within its own list; dragging moves entries within and between the menu and its
  groups. A group's "⋯" menu has Rename, Move up, Move down and "Remove group", which keeps its
  links in the menu where the group was. Every action is one undoable action. On the canvas a
  group's label is editable in place, and its links show (and stay editable) while the caret
  is inside the group.
- **Pages and languages:** hiding or deleting a page removes its link from a group too; copying
  a page into another language finds its menu item inside a group as well, and the copy's item
  goes at the end of the target menu, outside any group.
- **No format change:** no existing node gains properties; the menu only accepts one more item
  type.
- **The builder** writes groups, and the local Scénografie example groups its four project
  categories under "Projekty".

Not in this change: groups that are also links, nested groups, Scénografie's full-screen menu
panel, a separate secondary menu, and a menu button that folds the whole menu on small screens.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: Navigation (items can be groups of links, with their checks).
- `site-rendering`: Navigation rendering (groups as dropdowns, the current page's group marked,
  the menu script).
- `site-editing`: Menu management (groups in the sidebar and on the canvas; sub-items are now
  allowed one level deep).
- `languages`: Copying a page into another language (its menu item may be in a group).

## Impact

- `@webmio/model`: `menu_group` type and `nav.items` node types; `MenuGroupNode`; validation in
  `checkMenu`; the builder's `menuGroup`; `translations.ts` (copying a page).
- `@webmio/render`: `page.ts` (the header's menu), `MENU_SCRIPT`, `SiteScript` gains `"menu"`,
  styles in `css.ts`, strings if the script needs any.
- `@webmio/export`: writes `assets/menu.js` (through the existing scripts map).
- Admin: `state.svelte.ts` (`sitePages`, `siteMenu` walk groups), `pages.ts` (menu actions by
  position in a group), `page-menu.ts`, `PagesSidebar.svelte`, the canvas's nav nodes, i18n.
- Local only: Scénografie's `build.ts`.
