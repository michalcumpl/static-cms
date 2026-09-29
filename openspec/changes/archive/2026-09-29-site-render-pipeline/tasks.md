# Tasks

## 1. Setup

- [x] 1.1 Rename `packages/core` to `packages/site` with `git mv`, change the package name to `@static-cms/site`, and update the React admin's dependency and import to the new name; verify `pnpm install` and `pnpm turbo run typecheck test build` pass
- [x] 1.2 Add `fflate` as a dependency and `html-validate` as a devDependency of `@static-cms/site` (via the pnpm catalog); verify `pnpm install` and `pnpm turbo run build --filter @static-cms/site` succeed
- [x] 1.3 Create the `schema/`, `validate/`, `render/` and `export/` folders under `packages/site/src` with index files, add a `"./fixtures/*"` subpath export and `fixtures` to `files`, and add `out/` to `.gitignore`; verify `pnpm turbo run typecheck` passes and the existing `slugify` tests still pass

## 2. Site document schema and fixture

- [x] 2.1 Define the Svedit-format schema object and TS node types for `site`, `theme`, `nav`, `nav_item`, `page`, `hero`, `rich_text` (paragraph, subheading, list, list_item), `services`, `service_item`, `image`, and marks `strong`, `emphasis`, `link`, including `schema_version` on `site`; verify with a test that every node type used in the TS types exists in the schema object and vice versa
- [x] 2.2 Write `packages/site/fixtures/demo-site.json` (Czech two-page site: home with hero + services + rich_text with marks and a link, and a `kontakt` page) plus one small image in `fixtures/media/`; verify a test loads it and it type-checks against the node types

## 3. Validation

- [x] 3.1 Implement the `ValidationResult` shape and generic checks (ID format, key/id match, known types, value shapes, reference existence and allowed types, reachability as a warning, cycles, mark bounds and overlap); verify with unit tests covering every generic scenario in `specs/site-document/spec.md` and that all problems are reported together
- [x] 3.2 Implement domain rules: site language, home page and slugs (unique, normalized via `slugify`, empty for home), hero-first, alt-or-decorative, link-scheme allow-list, hex theme colors, and WCAG text/background contrast ≥ 4.5; verify with unit tests for each domain scenario in `specs/site-document/spec.md`, and that the demo fixture validates with zero errors
- [x] 3.3 Export `validateSite` from `packages/site/src/index.ts` and verify with a test importing it from the package entry

## 4. Rendering

- [x] 4.1 Implement the escaping, attribute and base-path `url` helpers and marked-text rendering (strong/em/a, half-open offsets); verify with unit tests for the marked-text, output-escaping and base-path scenarios in `specs/site-rendering/spec.md`, including Czech diacritics, a `<script>` text payload, and rejection of a malformed base path
- [x] 4.2 Implement block renderers for `hero`, `rich_text`, `services` and `image`, with block-type classes, lazy loading outside the hero, decorative `alt=""` and no empty price element; verify with unit tests for the block and image scenarios in `specs/site-rendering/spec.md`
- [x] 4.3 Implement the page shell (doctype, `lang`, charset, viewport, title format, meta description, stylesheet link, header/nav/main/footer, h1 rule, nav hrefs and `aria-current`) and `renderSite(doc, { basePath })` returning validation errors for invalid documents; verify with unit tests for the page-structure, heading, navigation and invalid-document scenarios, with both `/` and `/preview/` base paths
- [x] 4.4 Implement theme-to-CSS custom properties plus the base stylesheet covering layout and all block types, using only `var(--…)` for themeable values; verify with a test that two renders differing only in primary color give identical HTML and differing CSS
- [x] 4.5 Add file snapshots (`toMatchFileSnapshot`, `.html`) of both demo pages and the stylesheet, an html-validate check with zero errors on each rendered page, and a same-input determinism test; verify `pnpm turbo run test --filter @static-cms/site` passes

## 5. Export

- [x] 5.1 Implement `exportSite(doc, media, { basePath })`: file layout (`index.html`, `<slug>/index.html`, `assets/style.css`, `assets/images/<key>`), only referenced media, a missing-media error, validation errors returned instead of files, and `sitemap.xml` only when `base_url` is set (warning otherwise); verify with unit tests for every scenario in `specs/site-export/spec.md` except the ZIP ones
- [x] 5.2 Implement `zipFiles(files)` with fflate, sorted entries and a fixed 1980-01-01 mtime; verify with tests that unzipping yields the files at the archive root and that two exports at different times are byte-identical
- [x] 5.3 Export `renderSite`, `exportSite` and `zipFiles` from the package entry and document the public API (`validateSite` → `renderSite` → `exportSite` → `zipFiles`, the media-map contract, `basePath`) in `packages/site/README.md`; verify the README example matches the exported signatures by running `pnpm turbo run typecheck`

## 6. Demo build

- [x] 6.1 Add `packages/site/scripts/build-demo.ts` (reads the fixture and media, exports, writes `packages/site/out/website.zip`), a `demo` script in `@static-cms/site` using `node --experimental-strip-types`, and a root `build-demo` script that builds the package first; document it in `packages/site/README.md` and verify `pnpm build-demo` produces `out/website.zip`

## 7. SvelteKit admin shell

- [x] 7.1 Replace `apps/admin` with a SvelteKit app (Svelte 5, TypeScript, `adapter-node`, `svelte-check` as `typecheck`, same `dev`/`build`/`clean` script names); remove React from the pnpm catalog, and remove `Entry`/`createEntry` and their tests from `@static-cms/site`. Check that SvelteKit supports the catalog's Vite and TypeScript versions, and pin compatible versions with a catalog comment if not. Verify `pnpm turbo run typecheck build --filter @static-cms/admin` passes and `pnpm lint` passes on `.svelte` files
- [x] 7.2 Add the `/demo/[...file]` endpoint serving the fixture JSON and media via the package's `fixtures/*` export, and the `/` page whose server load runs `validateSite` and lists problems plus a link per page; verify with a vitest test of the load function (zero errors, two pages) and by opening `/` in `pnpm dev`
- [x] 7.3 Add the `/preview/[...path]` endpoint rendering with `basePath: "/preview/"` and serving page HTML, `assets/style.css` and images with correct content types, plus 404 for unknown paths; verify with a vitest test of the handler (home, `kontakt/`, stylesheet, unknown path) and by clicking through the nav in `pnpm dev`
- [x] 7.4 Add the client-side [Download ZIP] button (fetch fixture and media, `exportSite` + `zipFiles` in the browser, save as `website.zip`); verify in the browser that the downloaded file is byte-identical to `packages/site/out/website.zip` from `pnpm build-demo` (`cmp`)
- [x] 7.5 Document running the admin (`pnpm dev`, routes) in `apps/admin/README.md`; verify the documented commands work as written

## 8. Integration check

- [x] 8.1 Run `pnpm lint` and `pnpm turbo run typecheck test build` (the CI command), then unzip `out/website.zip`, serve it with a static server and open it in a browser; verify both pages load, navigation links work with `aria-current` on the current page, the stylesheet and hero image load, and `grep -r "core\|react" --include=package.json` finds no leftover references
