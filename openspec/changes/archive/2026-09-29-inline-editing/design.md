# Design

## Context

- `@static-cms/site` validates, renders and exports the site document (see `openspec/specs/`). Its schema (`siteSchema`) is already in Svedit's format. The document is one Svedit document rooted at the `site` node, and page links use `page_id` strings rather than Svedit `node` references, to avoid reference cycles.
- `apps/admin` is SvelteKit (Svelte 5, `adapter-node`, TypeScript 6 via the `typescript6` catalog). It currently reads the demo fixture directly: `/` (overview), `/preview/[...path]` (exported files with base path `/preview/`), and `/demo/[...file]` (raw fixture for the client-side ZIP).
- Svedit 0.14.0 (pre-1.0, "expect bugs"), confirmed from its README and dist:
  - `new Session(schema, doc, config)` holds an immutable, copy-on-write document with undo/redo, and `session.doc` changes reference on every edit.
  - `<Svedit {session} path editable>` renders the node at `path` with one component per node type (`config.node_components`, mark types included).
  - `<TextProperty>`, `<NodeArrayProperty>` and `<CustomProperty>` render properties.
  - Transactions have `create`, `insert_nodes`, `delete`, `toggle_mark(type, props)` and `set`. `Command` classes and a keymap drive actions.
  - A path may be mounted only once per document; shared content needs a separate `<Svedit>` instance.
  - Links must not be `<a>` inside the editable area.
  - The package exports `validate_document`, and its main export uses the `svelte` condition.

## Goals / Non-Goals

**Goals:**
- Edit the real document in place, with one session for the whole site, and save it with conflict protection.
- An edit view that looks like the published page, including at a mobile width.
- Keep `@static-cms/site` free of Svelte and Svedit.

**Non-Goals:**
- Page management, navigation targets, theme editing, image upload (Milestone 3).
- Collaborative or real-time editing; conflicts are detected, not merged.
- Visual pixel-parity tests between edit and published views.

## Decisions

### 1. Validation problems carry a category

`Problem` gains `category: "structure" | "site"`. The category is derived from the problem code in one table next to `ProblemCode`, so every code has exactly one category. A test checks that the table covers every code. Render and export option errors (`invalid-base-path`, `missing-media`, `no-base-url`) are `site`. The save endpoint rejects a document when any problem is `structure` with severity `error`.

- **Alternative:** a separate `validateStructure` function. Rejected: the editor needs both kinds in one list anyway, and a field keeps a single call.

### 2. Storage: one JSON file, versioned, written atomically

The server keeps `<SITE_DATA_DIR>/site.json` = `{ "version": string, "document": SiteDocument }`. `SITE_DATA_DIR` defaults to `data/` in the admin app's working directory and is git-ignored.
- **Seeding:** created from the demo fixture when missing (spec: Working copy).
- **Versions:** each accepted save gets a fresh `crypto.randomUUID()`.
- **Writes:** go to a temp file in the same directory, then `rename`, which is atomic on one filesystem. An in-process promise chain serializes saves, so check-version-then-write can't interleave. adapter-node runs a single process, which is enough for M2.
- **Isolation:** the module is `$lib/server/site-store.ts` with `read()` and `save(doc, baseVersion)`, so M3 can swap in a database behind the same two functions.

### 3. Site API replaces `/demo/`

- `GET /api/site` returns `{ document, version, problems }`.
- `PUT /api/site` with `{ document, baseVersion }` returns one of:
  - `200 { version, problems }` when accepted;
  - `409 { message }` when `baseVersion` is stale;
  - `422 { problems }` when there are structural errors;
  - `400` for a malformed body.
- `GET /api/media/<name>` serves fixture media. There are no uploads yet; the allow-list of names stays as in `/demo/`.
- `/` and `/preview/` read through the store. The client ZIP download fetches `/api/site` and `/api/media`.
- **Security note:** there is no auth yet. The app is a local or trusted-network tool until M3, and the README states this.

### 4. Editor routes and session lifetime

