# Tasks

Two steps, each verified in full and committed on its own (design decision 8): first the rename,
then the split. Code moves without behaviour change; the only visible change is the product name.

## 1. Preparation

- [x] 1.1 Read the installed turbo package's `docs/README.md` and its page on package
  dependencies and tasks (AGENTS.md), and confirm that `dependsOn: ["^build"]` orders new and
  renamed workspace packages without changes to `turbo.json`. Verify by noting the doc page in
  design decision 6.
- [x] 1.2 Record the baseline:
  - run `pnpm test`, `pnpm typecheck` and `pnpm build-demo`;
  - save the demo output's file list and checksums, and the export names of
    `packages/site/src/index.ts`, to the scratchpad.

  Verify that all pass.

## 2. Step 1: the rename

- [x] 2.1 Rename the workspace packages (decision 7):
  - `@static-cms/site` → `@webmio/site`;
  - `@static-cms/tsconfig` → `@webmio/tsconfig`, with every `extends` following;
  - `@static-cms/admin` → `@webmio/admin`;
  - the root → `webmio`, with its filter scripts;
  - every import and fixture path of the admin follows, by a find-and-replace on the package
    name only;
  - CI, the drizzle comment, and the Playwright data folder prefix;
  - regenerate the lockfile with `pnpm install`.

  Verify that `grep -r "static-cms"` outside `node_modules`, `.git`, archived changes and the
  repository's own path finds nothing.
- [x] 2.2 Change "Static CMS" to "Webmio" in both catalogues, with the Czech declensions of
  decision 7, in the guard's allowed words, and in the tests checking email subjects and texts.
  List every changed Czech string in the change for the owner to read. Verify with the
  untranslated-text test, the email tests, and the e2e test of the app shell's name.
- [x] 2.3 Update the admin README (package names, the `MAIL_FROM` example). Then run
  `pnpm clean`, `pnpm install`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint` and the
  full Playwright suite, and compare `pnpm build-demo`'s output with the baseline. Verify that
  everything passes and the demo output is byte-identical; then commit step 1.

## 3. Step 2: `@webmio/model`

- [x] 3.1 Create `packages/model` (package.json, tsconfigs, README) and `git mv` the model files
  and `fixtures/` into it (decision 1). Add the sibling exports `isValidBaseUrl`, `problem` and
  `graphemes` (decision 2). Verify with `pnpm --filter @webmio/model typecheck build`.
- [x] 3.2 Move the test helpers to `src/testing.ts`, exported as `@webmio/model/testing`
  (decision 4), and update the model's tests to it. Verify that the model's tests pass,
  unchanged apart from import paths.

## 4. Step 2: `@webmio/render`

- [x] 4.1 Create `packages/render` and `git mv` `render/` (with `__snapshots__/`) into it.
  Replace relative model imports with `@webmio/model`, and export `escapeHtml` and
  `RenderContext` (decision 2). Verify with `vitest run --ci`: all render tests pass, and no
  snapshot is written.

## 5. Step 2: `@webmio/export`

- [x] 5.1 Create `packages/export` and `git mv` `export/` into it, with `fflate` and
  `scripts/build-demo.ts`. Replace relative imports with the model and render packages, and
  point the root `build-demo` script at `@webmio/export`. Verify that its tests pass and
  `pnpm build-demo` runs.

## 6. Step 2: boundaries and the admin's imports

- [x] 6.1 Add the boundary tests: one-way imports, and no `node:*` reachable from the main
  entries (decisions 4 and 5). Verify that they pass, and that they fail when a forbidden import
  is added by hand (then remove it).
- [x] 6.2 Check that the three packages together export every name of the baseline list from
  1.2, plus the sibling exports and nothing else. Verify with a one-off comparison, recorded in
  the change.
- [x] 6.3 Rewrite the admin's `@webmio/site` imports with a script that maps each name to its
  package (decision 3), and its fixture imports to `@webmio/model/fixtures/*`. Update its
  workspace dependencies and delete the now-empty `packages/site`. Verify with the admin's type
  check and unit tests.

## 7. Integration

- [x] 7.1 Run `pnpm clean`, then `pnpm install`, `pnpm build`, `pnpm typecheck`, `pnpm test`,
  `pnpm lint` and the full Playwright suite. Compare `pnpm build-demo`'s output with the
  baseline from 1.2, and confirm that `fflate` is only in the Publishing tab's client chunk (its in-browser ZIP
  download), not in the editor's.
  Verify that everything passes and the demo output is byte-identical; then commit step 2.
- [x] 7.2 Update the docs:
  - the new package READMEs;
  - `docs/roadmap.md` (milestone A: the rename and the split done, no templates package until
    `template-system`);
  - `docs/tasks.md`.

  Verify by reading.
