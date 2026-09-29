# Design

## Context

See proposal.md for the motivation. The code as it stands:

- **Document (`packages/site`).**
  - `site.pages` is a `node_array` of pages. The home page is `pages[0]`, and validation requires its slug to be empty (`domain.ts`, `home-slug`).
  - `RenderContext` builds routes from list positions (`index === 0` → `index.html`). `page.ts` compares against `pages.nodes[0]` for the title and the site-name link.
  - `nav.items` holds `page_link` (`label: text`, `page_id: string`) and `external_link` nodes. Text links to pages are `internal_link` marks with a `page_id` string. Marks are nodes, referenced from text as `{ start_offset, end_offset, node_id }`.
- **Editor (`apps/admin`).**
  - `EditorState` builds `pages` once in its constructor and tracks `pageIndex`. The route `edit/[[slug]]` maps a slug to an index.
  - `isFixedList` locks `pages` and `nav.items` on the canvas.
  - A window-level `KeyMapper` holds the app's shortcuts (save). Svedit pushes its own scope while the canvas has focus.
- **Svedit 0.14.**
  - `tr.set` on a `node_array` cascade-deletes nodes that are no longer referenced.
  - `session.apply(tr, { batch: true })` merges transactions that arrive within about a second into one history entry.
  - `node`/`node_array` properties are ownership references. A string property holding an ID is not a reference, as with `page_link.page_id`.
- **Server.** `site-documents.ts#readSite` is the single place stored documents are read for the editor API, the preview and the ZIP.

## Goals / Non-Goals

**Goals:**
- Page and menu actions are ordinary Svedit transactions: one history, undo covers everything, saving is unchanged.
- Page logic lives in pure functions over a transaction, tested without a browser.
- Stored documents upgrade transparently, without a database migration.

**Non-Goals:**
- A general node-cloning facility for Svedit. The page duplicator only knows this schema.
- Drag-and-drop between the sidebar and the canvas.

## Decisions

### 1. `home_page_id` is a string, not a `node` property

The site gets `home_page_id: { type: "string" }`, validated to name a page in `site.pages`.

- **Why not `type: "node"`:** Svedit treats `node` properties as ownership. The home page would be referenced twice, from `pages` and from `home_page_id`. Removing it from `pages` would then not cascade-delete it, and reachability and cycle checks would see two parents. A string ID matches how `page_link.page_id` and `internal_link.page_id` already refer to pages.
- **Cost:** nothing keeps the string in sync automatically. The editor forbids deleting the home page, and validation reports `missing-home` (category `site`) if it ever dangles, for example after a hand-edited import.

### 2. Validation and messages

- `home-slug` is removed. `checkPageSlug` applies the same rule to every page.
- New codes:
  - `missing-home`: error, category `site`;
  - `duplicate-menu-item`: warning, category `site`, on the second `page_link` to a page.
- `schema_version` must be `2`. A version-1 document fails with the existing unsupported-version error, which is correct for callers that skip the upgrade.
- **Readable messages.** A small `pageLabel(page)` helper returns `"<title>"`, or `untitled page` when the title is empty. It is used in page, slug, home and link messages. `missing-page` can't name a page that no longer exists, so it says "links to a page that no longer exists". The `nodeId` and `property` fields stay, since the problems panel uses them to navigate.

### 3. `migrateSite(doc)` in `packages/site`

`migrateSite(doc)` is a pure function, exported from the package. For a version-1 site node it:
- sets `home_page_id = pages.nodes[0]`;
- gives that page a slug from its title: `slugify(title)`, falling back to `home`, then made unique with `-2`, `-3`, …;
- sets `schema_version: 2`.

Anything else, including a version-2 or unrecognisable document, is returned unchanged; validation reports what is wrong. The same unique-slug helper (`uniqueSlug(base, taken)`) serves the editor's add and duplicate actions.

**Where it runs:**
- `readSite` calls it before validating and returning. The returned `version` is the stored one, so the next save passes the conflict check and stores version 2.
- The starter site and `packages/site/fixtures/*.json` are rewritten to version 2, so new projects never need the upgrade.
- Tests keep one version-1 fixture for the upgrade path.