- `src/routes/edit/+layout.ts` sets `ssr = false`, because contenteditable and selection only exist in the browser. It loads `/api/site`.
- `+layout.svelte` creates the single `Session` and a small editor context (session, last-saved `doc` reference, version, problems, save and preview-width state) with `setContext`.
- `edit/[[slug]]/+page.svelte` resolves the slug to a page index. Because the session lives in the layout, switching pages is client-side navigation that keeps the session and its history (spec: Page switching).
- **Unsaved changes:** a `beforeNavigate` guard and a `beforeunload` listener, active while `session.doc !== lastSavedDoc`.
- **Keyboard:** Ctrl/Cmd+S saves (app-level command). Undo and redo are Svedit's.

### 5. One Svedit instance rooted at the site

A single `<Svedit {session} path={[siteId]}>` renders the whole editor canvas. The `site` node component renders:
- the navigation node component at `[siteId, "nav"]`, and
- the current page's component at `[siteId, "pages", pageIndex]`, where `pageIndex` comes from the editor context.

It does not use a `<NodeArrayProperty>` for `pages`, so only one page is mounted and pages can't be selected, inserted or reordered as nodes.

- **Spike result (task 1.3):**
  - Two `<Svedit>` instances on one session (page body plus header) render and edit, but switching focus between them throws in Svedit's selection rendering. Each instance tries to draw the session's single selection, and `Session.initialize_commands` documents that it assumes one instance per session.
  - One instance rooted at the site, with the site component choosing what to mount, had no errors.
  - Header and body edits share one history.
- **Rejected:** node-ID roots (`[pageId]`, `[navId]`). They are still two instances with the same selection problem.
- **Navigation edits are labels only.** Nav items, like the hero's single image and action, are placed with a plain child component instead of `<NodeArrayProperty>`, so they have no gaps. With no gaps, the nav can't be selected as a list, inserted into, deleted from or reordered. A command filter would not be enough, because Svedit handles Backspace on a node selection itself.

### 6. Edit components mirror the renderer's markup

`$lib/editor/nodes/` has one component per node type: page, hero, rich_text, paragraph, subheading, list, list_item, services, service_item, image, page_link, external_link, nav. Mark components cover strong, emphasis, link and internal_link.
- **Markup:** each uses the same elements and class names as `@static-cms/site`'s renderer (`section.block.hero`, `.hero-inner`, `.services-list`, …). Svedit wrappers (`<Node>`, property components) sit inside that structure.
- **Links:** render as `<span class="link">` while editing, per Svedit's contenteditable rules. The canvas CSS adds a `.link` twin to every site-CSS selector that targets `a`, plus the browser's default link underline, so links look as published.
- **Headings:** the hero heading renders as `h1` and the page title is not editable here. Rich text subheadings render `h2` or `h3` by level.
- **Images:** a `<CustomProperty>` with `contenteditable="false"` around the `<img>`. Alt text and the decorative flag are edited in a side panel for the selected image (spec: Image description).

### 7. Site CSS inside the editor, and a real mobile width

- **Scoped CSS:** the editor needs the site's theme and base CSS without it styling the admin chrome. `@static-cms/site` gets `siteCss(theme, { scope })`. With a scope, `:root`, `html` and `body` selectors become the scope selector, and every other rule is prefixed with it. Published output (no scope) is unchanged. The editor injects it with `<svelte:head>`, scoped to `.site-canvas`.
- **Container queries:** the base CSS switches its one `@media (min-width: 48rem)` breakpoint to a container query, with `body` (or the scope element) as `container-type: inline-size`. Then the mobile toggle only has to narrow the canvas element (for example to 390px), and the responsive layout follows. The published site behaves the same, because `body` is the viewport's width.
- **Snapshots:** the M1 snapshots update for this CSS change, and the published HTML is unchanged.
- **Alternative:** render the canvas in an iframe for true viewport widths. Rejected: Svedit's selection, anchors and commands would have to cross a frame boundary.

### 8. Toolbar, inserter and link dialog

