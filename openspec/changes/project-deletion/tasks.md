# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Storage

- [x] 1.1 The migration adding `deleted_at` and `deleted_by` to `projects` (decision 1), and
  `deleted_at IS NULL` in `projectAccess` and `listWorkspaces`. Review every other direct
  `projects` query (`publish.ts`, `domains.ts`, `site-documents.ts`, `media.ts`,
  `import-working-copy.ts`, `upgrade-projects.ts`) and skip deleted projects where one runs on
  its own. Verify with unit tests: a deleted project isn't listed and `projectAccess` returns
  nothing for it.
- [x] 1.2 `deleteProject`, `restoreProject`, `purgeProject` and `deletedProjects` (decision 2),
  with the media folder removed after the commit. Verify with unit tests: delete and restore keep
  versions and media; purge removes rows and files; a missing folder is fine.

## 2. Netlify

- [x] 2.1 `PublishTarget.deleteSite` in `netlify.ts` (404 counts as done) and the fake Netlify's
  `DELETE /api/v1/sites/<id>` (decision 3); `deleteProject` deletes the site first, stops on a
  `PublishError`, and skips Netlify when the workspace isn't connected. Verify with `netlify.test.ts`
  cases and unit tests for "Offline at once" (the domain is free), "Netlify down" and the
  not-connected case.

## 3. Routes

- [x] 3.1 The three routes (decision 4): owners only, name check, origin check, workspace and
  deleted-state checks. Verify with unit tests: "Editor can't delete" (403), "Wrong name" (422),
  someone else's project (404), restore and Delete now of a project that isn't deleted (404).

## 4. Admin pages

- [x] 4.1 `DeleteWebsite.svelte` in the Website section for owners, its dialog (name, address and
  domain, not-connected note), leaving without the unsaved-changes question, and the project
  list's note (decision 5). Verify with e2e "Confirm with the name", "Published website",
  "Editor" and "Delete a website" (the editor's address answers "not found").
- [x] 4.2 "Deleted websites" in the project list with the deletion date, Restore and Delete now
  (decision 5). Verify with e2e "Restore by mistake", "Deleted websites", "Editor doesn't see
  them", "Delete now", "Publish after restoring" and "Netlify down".

## 5. Integration

- [x] 5.1 Run the type check, unit tests, lint and the full Playwright suite. Verify that all
  pass.
- [x] 5.2 Update `apps/admin/README.md` (routes, deleting a website) and `docs/roadmap.md`
  (`project-deletion` done, the cleanup next). Verify by reading.