**Alternative:** a startup migration that rewrites every current document as a new version. It was rejected: it creates versions nobody saved, and it doesn't cover documents imported later by `import-working-copy`, which stores the raw file. Upgrading on read covers all paths.

### 4. Rendering and export follow `home_page_id`

- `RenderContext` builds routes with `pageId === site.home_page_id` in place of `index === 0`.
- `page.ts` uses `ctx.homeId` for the title and the site-name link.
- Export and the sitemap already iterate the routes, so the file layout and the sitemap follow automatically. The home page's slug is never emitted.
- Snapshot tests are regenerated. The HTML of existing fixtures stays byte-identical, since their home is still first. One new fixture puts home second.

### 5. Editor state: derived pages, current page by ID

- `EditorState.pages` becomes a `$derived` over `session.doc`: `{ id, title, slug, isHome, menuIndex | undefined }` in document order. Two more derived lists feed the sidebar: `menu` (`nav.items` resolved to pages or external links) and `unlisted`.
- `pageIndex` is replaced by `currentPageId`. The canvas renders the page with that ID.
- **Routes:** `edit/[[pageId]]`. `+page.ts` resolves a missing `pageId` to `home_page_id` and returns 404 for an ID that isn't a page. `projectPaths.edit(pageId?)` builds the URLs.
- **When the current page disappears** from the document (deleted, or an "add page" undone), an effect calls `goto(paths.edit(), { replaceState: true })`. An explicit delete navigates the same way, so there is only one rule.
- **The `beforeNavigate` guard** already allows navigation within `paths.edit()`, so page switches aren't blocked by unsaved changes.

### 6. Page and menu operations in `$lib/editor/pages.ts`

Each operation builds one transaction and applies it once:

| Operation | Transaction |
|---|---|
| `addPage(title)` | create `page` (slug `uniqueSlug(slugify(title))`, one `rich_text` via the existing `insertRichText` inserter) + `page_link`; append both |
| `duplicatePage(id)` | deep copy (below) + `page_link` inserted after the original's |
| `deletePage(id)` | `set(site.pages)` without it, and `set(nav.items)` without its `page_link`s; Svedit cascades blocks, marks and link nodes |
| `setHome(id)` | `set(site.home_page_id)` |
| `setPageTitle(id, title)` | title + follow-ups (decision 7), applied with `batch: true` |
| `setPageSlug(id, raw)` | `set(slug, slugify(raw))` |
| `setSeoDescription(id, text)` | applied with `batch: true` |
| `showInMenu(id, on)` | append or remove its `page_link` |
| `moveMenuItem(from, to)`, `addExternalLink(label, url)`, `setExternalLink(id, label, url)`, `removeMenuItem(index)` | `set(nav.items)` / create / set |

**Duplication.** Svedit's `tr.build(pageId, nodes)` copies the page's subtree under fresh IDs. It follows `node` and `node_array` properties and the mark and annotation ranges of `text` properties, and remaps them all. `page_id` strings are left unchanged, so links keep their targets. The operation then sets the copy's title and unique slug, and inserts it and its menu item. (The design first planned our own schema walker; `build` does the same job.)