- **Toolbar:** document-scoped `Command`s for bold, italic, link, unlink, undo, redo; app-level commands for save and preview width. Buttons read each command's `disabled`.
- **Inserter:** an "Add" group in the toolbar (Hero, Text, Services). It inserts at the selected gap of the page's `blocks` array, or after the block holding the selection, or at the end. Custom transforms create each block with placeholder content:
  - hero: heading "Nadpis", empty text, no image or action;
  - rich_text: a level-2 subheading "Nadpis" and one empty paragraph;
  - services: heading "Služby" and one service item "Nová služba".
  The hero is only offered at index 0 on a page without a hero. **Add item** inserts a list item or service item after the current one; Enter also splits paragraphs and list items.
- **Structure:** Escape selects the parent node, Alt+↑/↓ or the toolbar move the selected block or item, and Delete or Backspace removes it. Every structural command refuses the fixed lists (navigation items, pages, the hero's image and action), and a capture-phase `beforeinput` guard stops Svedit's built-in node deletion there.
- **Link dialog:** offers "page of this site" (select from the site's pages, creating an `internal_link` mark with `page_id`) or "address", checked with `isSafeHref`, which `@static-cms/site` now exports. Refusals show the allowed schemes.

### 9. Problems panel

- **When it updates:** after each accepted save (server problems) and, debounced at about 300 ms, on every `session.doc` change, by running `validateSite` in the browser, since it is the same package.
- **Clicking a problem:** looks up the node's page by walking the site's pages, navigates if needed, then sets a node selection on it. Problems on nodes outside pages (theme, site) are listed but not clickable.

### 10. Testing

- **Unit (vitest):**
  - problem categories;
  - `siteCss` scoping;
  - site-store behaviour (seed, save, conflict, structural rejection, atomic rename) with a temp `SITE_DATA_DIR`;
  - API handlers;
  - the inserter's transforms against a `Session`;
  - the schema and demo fixture accepted by Svedit's own `validate_document`.
- **End-to-end (Playwright, Chromium only):** runs the Vite dev server with a fresh temp `SITE_DATA_DIR` per run. Flows:
  1. Edit the hero heading, save, and `/preview/` shows it.
  2. Bold and a link to a page.
  3. Insert a services block and reorder a block.
  4. Undo and redo.
  5. Switch pages without losing an edit.
  6. An unsafe link is refused.
  7. An empty subheading appears in the problems panel, and the save still succeeds.
- **Scripts and CI:** `apps/admin` gets `test:e2e`. CI adds `pnpm --filter @static-cms/admin exec playwright install --with-deps chromium` and `pnpm --filter @static-cms/admin test:e2e` after the existing turbo step, so `turbo.json` doesn't change.

## Risks / Trade-offs

- **[Svedit is pre-1.0 and its paths or commands may not work as documented]** → Pin `svedit` exactly (`0.14.0`). The first task is a spike proving a nested root path, two instances on one session, and our schema accepted by `validate_document`. The documented fallback is node-ID roots.
- **[Svedit marks are mutually exclusive]** → A text range is bold *or* italic *or* a link, never two at once; applying italic to bold text switches it. This is Svedit's model, and the published renderer already assumes non-overlapping marks. Accepted for M2.
- **[Edit components drift from the published markup]** → Same class names and the same scoped site CSS. The e2e save-then-preview flow checks the text arrives, and a review step compares edit and preview side by side for each block.
- **[Container queries change published CSS]** → Only one breakpoint moves, with the same threshold. Snapshots show the diff; supported in all current browsers.
- **[No auth on a write endpoint]** → Acceptable for a local or trusted M2 tool. Documented in the admin README, and M3 adds auth.
- **[Single-process locking]** → Correct for adapter-node's one process. A database replaces it in M3.
- **[Playwright downloads a browser in CI (~100+ MB) and slows CI]** → Chromium only, cached by the Playwright action if needed later.
- **[Client-side validation on every change could lag on large sites]** → Debounced; the demo site is tiny. Revisit with the database in M3.

## Migration Plan

- The first read after upgrading seeds `data/site.json` from the fixture. No existing data exists to migrate.
- `/demo/` routes are removed. Nothing outside the app used them.
- Rollback: revert the change; `data/` is ignored and can be deleted.

## Open Questions

- Placeholder texts are Czech because the demo site is Czech. Localizing the editor UI and placeholders is deferred until the product has a language setting.
