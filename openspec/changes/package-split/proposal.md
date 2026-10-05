# Proposal

## Why

`@static-cms/site` has grown to hold everything between the editor and a published site: the
document model and its validation and upgrades, the HTML renderer, and the static export with its
ZIP, icons and robots file. Milestone C adds templates, which render the same model differently,
so the renderer needs a clear boundary from the model before templates arrive. Today nothing
stops model code from importing the renderer. The browser editor also pulls in the export code
and its ZIP library, though it only needs the model and the renderer.

The product is now called Webmio (`docs/strategy.md`), but the code and the admin still say
Static CMS. The split touches every package name and every import anyway, so the rename belongs
in the same change. It goes first, as its own verified step: `@static-cms/site` becomes
`@webmio/site`, and only then is it split.

## What Changes

- **Three packages instead of one**, each pure TypeScript with no filesystem access, running in
  Node and in the browser:
  - **`@webmio/model`:** the schema and types, validation and problems, the format upgrades,
    collections, languages (shared fields), page translation, slugs, text, link safety, the font
    catalogue, themes and image variant naming. It also owns the fixtures (demo, starter and
    image-blocks sites, older formats, demo media).
  - **`@webmio/render`:** HTML for pages and the not-found page, the stylesheet, metadata and
    structured data, the business details' markup, and the site's own strings. Depends on
    `model`.
  - **`@webmio/export`:** the file tree, the ZIP (`fflate`), icons, `robots.txt`, redirects and
    several languages, plus the demo build script. Depends on `model` and `render`.
- **Imports go one way only:** `model` imports nothing of the others, `render` imports only
  `model`, and `export` imports `model` and `render`. A test enforces this.
- **`@static-cms/site` is removed** (after a first step as `@webmio/site`). The admin imports
  from the specific packages, and its fixture imports use `@webmio/model/fixtures/*`.
- **Everything renamed to Webmio:**
  - **Workspace packages:** `@webmio/admin`, `@webmio/tsconfig`, and the root package `webmio`.
  - **The admin's product name:** "Webmio" in the top bar, the page titles
    (`{page} – Webmio`), the sign-in and invitation emails, and the untranslated-text guard. In
    Czech the name is declined like "rádio": "Přihlášení do Webmia", "Dostali jste pozvánku
    k úpravám webu ve Webmiu".
  - **Tooling and docs:** CI, the Playwright data folder prefix, the drizzle comment, the READMEs
    (the `MAIL_FROM` example becomes `Webmio <web@example.cz>`), and the docs.
  - The repository's folder name stays `static-cms`.
- **No other behaviour changes:** rendered pages, exported files, validation results and
  upgrades are byte-for-byte the same (the existing snapshot tests prove it).

### Non-goals

- **A templates package:** it's created with its first real code in `template-system`
  (milestone C), not as an empty placeholder now. This deviates from the roadmap's sketch,
  which listed it here.
- **Changing any public function's name or signature.**
- **Renaming the repository, the database file, environment variables or cookies**, which owners
  and deployments rely on.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-interface`: the app shell's product name becomes "Webmio".

## Impact

- **`packages/`:**
  - new `packages/model`, `packages/render` and `packages/export`, each with `package.json`,
    `tsconfig.json`, `tsconfig.build.json`, a README and its tests;
  - `packages/site` is removed;
  - `fflate` moves to `export`.
- **`tooling/tsconfig`:** renamed `@webmio/tsconfig`; every `extends` follows.
- **`apps/admin`:**
  - the package is renamed `@webmio/admin`;
  - every `@static-cms/site` import (about 50 files) moves to the specific package;
  - the i18n catalogues (`en.ts`, `cs.ts`), the guard's allowed words, and the tests that check
    email subjects and texts;
  - `playwright.config.ts` and `drizzle.config.ts`.
- **Root:** `package.json` (name, scripts filtering `@webmio/*`), `pnpm-lock.yaml` (regenerated)
  and `.github/workflows/ci.yml`.
- **Build:** Turborepo's existing `^build` dependencies order the packages; `turbo.json` and
  `pnpm-workspace.yaml` (which already includes `packages/*`) need no changes.
- **Docs:** `docs/roadmap.md`, `docs/tasks.md`, the admin README and the new package READMEs.
