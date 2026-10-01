# Tasks

## 1. `packages/site`

- [x] 1.1 Add `translationSummary` and `translationStatus` (design.md decision 1). Verify with unit tests for "Copied and untouched", "Title translated, slug not", the home page judged by title only, and "Missing page".
- [x] 1.2 Add `copyPageInto` (decision 3). Verify with unit tests for "Copy "Ceník" to English" (blocks and images under new IDs, nothing shared with the source), "Slug taken", "Links follow the language" (marks and page links, and a link left when there is no counterpart), "Already translated", no menu item for a page outside the source's menu, and the result validating.

## 2. Server

- [x] 2.1 Add `GET /api/projects/<p>/translations` and `POST /api/projects/<p>/languages/<lang>/pages` (decisions 1 and 3). Verify with route tests: the summary and status per language; copying (201 with the new page, saved as one version of the target only); 409 for an existing counterpart and for a conflicting save; 404 for an unknown language or page; and access (401, 404 for another workspace).

## 3. Editor and project page

- [x] 3.1 Add `linkPage` and `unlinkPage`, and the link choices (decision 2). Verify with unit tests: linking gives the counterpart's key and is one undo step; unlinking restores the page's own key; "Only unpaired pages offered".
- [x] 3.2 Add the "In other languages" part of the page settings, the "Not translated" mark in the page list, and the checklist in the project page's Languages section (decisions 2 and 4). Verify with e2e tests:
  - "Copy from the editor" (and opening the copy in English);
  - "Unsaved page";
  - "Link a separately built page", published with the English alternate;
  - "Unlink";
  - the checklist's untranslated and missing pages with their links;
  - "Mark goes away".

## 4. Docs and checks

- [x] 4.1 Update the roadmap (Milestone 5 done: languages and language tools). Verify by reading it.
- [x] 4.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [x] 4.3 Manual check by the owner: on the project with English, copy a page across, link a page built in English, follow the checklist, publish, and check the switcher on the copied and linked pages. Record the outcome in design.md.
