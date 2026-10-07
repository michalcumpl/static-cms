# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Server

- [ ] 1.1 `PublishTarget.deleteSite` in `netlify.ts` (404 counts as done) and the fake Netlify's
  `DELETE /api/v1/sites/<id>` (decision 2). Verify with `netlify.test.ts` cases: deleted, already
  gone, unreachable, unauthorized.
- [ ] 1.2 `deleteProject` (decision 1): Netlify first, then the row through the cascade, then the
  media folder. Verify with unit tests: rows of every owned table and the image files are gone;
  "Offline at once" (the domain is free for another project); "Netlify down" (nothing deleted);
  not connected (deleted, Netlify untouched); a missing folder is fine.
- [ ] 1.3 `DELETE /api/projects/<project>` (decision 3). Verify with unit tests: "Editor can't
  delete" (403), "Wrong name" (422), someone else's project (404), Netlify failing (502), and a
  deleted project's site API answering 404 afterwards.

## 2. Admin pages

- [ ] 2.1 `DeleteWebsite.svelte` in the Website section for owners, its dialog (warning, name,
  address and domain, not-connected note), leaving without the unsaved-changes question, and the
  project list's note (decision 4). Verify with e2e "Confirm with the name", "Published website",
  "Editor", "Delete a website" (the editor's address answers "not found") and "Netlify down".

## 3. Integration

- [ ] 3.1 Run the type check, unit tests, lint and the full Playwright suite. Verify that all
  pass.
- [ ] 3.2 Update `apps/admin/README.md` (routes, deleting a website) and `docs/roadmap.md`
  (`project-deletion` done, the cleanup next). Verify by reading.
