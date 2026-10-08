# Design

## Context

See proposal.md for the motivation. The current state:

- **The menu** is the site's `nav` node with `items: node_array<page_link | external_link>`
  (`LINK_TYPES`). `checkMenu` warns about a page linked twice; link labels and addresses are
  checked generically (`empty-link-label`, `unsafe-link`).
- **Rendering:** `renderDocument` (`page.ts`) writes `<nav class="site-nav"><ul>` with one `<li>`
  per item; the header wraps on narrow screens (no menu button). Scripts per page and per site
  come from `ctx.useScript` (`"video" | "slideshow"`), and the export writes each.
- **Editor:** `state.svelte.ts` flattens the menu to `MenuEntry` with a top-level `index`;
  `pages.ts` (`showInMenu`, `moveMenuItem`, `removeMenuItem`, `deletePage`, `duplicatePage`)
  reads and writes `nav.items` directly; `PagesSidebar.svelte` drags entries by index;
  `page-menu.ts` builds each entry's "⋯" menu; the canvas renders `Nav.svelte` with
  `PageLink`/`ExternalLink` children, labels editable.
- **Languages:** `translations.ts` (copying a page) looks for the page's link in `nav.items`
  only.

## Goals / Non-Goals

**Goals:**
- Fewer top-level menu items on sites with many pages, with a dropdown that works without
  JavaScript and follows the disclosure pattern.
- Grouping and ungrouping without retyping links, each one undoable step.

**Non-Goals:**
- Group labels that link, nested groups, a full-screen menu panel, a secondary menu, a menu
  button for small screens (a later `mobile-menu` if the wrapped row proves too tall).

## Decisions

### 1. A `menu_group` node in the nav, no format change

```
nav         items: node_array<page_link | external_link | menu_group>
menu_group  label: text (one line), items: node_array<page_link | external_link>
```

- **A node type, not a flag on links:** a group owns its order and label, and removing it is one
  splice. `menu_group.items` uses `LINK_TYPES`, so nesting is impossible by schema.
- **No format bump:** existing nodes gain no properties, as with `cards` and `video`, which added
  node types without one.
- **Validation:** an empty label uses the existing `empty-link-label` ("Menu group 2 needs a
  label."); no links → new `empty-menu-group` warning, and the renderer skips the group;
  `checkMenu` walks the groups' items for duplicates. Group items get the generic checks through
  `visit(site.nav, "in the menu")`, which already recurses.

### 2. Rendering: `<details>` in the menu row

```html
<nav class="site-nav">
  <ul>
    <li class="menu-group">
      <details name="site-menu">
        <summary>Projekty</summary>
        <ul>
          <li><a href="/tv-a-film/">TV a film</a></li>
          <li><a href="/eventy/" aria-current="page">Eventy</a></li>
        </ul>
      </details>
    </li>
    <li><a href="/o-nas/">O nás</a></li>
  </ul>
</nav>
```

- **`<details>`/`<summary>`** gives the button, `aria-expanded` and toggling without script;
  `name` makes one group open at a time (supported in current browsers; older ones just allow
  several open).
- **Current group:** `.menu-group:has([aria-current="page"]) summary` takes the current-link
  style; no extra attribute, since `aria-current` belongs to the link.
- **Styles:** the summary looks like a menu link with a small chevron drawn in CSS (no marker);
  the open list is a panel under the summary (`position: absolute`, theme background, border in
  `--color-secondary`, `var(--radius)`); in a narrow header (container query on
  `.site-header .container`) the panel is in flow under its summary instead, so nothing covers
  the page. Theme values only, no comments.
- **Script (`MENU_SCRIPT`, `assets/menu.js`, well under 1 KB):** closes the open `details` on
  `keydown` Escape (focus to its summary), on a `click` outside it, and on `focusout` when the new
  focus is outside. `useScript("menu")` is called while rendering the header of a site with a
  shown group, so every page of that site gets the tag, and the 404 page too.

### 3. Editor: menu positions instead of indexes

- **`MenuEntry`** gains `kind: "group"` (with `itemId`, `label`, `entries`) and every entry a
  `position: { group?: string; index: number }`. `sitePages` reads a page's link inside groups
  too (`menuIndex` becomes `menuPosition`).
- **`pages.ts`:** a helper finds a link anywhere in the menu (`findMenuLink`); `moveMenuItem`
  takes two positions (within a list, into a group, out of it); `addMenuGroup(label)`,
  `renameMenuGroup`, `removeMenuGroup` (splices the group's items into its place);
  `showInMenu(false)`, `deletePage` and `removeMenuItem` remove from wherever the link is.
  `duplicatePage` adds the duplicate's link after the original's, in the same list.
- **Sidebar:** groups show as entries with their links indented beneath; "Add group" next to
  "Add link" opens a small dialog for the label. Dragging onto an entry inside a group drops into
  that group; a group can't be dropped into a group. The "⋯" menu holds the keyboard way:
  "Move to group" (a submenu of the groups' names, or the names as separate entries "Move to
  Projekty" if `PopoverMenu` has no submenus), "Move out of group", Move up/down within the list.
  A group's menu: Rename, Move up, Move down, Remove group.
- **Canvas:** `nodes/MenuGroup.svelte` renders the label editable with a chevron and its
  children in a list shown while the group has focus within (`:focus-within`), so links inside
  it stay editable; `Child` handles nav children as now.

### 4. Languages

`translations.ts` finds the page's link with the same walk over groups; the copy's link still
goes at the end of the target's top level, since the target may have no matching group.

### 5. Builder and example

`site.menuGroup(label, [pages by slug | links])` places a group in the menu in the order of
calls among pages marked `menu`; pages listed in a group need no `menu` of their own. Locally,
Scénografie's menu becomes: Úvod, Projekty ▾ (TV a film, Eventy, Výstavy, Interiéry), Výroba,
O nás, Kontakty.

## Risks / Trade-offs

- **[A third script]** Same rules as the others: static, no content, `defer`, only on sites
  that need it; the menu works without it.
- **[Dropdowns on touch screens]** `<summary>` opens on tap like a button; the panel in flow on
  narrow headers avoids menus covering content they can't scroll.
- **[Group label isn't a link]** An owner who wants a "Projekty" overview page adds it to the
  group as its first link; a later change can make labels links if owners ask.
- **[`name` on `<details>`]** Older browsers ignore it and let two groups be open; the script
  closes groups on focus leaving, which covers most of it.

## Migration Plan

None: the format is unchanged, and menus without groups render exactly as before (snapshot
tests unchanged apart from the stylesheet).

## Changes made while building

- **The builder leaves grouped pages out of the top level:** a page listed in a group by slug
  is not also a menu link outside it, so `menu: "label"` on a grouped page only sets its label;
  a group goes before the first menu page added after it.
- **The menu script is noted by the head**, not while rendering the header: the head is written
  first. `RenderContext.menuItems()` leaves out groups without links for both.
- **On the canvas, a group opens while the selection is inside it** (by the selection's path),
  not on `:focus-within`: the canvas's editable root keeps the focus.
- **Moving an item between lists sets the new list first:** Svedit deletes a node as soon as no
  list refers to it.
- **"Move to group" lists the groups by name** under a "Move to group" heading in the "⋯" menu
  (`PopoverMenu` groups entries, it has no submenus); moving past a list's end puts the item at
  the end.
- **The language list's "in menu" mark** (`languagePages`) also counts links inside groups.