**Link counting for the delete dialog:** a scan of `internal_link` marks, `page_link`s in hero actions and `page_link`s in `nav.items` (excluding the page's own menu item, which is deleted with it), counting those whose `page_id` equals the page.

### 7. Title follow-up in the same transaction

`setPageTitle(id, next)`:
- reads the previous title from the document;
- sets the slug to `slugify(next)` when `slug === slugify(previous)`;
- sets each `page_link` label for this page to `next` when its plain text equals `previous`, replacing the whole text value and dropping its marks (menu labels allow none).

Each keystroke is one transaction, and `batch: true` merges a typing burst into one history entry, so the follow-up decision is made per keystroke against the previous keystroke's title. That keeps following correctly as long as the two stay equal. A menu label is written as a new text value, which is safe while the canvas shows the nav: Svedit re-renders the text property from the document.

### 8. Page settings panel and undo in panel fields

- **`PageSettings.svelte`** goes in the right-hand panel above the image panel.
- **Title and SEO description:** controlled inputs whose `value` comes from the document. `oninput` calls the batched setters.
- **Slug:** a local draft seeded from the document. It re-seeds when the document's slug changes (undo, title follow-up) and the field isn't focused. `change`/blur commits `setPageSlug`. A hint shows `slugify(draft)` and the resulting address, or "served at the site root" for home.
- **Undo in panel fields:** the app-level `KeyMapper` scope gets `meta+z,ctrl+z` → undo and `meta+shift+z,ctrl+shift+z,ctrl+y` → redo, both enabled only when the focused element is inside the page settings panel or the sidebar. Before undoing, a pending slug draft is committed, so it becomes its own history entry instead of being lost. Inputs in `LinkDialog` and the add-page and external-link dialogs keep native undo.
- **Alternative:** commit every field on blur only. It was rejected: the canvas h1, the sidebar and the menu label wouldn't update while typing, which defeats editing in place.

### 9. Sidebar

- **`PagesSidebar.svelte`** replaces the inline list in `+layout.svelte`. It has two lists: "Menu" (`menu`) and "Not in menu" (`unlisted`).
- **Rows:** each row is a link to the page's editor URL. It carries a home marker and move up/down buttons (Menu only). External-link rows open an edit dialog instead of navigating.
- **Moving between sections:** "Show in menu" in the settings panel is the primary control. Native HTML drag-and-drop in the Menu list calls `moveMenuItem`, and dropping onto the other section calls `showInMenu`. The buttons are the keyboard-accessible baseline, and drag is an enhancement.
- **Buttons:** "+ Page" opens a `<dialog>` asking for the title. "+ Link" opens a dialog with a label and an address, checked by `checkLinkAddress`.
- **Delete confirmation** uses a `<dialog>`, not `confirm()`. It states the link count from decision 6.

### 10. Problems panel navigation by page ID

`locate.ts` finds the page owning a problem's node. It walks up from the node to a `page`; nav and site-level nodes resolve to the current page. It returns a page ID, and a page-settings field when the node is a page (`title`, `slug`, `seo_description`) or the site (`home_page_id`). The panel navigates to the page, then either selects the node on the canvas (as today) or focuses the panel field.

## Risks / Trade-offs

- **[Risk] Keystroke-level transactions from panel inputs flood history or lose the caret when the document re-renders the input.** → `batch: true` merges them. The input is controlled, but Svelte doesn't reset `value` while it already equals the typed text. A Playwright test types a title and checks the caret stays at the end.
- **[Risk] The duplicator misses a reference kind added later (for example, annotations).** → It walks the schema for `node`, `node_array` and text `marks`/`annotations`. A unit test duplicates the demo site's richest page and runs `validateSite`, so no dangling reference or duplicate ID goes unnoticed.
- **[Risk] Undo brings back a page while the editor has already navigated away.** → That's acceptable: the page reappears in the sidebar. Undoing an add while on the new page navigates home through the "current page disappeared" effect.
- **[Trade-off] Home's slug exists but is unused until it stops being home.** The panel explains it. It is what makes set-as-home free of side effects, and it gives Milestone 4 a stable URL for redirects.
- **[Trade-off] Title following compares plain text, so a customised label that happens to equal the title starts following again.** This is harmless, and simpler than storing a "customised" flag.
- **[Risk] A document upgraded on read but never saved stays version 1 in the database indefinitely.** → That's harmless, since every read upgrades it. `readSite` is the only read path, and a unit test covers editor, preview and ZIP reads of a version-1 row.

## Migration Plan

1. Ship the `packages/site` changes (schema version 2, `migrateSite`, rendering) together with the `readSite` upgrade in one release. The renderer rejects version-1 documents, so the two can't ship separately.
2. There are no database changes and no manual steps. Existing projects become version 2 on their next save.
3. **Rollback:** an older build rejects version-2 documents saved in the meantime (unsupported schema version). To roll back, restore the database from the Litestream backup taken before the upgrade, or accept that projects saved since the upgrade open with a validation error until the new build is back. Deploy notes in `apps/admin/README.md` say this.
4. Bookmarked editor URLs `/p/<project>/edit/<slug>/` return 404 after the change. They are internal and short-lived, so no redirect is added.
