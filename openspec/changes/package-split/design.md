# Design

## Context

See proposal.md for the motivation. The current state:

- **`packages/site/src`** has three layers already, mostly by folder:
  - **model:** `schema/`, `validate/`, `migrate.ts`, `collections.ts`, `languages.ts`,
    `translations.ts`, `slug.ts`, `text.ts`, `links.ts`, `fonts.ts`, `themes.ts` and
    `images.ts`. None of these imports from `render/` or `export/`.
  - **render:** `render/` imports only model files.
  - **export:** `export/` imports model and render files. It is the only user of `fflate`.
- **Imports across those boundaries that aren't public today:**
  - `render` uses the model's `isValidBaseUrl` and `problem` (the problem factory), and
    `graphemes`;
  - `export` uses the renderer's `escapeHtml` and `RenderContext`.
- **Test helpers** (`src/test/fixtures.ts`: `loadDemoSite`, `editableDemoSite`, …) read the
  fixtures with `node:fs`. Model, render and export tests all use them. The build excludes them.
- **The admin** imports `@static-cms/site` from about 50 files, and
  `@static-cms/site/fixtures/*` from 13 places. `demo.ts` reads `starter-site.json` at runtime
  for new projects, so the fixtures are product data, not only test data.
- **"Static CMS" in the admin:**
  - in the i18n catalogues: `productName`, `pageTitle`, the projects page title, the
    sign-in/invitation pages, and the email subjects and texts;
  - in the guard's allowed words;
  - in tests that check email subjects and texts;
  - in the README's `MAIL_FROM` example. There is no sender default in code.
- **Build:** Turborepo runs `build` with `dependsOn: ["^build"]`, and the workspace already
  includes `packages/*`. Each package compiles `src` to `dist` with `tsc -p tsconfig.build.json`
  from the shared tsconfig package's `library.json`.

## Goals / Non-Goals

**Goals:**
- Three packages with one-way dependencies (model ← render ← export), enforced by a test.
- No behaviour change besides the product name: the existing tests, snapshots included, move
  with their code and pass unchanged.
- "Static CMS" and `@static-cms` gone from code, configuration and current docs (archived changes
  stay as they were written).

**Non-Goals:**
- Changing names or signatures of functions; a templates package; renaming the repository,
  database, environment variables or cookies.

## Decisions

### 1. Where each file goes

| Package | Files (from `packages/site/src`) |
| --- | --- |
| `@webmio/model` | `schema/`, `validate/`, `migrate.ts`, `collections.ts`, `languages.ts`, `translations.ts`, `slug.ts`, `text.ts`, `links.ts`, `fonts.ts`, `themes.ts`, `images.ts`, and `fixtures/` |
| `@webmio/render` | `render/` (including `__snapshots__/`) |
| `@webmio/export` | `export/`, and `scripts/build-demo.ts` |

`images.ts` (variant widths, file names, which media a document uses) goes to the model: both
render and export need it, and it depends only on the schema. The font catalogue stays with the
model for the same reason, since validation checks font IDs. The file moves use `git mv`, so
history follows them, and `packages/site` is deleted once empty.

### 2. Each package's public API is its current exports, plus the few internals the next layer needs

Each package's `index.ts` exports what `packages/site/src/index.ts` exports from its files today.
On top of that:
- **model** exports `isValidBaseUrl`, `problem` and `graphemes`;
- **render** exports `escapeHtml` and `RenderContext`.

These are marked in a comment as exports for sibling packages.

*Alternative:* an `internal` subpath per package. That's more configuration for five names, and
nothing outside the monorepo consumes these packages.

### 3. The admin imports the specific packages; no facade

Each `@static-cms/site` import is rewritten to the package that exports each name. Mixed imports
are split into one import per package. A script does it from the three packages' export lists,
so no name is assigned by hand, and the type check confirms every name resolves. The browser
editor then imports only `@webmio/model` and `@webmio/render`. A check on the admin's client
build confirms that `fflate` isn't in any client chunk.

*Alternative (the plan before the rename was folded in):* keep `@static-cms/site` as a facade
until the rename. Doing both in one change touches the admin's imports once instead of twice.

