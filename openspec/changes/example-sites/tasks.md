# Tasks

No interface text changes: the command's output is for operators and stays in English, like
`create-user`.

## 1. Builder

- [ ] 1.1 `siteBuilder` in `packages/model/src/builder.ts` (decision 1): site, theme, business,
  locations with hours, social profiles, collections (services, team, testimonials, FAQs), pages
  with menu and home, every block type, the inline text syntax, deterministic IDs and
  translation keys. Verify with unit tests: a site using every block type has no validation
  errors; two builds with different texts have the same IDs; the inline syntax gives the
  expected marks.

## 2. Loading

- [ ] 2.1 `createProject` takes a primary language (decision 3). Verify with a unit test: an
  English project reads and saves in English, and the admin's New project stays Czech.
- [ ] 2.2 `loadSite` (decision 2): checks, project, uploads, image keys, languages, clean-up on
  failure. Verify with unit tests for "Load an English site", "Two languages" and "Broken
  folder" (no project, no files left), using a temporary folder built with the builder and the
  demo's image.
- [ ] 2.3 `pnpm admin load-site <folder> --workspace <id>` in `scripts/admin.ts`, with usage,
  printed problems and exit codes. Verify by running it on a test folder against a temporary
  database (`DATABASE_PATH`).

## 3. The examples (local only)

- [ ] 3.1 Aniděti: read the live site, download its images, write `build.ts`, build and load it
  into the development database (decision 4). Verify: `load-site` succeeds, the preview shows
  every page, the dashboard reports no errors, and `git status` shows nothing from
  `data/examples/`.
- [ ] 3.2 Mareš Partners, Czech and English. Verify as 3.1, and that the English pages pair with
  the Czech ones.
- [ ] 3.3 Mortgage Specialist, English primary. Verify as 3.1.
- [ ] 3.4 Fond 10X, Czech and English. Verify as 3.2.
- [ ] 3.5 Roubenka Svitávka, Czech. Verify as 3.1.

## 4. Notes and docs

- [ ] 4.1 `docs/layouts.md` and `docs/import-mapping.md` from the five migrations, with the
  gaps the examples show (decision 5). Verify by reading: no content of the businesses beyond their public addresses.
- [ ] 4.2 Update `apps/admin/README.md` (the command) and `docs/roadmap.md` (`example-sites`
  done). Run the type check, unit tests, lint and the full Playwright suite; verify that all
  pass.
