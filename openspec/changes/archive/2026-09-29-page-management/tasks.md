# Tasks

## 1. Document format version 2

- [x] 1.1 Add `home_page_id` (string) to the `site` schema and `SiteNode` type, set `schema_version` to 2, and add `uniqueSlug(base, taken)` next to `slugify`; verify `pnpm --filter @static-cms/site typecheck` passes and unit tests cover `uniqueSlug` (free, taken, `-2`/`-3` chains, empty base)
- [x] 1.2 Update validation per design.md decision 2: require schema version 2, add `missing-home` (error) and `duplicate-menu-item` (warning), apply the slug rule to every page, and remove `home-slug`; verify with unit tests for every `site-document` scenario under Site node, Pages and slugs, and Navigation
- [x] 1.3 Add the `pageLabel` helper and rewrite page, slug, home and link messages to name pages by title (`missing-page`: "a page that no longer exists"); verify with the Readable page problem and Link to a deleted page scenarios and by checking that no message in `domain.ts` interpolates a page's node ID
- [x] 1.4 Implement and export `migrateSite` per design.md decision 3; verify with unit tests for the three Upgrading version-1 documents scenarios, plus a version-1 copy of the demo site upgraded and validated without problems
- [x] 1.5 Rewrite `fixtures/demo-site.json`, `fixtures/starter-site.json` and test fixtures to version 2 (home slug from title), keeping one version-1 fixture for upgrade tests; verify all fixtures validate with no errors

## 2. Rendering and export

- [x] 2.1 Build routes and the home check from `home_page_id` in `RenderContext` and `page.ts` (title, site-name link); verify with unit tests for the Home page not first in the list and Link to the home page scenarios, and that the existing snapshot tests still pass unchanged
- [x] 2.2 Add a fixture with the home page second and export tests for the Home page listed second and Home page's slug is not in the sitemap scenarios; verify `pnpm --filter @static-cms/site test` passes and `html-validate` still passes on the exported pages

## 3. Upgrade on read

- [x] 3.1 Call `migrateSite` in `readSite` before validating, returning the stored version, and update the starter site in `demo.ts`; verify with unit tests: a version-1 row is returned as version 2 with the stored version, the row is unchanged, and a save based on that version is accepted and stores version 2
- [x] 3.2 Cover preview and ZIP reads of a version-1 project; verify with a route test that the preview renders a version-1 project without a schema-version error
- [x] 3.3 Add deploy and rollback notes for format version 2 to `apps/admin/README.md` (design.md Migration Plan); verify the notes name the Litestream restore and the effect of rolling back without it

## 4. Editor state and routes by page ID

- [x] 4.1 Make `EditorState.pages`, `menu` and `unlisted` derived from `session.doc`, and replace `pageIndex` with `currentPageId`; verify with unit tests of the derived lists (home marker, menu order, pages outside the menu, external links) and of a rename showing up without a reload
- [x] 4.2 Move `edit/[[slug]]` to `edit/[[pageId]]` (missing ID → home, unknown ID → 404), update `projectPaths.edit`, and add the "current page disappeared → go home" effect; verify with unit tests for the load function, and with Playwright: `/edit/` opens home, `/edit/<id>/` opens that page, and an unknown ID shows not-found
- [x] 4.3 Update `locate.ts` and the problems panel to navigate by page ID and to return a page-settings field for page and site problems; verify with `locate` unit tests, including a slug problem resolving to that page's `slug` field

## 5. Page and menu operations

- [x] 5.1 Implement `addPage`, `deletePage`, `setHome` and `countLinksTo` in `$lib/editor/pages.ts` as single transactions (design.md decision 6); verify with unit tests on a Session with the demo site for the Adding pages, Deleting pages and Setting the home page scenarios, including undo restoring page, blocks and menu item, and the document still validating
- [x] 5.2 Implement `duplicatePage` with a deep copy (Svedit `tr.build`); verify with unit tests: the copy of the demo site's richest page has only fresh IDs, identical content, links unchanged, the menu item right after the original's, and `validateSite` reports no structural problems
- [x] 5.3 Implement `setPageTitle` (with slug and label follow-up, batched), `setPageSlug` and `setSeoDescription`; verify with unit tests for both Slug and menu label follow the title scenarios, and that a burst of title keystrokes undoes as one step
- [x] 5.4 Implement the menu operations (`showInMenu`, `moveMenuItem`, `addExternalLink`, `setExternalLink`, `removeMenuItem`), with addresses checked by `checkLinkAddress`; verify with unit tests for the Menu management scenarios, including that no operation creates a second `page_link` for a page

## 6. Sidebar and page settings UI

- [x] 6.1 Build `PagesSidebar.svelte` (Menu and Not in menu sections, home marker, move buttons, native drag within and between sections, "+ Page" and "+ Link" dialogs) and replace the list in `+layout.svelte`; verify with Playwright: add a page, reorder the menu with the buttons, hide a page from the menu, and add an external link, each checked on the canvas nav
- [x] 6.2 Build `PageSettings.svelte` (live title and SEO description, slug draft with hint and commit on change, show in menu, duplicate, set as home, delete with a `<dialog>` stating the link count, home explanations and disabled delete) and place it above the image panel; verify with Playwright for Edit the title, Normalise the slug, Set as home, Delete a page with links to it, and Home page can't be deleted
- [x] 6.3 Add app-level undo/redo shortcuts for the sidebar and panel fields (commit a pending slug draft first; dialogs keep native undo); verify with Playwright for Undo from a panel field, and that the caret stays at the end of the title field while typing
- [x] 6.4 Make a click on a page-settings problem switch to the page and focus the field; verify with Playwright: create a duplicate slug, click the problem, and the slug field of the right page has focus

## 7. Integration and roadmap

- [x] 7.1 Run an end-to-end walk-through in Playwright: open a version-1 project, add "Ceník", duplicate it, set it as home, delete the copy, save, and check the preview and ZIP (home at `index.html`, the new pages at their slugs); verify the test passes in CI (Chromium) together with `pnpm turbo run lint typecheck test`
- [x] 7.2 Mark pages and navigation as done in `docs/roadmap.md` Milestone 3, with the change link, the decisions (explicit home, ID routes, the sidebar is the menu, title following) and the known limits (no redirects until Milestone 4, no dropdowns); verify the links resolve once the change is archived
