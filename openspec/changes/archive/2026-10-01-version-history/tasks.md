# Tasks

## 1. Storage

- [x] 1.1 Add the migration for `versions.restored_from`, the `restoredFrom` option of `saveSite`, and `listVersions`, `readVersion` and `restoreVersion` (design.md decision 1). Verify with unit tests for "Three saves", "Older versions" (paging), "Published and live", a restore's "Restored from" mark, a removed member, "Restore and undo the restore", "Restore the primary language", a conflicting restore, a broken document refused, and another project's version not found.

## 2. Routes and pages

- [x] 2.1 Add the versions API and the restore route (decision 2). Verify with route tests: paging with `before`, 200, 404 (unknown version, or another project's), 409, 422, and access (401, and 404 for another workspace).
- [x] 2.2 Move the preview's export-and-serve code into `$lib/server/preview.ts`, and add the version preview with its banner (decision 2). Verify with route tests for "Preview an older version" (pages, links within the version, stylesheet and images), the banner, an upgraded old format, shared fields for English, and "A version of another project". Check that the existing preview tests still pass.
- [x] 2.3 Add the History page with its language selector, Preview and Restore actions and confirmation, plus the links from the editor and the project page (decisions 2 and 3). Verify with e2e tests:
  - save twice, open History from the editor, preview the first version, restore it, and the editor shows it;
  - restore Czech, and the English Business tab shows the restored phone number;
  - publish to the fake Netlify, and the history marks Live and Published;
  - "Open the English history".

## 3. Docs and checks

- [x] 3.1 Update the README (history, restore, retention) and the roadmap (version history done). Verify by reading both.
- [x] 3.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [x] 3.3 Manual check by the owner: on a real project, make a few edits, preview an older version, restore it, then restore the newer one again, and publish. Record the outcome in design.md.
