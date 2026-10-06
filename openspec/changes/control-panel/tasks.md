# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Structure

- [x] 1.1 `git mv` `(tabs)/` to `(panel)/` and move the pages to their new places
  (decision 1):
  - `pages/` and `languages/` under `website/`;
  - `publishing/` to `publish/`;
  - `history/` to `publish/versions/`.

  Replace `Tabs` with the section bar and the subpage row, keep the header and the language
  choice, and add the new paths to `project-paths.ts` (decision 5). Verify with "Open a
  section", "Not a member" and "Keep the language between sections" as `panel.spec.ts`, and
  the moved pages' existing e2e specs passing at their new addresses.
- [x] 1.2 The redirects for the old addresses (decision 5). Verify with "A bookmarked History
  tab", "A site field from an old link", and one case per old address in `redirects.spec.ts`.

## 2. Sections

- [x] 2.1 Turn `SettingsScreen.svelte` into `SectionScreen.svelte` (decision 2) and add the
  Business section. Verify with the Business scenarios of `settings.spec.ts` moved to
  `business.spec.ts` (phone, lunch break, copy Monday, locations, social profiles, save, unsaved
  changes, conflict, go to a problem, English).
- [x] 2.2 The Website main page: site settings in the section screen, the Design card with
  "Change design" (decision 7), and the subpage links with summaries. Verify with the site
  scenarios moved from `settings.spec.ts` (rename, favicon, AI training) and "Change design".
- [x] 2.3 Extract `DomainPanel.svelte` for the Domain page, and slim the Publish page to
  publishing, history and the ZIP download, with links to Domain and Versions (decision 6).
  Verify with `publishing.spec.ts` moved to the new pages, including "Set a domain", "Download
  the site" and "Download refused".

## 3. Dashboard

- [x] 3.1 The dashboard's server load and page (decision 3): Your website, problems, and the five
  cards. Verify with a load unit test (counts, first offer and about pages, design summary),
  and the e2e tests "Published and valid", "Errors disable publishing" and "Offer card before
  its section exists".
- [x] 3.2 Problem links from the dashboard and the editor (decision 4): `problemHref`,
  `openSettings` to the right section, and the editor's left column linking to the dashboard.
  Verify with `locate.test.ts` cases, and the e2e tests "A problem leads to its field" and
  "Edit business details" / "Unsaved changes on the way" at their new places.

## 4. Integration

- [x] 4.1 Remove the old path names and any leftover tab texts. Run the type check, unit tests,
  lint and the full Playwright suite. Verify that all pass, and that `grep` finds no
  `pagesTab`, `languagesTab`, `settings:` path or `(tabs)` left.
- [x] 4.2 Update `apps/admin/README.md` (routes) and `docs/roadmap.md` (milestone B:
  `control-panel` done, `offer-and-about` next). Verify by reading.
