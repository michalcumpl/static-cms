# Tasks

## 1. Svedit spike and setup

- [x] 1.1 Add `svedit` pinned to exactly `0.14.0` to `apps/admin` (via the pnpm catalog, with a comment that it is pre-1.0); verify `pnpm install` succeeds and `pnpm --filter @static-cms/admin typecheck` still passes
- [x] 1.2 Add a vitest test in `apps/admin` that runs Svedit's `validate_document` on the demo fixture with `siteSchema`; verify it passes, or fix `siteSchema` in `@static-cms/site` until it does, keeping M1 tests green
- [x] 1.3 Spike: a throwaway route that creates one `Session` on the demo document and mounts two `<Svedit>` instances with roots `[site_1, "pages", 0]` and `[site_1, "nav"]`, using plain placeholder components; verify in the browser that both render, typing in each changes `session.doc`, and one undo reverts both kinds of edit in order. If the nested paths fail, switch to node-ID roots (`[pageId]`, `[navId]`) and record the outcome in design.md decision 5. Delete the spike route afterwards

## 2. `@static-cms/site` additions

- [x] 2.1 Add `category: "structure" | "site"` to `Problem`, derived from a code-to-category table covering every `ProblemCode`; verify with unit tests for the "Problem categories" scenario in `specs/site-document/spec.md` and a test that every code has a category
- [x] 2.2 Export `isSafeHref` from the package entry; verify with a test importing it from the entry
- [x] 2.3 Add `siteCss(theme, { scope })`: with a scope, `:root`/`html`/`body` rules target the scope element and all other rules are prefixed with it; verify with unit tests that scoped CSS has no unscoped selectors and unscoped output is unchanged apart from 2.4
- [x] 2.4 Replace the base CSS `@media (min-width: 48rem)` breakpoint with a container query and make `body` (or the scope element) an inline-size container; update the M1 CSS snapshot, verify page HTML snapshots are unchanged and html-validate still passes

## 3. Storage and site API

- [x] 3.1 Implement `$lib/server/site-store.ts` (`read()`, `save(document, baseVersion)`) with the file format, fixture seeding, UUID versions, temp-file-plus-rename writes, serialized saves, and `SITE_DATA_DIR` (default `data/`, git-ignored); verify with vitest tests against a temp directory for every scenario in `specs/site-storage/spec.md` except the preview/export one
- [x] 3.2 Add `GET/PUT /api/site` and `GET /api/media/[name]` with the status codes from design.md decision 3, and remove `/demo/[...file]`; verify with handler tests for 200, 409, 422 and 400, and that media names outside the allow-list 404
- [x] 3.3 Switch `/` and `/preview/[...path]` to the store, with `/preview/` showing the validation problems as an HTML page when the saved document is invalid, and the client ZIP download to `/api/site` + `/api/media`; update their tests and verify the "Saved document is the source for preview and export" scenarios
- [x] 3.4 Document the store, the API, `SITE_DATA_DIR` and the no-auth limitation in `apps/admin/README.md`; verify the documented commands and routes work as written

## 4. Editor shell

- [x] 4.1 Add `src/routes/edit/+layout.ts` (`ssr = false`, loads `/api/site`) and `+layout.svelte` creating the `Session`, the editor context (session, current page index, last-saved doc, version, problems, preview width) and the single site-rooted `<Svedit>` (design.md decision 5); verify `/edit/` loads without errors in `pnpm dev`
- [x] 4.2 Add `edit/[[slug]]/+page.svelte` resolving the slug to a page (not-found for unknown slugs) and a page sidebar linking to `/edit/` and `/edit/<slug>/`; verify switching pages keeps an unsaved edit (manual check now, e2e in group 8)
- [x] 4.3 Implement save (toolbar button and Ctrl/Cmd+S) calling `PUT /api/site` with the base version, an unsaved-changes indicator from `session.doc !== lastSavedDoc`, conflict and error messages, and the `beforeNavigate` + `beforeunload` guard; verify a save persists across a reload and a stale second tab gets the conflict message
- [x] 4.4 Add the desktop/mobile width toggle narrowing `.site-canvas`, and inject `siteCss(theme, { scope: ".site-canvas" })`; verify in the browser that the hero switches to one column at the mobile width

## 5. Edit components

- [x] 5.1 Implement node components for page, nav, page_link, external_link, hero, rich_text, paragraph, subheading, list, list_item, services, service_item and image, plus mark components for strong, emphasis, link and internal_link, with the renderer's elements and class names and `span.link` for links; register them in the Svedit config; verify every text listed in the "Text editing in place" requirement is editable in the browser and Enter splits paragraphs and list items but not single-line texts
- [x] 5.2 Render nav items without a `NodeArrayProperty` (design.md decision 5) so only nav labels are editable (no insert, delete or move inside nav items); verify manually that nav structure can't be changed and labels can
- [x] 5.3 Review each block side by side in `/edit/` and `/preview/` at both widths and fix markup or class differences; verify by comparing screenshots of the demo pages (attach to the task notes in the PR)

## 6. Formatting, links and structure

- [x] 6.1 Add toolbar commands for bold, italic, undo and redo with their disabled state; verify the "Inline formatting" and "Undo and redo" scenarios manually (e2e in group 8)
- [x] 6.2 Implement the link dialog (page of this site or address, checked with `isSafeHref`) and unlink; verify with a component or unit test that unsafe addresses are refused with the allowed schemes listed, and manually that page links store `page_id`
- [x] 6.3 Implement block insert transforms with the placeholder content from design.md decision 8 and the inserter UI at block gaps, offering the hero only at index 0 of a page without one; verify with vitest tests of the transforms against a `Session` (new nodes valid for Svedit, hero rule) and manually in the browser
- [x] 6.4 Enable deleting and reordering blocks, list items and service items, and inserting list and service items; verify manually that each operation shows in the page and undoes correctly

## 7. Image and problems panels

- [x] 7.1 Add the image panel for the selected hero image (alt text field, decorative checkbox that clears alt text), writing through transactions so undo works; verify the "Mark as decorative" scenario manually and with a transform unit test
- [x] 7.2 Add the problems panel: server problems after save, debounced client `validateSite` on document changes, click to navigate to the page and select the node, non-clickable entries for nodes outside pages; verify the "Problems panel" scenarios manually

## 8. End-to-end tests and CI

- [x] 8.1 Add `@playwright/test` to `apps/admin` with a Chromium-only config whose web server runs the dev server with a fresh temp `SITE_DATA_DIR`, and a `test:e2e` script; verify an empty smoke test that opens `/edit/` passes locally
- [x] 8.2 Write e2e tests for: edit hero heading + save + `/preview/` shows it; bold and page link; insert services block and reorder; undo/redo; page switching keeps an edit; unsafe link refused; empty subheading listed while save succeeds; verify `pnpm --filter @static-cms/admin test:e2e` passes
- [x] 8.3 Add the Playwright browser install and `test:e2e` steps to `.github/workflows/ci.yml` after the turbo step; verify the workflow file runs the same commands as the local run, and CI passes on push

## 9. Wrap-up

- [x] 9.1 Update `docs/roadmap.md`: mark Milestone 2 done with its decisions (JSON working copy, draft vs publish, container queries, Playwright), and move any deferred items to Milestone 3; verify links in the roadmap resolve
- [x] 9.2 Run `pnpm lint`, `pnpm turbo run typecheck test build` and `test:e2e`, then walk through the owner flow in the browser: open `/edit/`, change text, add a service, fix a reported problem, save, check `/preview/` and download the ZIP; verify all pass and the ZIP contains the edits