### 4. Fixtures and test helpers live in the model

`fixtures/` moves to `packages/model/fixtures`, exported as `@webmio/model/fixtures/*`. The
admin's fixture imports change to that path. The test helpers become
`packages/model/src/testing.ts`, exported as `@webmio/model/testing` and built, so render and
export tests use them like any other dependency. It is the one module allowed to use `node:fs`;
the main entry stays filesystem-free. A test checks that no file reachable from the main entry
imports `node:*`.

### 5. One-way imports, enforced

A small test in each package scans its `src` (tests excluded) for imports of the other
workspace packages:
- `model` may import none;
- `render` may import only `@webmio/model`;
- `export` may import `@webmio/model` and `@webmio/render`.

Relative imports that leave the package's `src` fail the same test.

### 6. Build and versions

Each package mirrors `packages/site`'s set-up: `type: module`, `exports` with `types` and
`default` to `dist`, `tsconfig.build.json` excluding tests, and the same `build`, `dev`,
`typecheck`, `test` and `clean` scripts. Dependencies are `workspace:*`. `fflate` moves to
`export`, and `html-validate` to the dev dependencies of `render` and `export`. The root
`build-demo` script filters `@webmio/export`.

Per the repository's `AGENTS.md`, before relying on Turborepo behaviour, check the installed
turbo docs to confirm that `^build` covers new and renamed workspace packages without
configuration.

### 7. The rename

- **Package names:** `@webmio/model`, `@webmio/render`, `@webmio/export`, `@webmio/admin`,
  `@webmio/tsconfig`, and the root package `webmio`. `pnpm install` regenerates the lockfile.
- **Product name** in the catalogues:
  - English: "Webmio" wherever "Static CMS" is today.
  - Czech, declined like "rádio": "Webmio" in the nominative ("Webmio, vaše projekty",
    `{page} – Webmio`), "Přihlášení do Webmia", "Pokračujte k přihlášení do Webmia", "Dostali
    jste pozvánku k úpravám webu ve Webmiu", "Byli jste pozváni do „{workspace}“ ve Webmiu".
  - The guard's allowed words list "Webmio" instead of "Static CMS".
- **Unchanged on purpose:**
  - `data/app.db`, `secret.key`, the environment variable names and the session cookie, so
    existing installations keep working;
  - the repository folder;
  - archived OpenSpec changes, which record history.
- **E2E data folder prefix:** becomes `webmio-e2e-`.

### 8. Rename first, then split, each verified and committed on its own

**Step 1** renames only:
- `@static-cms/site` becomes `@webmio/site`, still one package;
- the admin's imports follow by a find-and-replace on the package name;
- the product name changes.

It ends with the full test suite and the demo comparison, then a commit.

**Step 2** splits `@webmio/site` into the three packages, rewrites the admin's imports to them,
deletes `@webmio/site`, and ends with the same checks and a second commit.

This touches the admin's imports twice, but both rewrites are scripted. In return:
- a failure in step 2 can only come from the split;
- file moves aren't mixed with renames, so git follows each file's history;
- the one visible change, the product name, can be reviewed on its own;
- either step can be reverted alone.

*Alternative:* split and rename at once, which touches the imports once but mixes the two
kinds of change in one diff.

## Risks / Trade-offs

- **[Snapshot tests resolve paths relative to their file]** → `__snapshots__` moves with
  `render/`, and file snapshots use paths relative to the test, so they keep matching. Run with
  `--ci` (no snapshot writes) so a missing snapshot fails instead of being written.
- **[A name assigned to the wrong package in the admin's imports]** → the import rewrite is
  scripted from the packages' export lists, and the admin's type check, unit tests and full
  Playwright suite are the acceptance check.
- **[Stale caches after renaming packages]** (`.svelte-kit`, Vite's dependency cache,
  `.turbo`) → `pnpm clean` before the final verification.
- **[A sentence reads wrong in Czech after declension]** → every changed Czech string is listed
  in the task for the owner to read before merging.

## Migration Plan

Two commits (decision 8), code only, plus the lockfile. No data, format or deployment changes: the database, environment
variables and cookies keep their names. Rollback is reverting the commits.
