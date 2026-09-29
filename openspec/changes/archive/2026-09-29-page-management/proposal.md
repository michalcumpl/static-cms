# Proposal

## Why

Owners can edit the pages their site starts with, but they can't add, rename, remove or reorder pages, and they can't change the menu. A site can't grow past the starter without a developer. This is the next step of Milestone 3, now that storage and accounts are in place.

## What Changes

- **Explicit home page.** **BREAKING** (document format): the site node gets `home_page_id`, which names the home page. The rule "the first page is home, with an empty slug" goes away. Every page, home included, keeps a valid, unique slug; the home page is served at the site root and its slug is used only if it stops being home. The document's `schema_version` becomes 2.
- **Migration on read.** Stored version-1 documents are upgraded when the server reads them: `home_page_id` becomes the first page, and that page gets a slug made from its title. The upgrade is saved with the next save; nothing is rewritten on startup. The starter site and the fixtures move to version 2.
- **Page management in the editor sidebar.** Every action is a single Svedit transaction, so undo and redo cover it.
  - Add a page: its slug is made from the title and made unique. It starts with one text block and joins the end of the menu.
  - Duplicate a page, with a copy of all its blocks under new IDs.
  - Delete a page, together with its menu item. Links to it elsewhere stay in place and show up as `missing-page` problems. The home page can't be deleted.
  - Set as home.
- **Page settings panel** for the current page: title, slug, SEO description, "show in menu", and the page actions.
  - The slug follows the title until the owner edits it by hand.
  - A menu label follows its page's title the same way.
- **The sidebar is the menu.** It has two sections:
  - "Menu", in menu order, with pages and external links, reordered by dragging or with move buttons;
  - "Not in menu", for pages that aren't in the menu.
  An owner can add and remove external links to the menu. Menu labels are still edited in place on the canvas. There are no dropdown menus and no subpages.
- **Editor routes by page ID.** **BREAKING** (internal URLs): `/p/<project>/edit/<pageId>/` replaces `/p/<project>/edit/<slug>/`. `/p/<project>/edit/` opens the home page. The editor derives its page list from the document and tracks the current page by ID, so renaming, reordering, deleting and undo keep the canvas on the right page.
- **Readable page problems.** Problems about pages and links to pages name the page by its title, not by node ID.

### Non-goals (this change)

- Redirects from old slugs (Milestone 4), and multiple languages (Milestone 5).
- Dropdown menus, subpages, and page templates beyond the single starting text block.
- Inline editing of the page title on the canvas. The title stays a plain string, edited in the panel.
- A version history UI, media upload, and theme editing.

## Capabilities

### New Capabilities

None. Page and menu management belong to `site-editing`.

### Modified Capabilities

- `site-document`: the site node names its home page, every page has a slug (home included), and the schema version is 2. The navigation gains "at most one menu item per page".
- `site-rendering`: home is determined by `home_page_id`, not by list position. The site-name link and home-page links point to the base path.
- `site-export`: the home page is written to `index.html` whatever its position, and the sitemap lists it at the base URL.
- `site-storage`: version-1 documents are migrated to version 2 whenever the server reads them.
- `site-editing`: editor routes by page ID; a sidebar with the menu and the pages outside it; add, duplicate, delete, set as home, show in menu, and external menu links; a page settings panel; the slug and menu label follow the title.

## Impact

- `packages/site`:
  - schema, types and validation (`home_page_id`, new slug rules, schema version 2, a duplicate menu item warning);
  - a `migrateSite` function for version 1 to 2;
  - the render context (home routing), the page renderer (title, site-name link), the export sitemap;
  - fixtures and snapshot tests.
- `apps/admin`:
  - `site-documents.ts` migrates on read;
  - `demo.ts` starter site;
  - the editor state (derived pages, current page by ID);
  - the edit routes (`[[pageId]]`);
  - a new sidebar and page settings panel;
  - page and menu transforms (add, duplicate, delete, set as home, menu add/remove/move, title sync);
  - the keymap, so Cmd+Z in panel inputs uses the editor's undo;
  - `locate.ts` and the problems panel, for switching pages by ID;
  - Playwright tests for page management.
- No new dependencies. No database migration: stored documents are upgraded on read.
- `docs/roadmap.md`: the page and navigation item of Milestone 3 is marked done when this lands.
