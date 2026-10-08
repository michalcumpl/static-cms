# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`), and every
site string to each site language. The type check and the untranslated-text test enforce this.

## 1. Model

- [ ] 1.1 The `jobs` and `job` types and their validation (decision 1). Verify with unit tests
  "Two job ads", "Job without a title", "Not an email", "No openings" and thirteen jobs.
- [ ] 1.2 The builder's `blocks.jobs` (decision 4). Verify: its every-block site has a jobs
  block and validates.

## 2. Rendering

- [ ] 2.1 `renderJobs`, styles and strings (decision 2). Verify with unit tests "A full job ad",
  "Titles only", "No openings", a block with neither not rendered, `html-validate`, and
  snapshots unchanged apart from the stylesheet.

## 3. Editor

- [ ] 3.1 Picker, `insertJobs`/`insertJob`, item limits, the canvas's `Jobs` and `Job`
  (decision 3). Verify with unit tests (insert, limits) and e2e "Insert jobs" and "Thirteenth
  job".
- [ ] 3.2 The Job panel and the block's note (decision 3). Verify with e2e "Add a job ad" and
  "Last job removed".

## 4. Examples and finish

- [ ] 4.1 Scénografie's and Mareš Partners' jobs (local only), checked and with a screenshot.
- [ ] 4.2 Mark `docs/layouts.md` item 20 and `docs/roadmap.md` row 9h done; run typecheck,
  lint, unit tests and the full e2e suite, and record any deviations in design.md under
  "Changes made while building".
