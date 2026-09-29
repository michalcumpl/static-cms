# Design

## Context

- `packages/core` (`@static-cms/core`) is a pure TypeScript library (ES2023, NodeNext, strict, `noUncheckedIndexedAccess`) with vitest, built with `tsc`. It exports `slugify`, `Entry` and `createEntry`. `apps/admin` is a React 19 + Vite stub whose only use of the library is `createEntry`.
- The pnpm catalog pins Vite 8, TypeScript 7 and vitest 5. CI runs `pnpm lint` and `turbo run typecheck test build`.
- MVP direction from the exploration: Svelte 5 + Svedit editor, SvelteKit full-stack backend, site versions stored as whole-document JSON snapshots.
- Svedit (v0.14, pre-1.0) stores content as `{ document_id, nodes }`. Nodes are keyed by ID, text values are `{ content, marks, annotations }`, lists are `node_array` values `{ nodes, marks, annotations }`, and marks are half-open offset ranges pointing at mark nodes. Svedit's read-only rendering still emits editor markup (for example `.node-gap` divs), so it is not suitable for publishing.

## Goals / Non-Goals

**Goals:**
- A document format the Milestone 2 editor can load directly into a Svedit `Session`.
- Publishing output that does not depend on Svelte or Svedit, and can run in Node (server, CLI, tests) and in the browser (client-side ZIP download).
- Clean, reviewable, deterministic HTML that can be snapshot-tested.
- The real app stack (SvelteKit + Svelte 5) wired into the monorepo, consuming `@static-cms/site` on both server and client.

**Non-Goals:**
- Svedit schema features beyond what the three blocks need (annotations are carried but ignored by the renderer).
- Web fonts, image processing (resizing, format conversion, reading dimensions), CSS minification.
- Document migrations or schema versioning beyond a `schema_version` field on the site node.
- Any admin UI design work: the M1 shell is deliberately plain.

## Decisions

### 1. Package name: `@static-cms/site`

Rename `packages/core` to `packages/site`. The package holds the site model (schema, types, validation) and the site build (render, export). Call sites read as what they do: `import { validateSite, renderSite, exportSite } from "@static-cms/site"`.

- **Alternatives:** keeping `core` (vague, and it becomes a dumping ground once the app has server code). `compiler` (fits the "website compiler" framing, but the editor importing its schema from a "compiler" reads oddly). Splitting into `schema` + `render` (cleaner, but no consumer needs just one half yet, and it adds a build step). Splitting later is mechanical, because the internal folders already separate the concerns.

### 2. One Svedit document per site, rooted at a `site` node

The whole site (settings, theme, navigation, pages, blocks) is one document whose `document_id` is the `site` node. Pages are `page` nodes in the site's `pages` node_array. Navigation items reference page nodes, not URLs.

- **Why:** a site version is a single JSON blob, which matches the snapshot-per-version storage chosen for the backend. It also gives one undo history across pages, and navigation survives slug changes.
- **Alternative:** a site envelope plus one Svedit document per page. It is closer to Svedit's "document = routable entry" idea, but adds a second, non-Svedit model and cross-document references.
- **Uncertainty:** Svedit's `kind: 'document'` suggests one routable node per document. Whether a `Session` can edit a single page inside a site document must be confirmed in the Milestone 2 spike. If it can't, the fallback is splitting per page at load time. That only touches loading, not the renderer.

### 3. `@static-cms/site` owns the schema as plain data and does not depend on `svedit`

The package exports the node schema as a Svedit-format schema object (plain JSON-compatible data) plus hand-written TypeScript types for each node. It does not import `svedit`, because that would pull Svelte into a library that must run in plain Node. The editor app will pass the same schema object to Svedit.

- **Alternative:** reuse Svedit's validation. It is rejected for the dependency reason, and because our rules (a11y, slugs, contrast, hero placement) are domain rules Svedit doesn't know about anyway.
- **Naming:** document properties use snake_case (`base_url`, `seo_description`) to match Svedit's conventions and the stored JSON. The TypeScript API uses camelCase.

### 4. Validation is schema-driven generic checks plus domain rules

Two passes, both collecting every problem (the `ValidationResult` from the spec):
1. **Generic, driven by the schema:** IDs, key/id match, known types, property value shapes, reference existence and allowed types, reachability (walked from root), cycles, mark offsets within bounds and not overlapping.
2. **Domain:** site/page rules, unique normalized slugs (reusing `slugify`), hero-first, alt-or-decorative, link-scheme allow-list, theme hex colors, and WCAG contrast (relative-luminance formula, text on background ≥ 4.5).

Render and export call validation first and return its errors instead of throwing. Invalid input is expected once real users edit content, so it is modelled as data, not exceptions.

### 5. Renderer: pure functions returning strings, with one escaping choke point

`renderSite(doc, { basePath = "/" })` returns `{ pages: [{ path, html }], css }`. Each block type has a function `(node, ctx) => string`. All text reaches HTML through one escaping helper, and attributes through one attribute helper that also applies the link allow-list. All internal URLs go through a single `url(path)` helper on the render context, which is the only place the base path is applied. There is no templating library or JSX.

- **Why:** there are few block types, output is easy to snapshot, it runs anywhere, and escaping and URL building each have a single place to audit.
- **Base path vs. relative links:** relative links (`../assets/style.css`) would work under any prefix without an option, but they complicate every emitted URL and don't make `file://` browsing work anyway (directory links open folder listings). An explicit base path is simpler and also covers hosting in a subdirectory.
- **Marked text:** Svedit guarantees marks don't overlap, so rendering is linear. Split the string at mark boundaries and wrap each marked segment (`strong` → `<strong>`, `emphasis` → `<em>`, `link` → `<a href>`). Offsets are treated as JavaScript string indices (UTF-16 code units). See Risks.
- **Headings:** a render context tracks whether the page's `<h1>` came from a hero. That context implements the "exactly one h1" rule from the rendering spec.
- **Deterministic output:** no timestamps, random IDs or object-key-order dependence. Nodes are always visited through ordered `nodes` arrays.

### 6. Theme → CSS custom properties + a static base stylesheet

The theme becomes a `:root { --color-primary: …; --font-heading: …; --radius: …; --content-width: … }` block, followed by a base stylesheet shipped as a string constant in the package. The base stylesheet covers layout, header/nav/footer and the three blocks, and uses only `var(--…)` for themeable values. Fonts are CSS font-family stacks. No web fonts are loaded, which avoids third-party requests (a GDPR concern for EU customers) and keeps the export self-contained.

### 7. Export: file map in, file map and ZIP out; media supplied by the caller

- `exportSite(doc, media: Map<string, Uint8Array>, { basePath })` returns `{ files: Map<string, Uint8Array>, warnings }` or validation/missing-media errors. The `src` of an `image` node is a media key (file name). Its output path is `assets/images/<key>`.
- `zipFiles(files)` returns a `Uint8Array` built with **fflate**: small, dependency-free, and it works in both browser and Node. Determinism: entries are sorted by path, and every entry gets the same fixed modification time (1980-01-01, the ZIP epoch).
- The package never reads or writes the filesystem. The caller (demo script, SvelteKit server, or browser) owns I/O.
- **Alternative:** JSZip. It is larger and async-only, with no benefit here.

### 8. Module layout in `packages/site/src`

```
schema/     node schema object + TS node types
validate/   generic + domain checks, ValidationResult
render/     escape, url, text marks, blocks, page shell, css
export/     file tree, sitemap, zip
index.ts    public API (slugify, validateSite, renderSite, exportSite, zipFiles, schema, types)
```

### 9. Demo fixture, script and HTML checks

- `packages/site/fixtures/demo-site.json` is a two-page Czech small-business site (home with hero + services + rich_text, a `kontakt` page with rich_text). `fixtures/media/` holds one small hero image. Tests, the demo script and the admin app all use the same fixture. The package publishes it through a `"./fixtures/*"` subpath export and the `files` list.
- `packages/site/scripts/build-demo.ts` reads the fixture and media, exports, and writes `packages/site/out/website.zip`. It runs on the built package with `node --experimental-strip-types`, which Node 22.6+ supports, so no `tsx` dependency is needed. The root script `build-demo` builds the package, then runs it. `out/` is git-ignored.
- Snapshot tests use vitest `toMatchFileSnapshot` into `.html` files, so rendered output can be reviewed as real HTML in diffs.
- **html-validate** (devDependency only) checks each rendered demo page in a test. This is how "standards-compliant" gets a concrete, automated meaning.

### 10. Admin shell: SvelteKit + Svelte 5, three routes

`apps/admin` is replaced wholesale (not migrated) with a SvelteKit app using `adapter-node`, TypeScript and `svelte-check` for its `typecheck` script:

```
/                       +page.server.ts: load fixture, validateSite --> problems + page list
                        +page.svelte:    show problems, link to each /preview/<slug>/,
                                         [Download ZIP] button
/preview/[...path]      +server.ts:      renderSite(doc, { basePath: "/preview/" }) and serve
                                         page HTML, assets/style.css, assets/images/*
/demo/[...file]         +server.ts:      serve the raw fixture JSON and media bytes
```

- **[Download ZIP] runs entirely in the browser:** fetch the fixture and media from `/demo/…`, then call `exportSite` and `zipFiles` client-side and save the result as a Blob. This is the M1 proof that the package works in the browser, not only on the server.
- The fixture is read on the server via the package's `fixtures/*` subpath export (resolved with `import.meta.resolve`), so the app doesn't depend on repo-relative paths.
- **Why these three routes:** they exercise server import, client import and base-path rendering, which are the three integration points M2 relies on. Nothing else.
- **Alternative:** keep the React stub until M2. That was rejected: it leaves the wrong framework in the tree and defers catching SvelteKit/monorepo build problems.

## Risks / Trade-offs

- **[Svedit is pre-1.0; the document format may change]** → The renderer depends only on the documented `{ document_id, nodes }` / text / node_array shapes, and these are isolated in `schema/`. The Milestone 2 spike re-checks them against the current Svedit version.
- **[Mark offsets may not be UTF-16 code units in Svedit]** (for example grapheme-based) → M1 uses JS string indices, and tests include Czech diacritics (single code units after NFC). The M2 spike verifies offsets with an emoji. Only the mark-splitting function would change.
- **[Two renderers drift: Svedit edit components vs. `@static-cms/site` HTML]** → Both use the same block class names and the package's stylesheet. Edit components will import that CSS in M2, and snapshot tests pin the published markup.
- **[Hand-written TS types can drift from the schema object]** → A test checks that every schema node type has a matching render function and fixture coverage.
- **[SvelteKit may not yet support the catalog's Vite 8 / TypeScript 7]** → Check during setup. If needed, pin the versions SvelteKit supports in the catalog for the admin app only, and record the pin in the catalog with a comment.
- **[`--experimental-strip-types` prints a warning, and the flag may change]** → It only affects a dev convenience script. The fallback is adding `tsx`.
- **[Hero-first and only-bulleted-lists constrain users]** → These limits are deliberate for the MVP. They make the h1 and landmark rules simple to guarantee.

## Migration Plan

Internal only, with nothing deployed. The package rename and the admin rewrite happen in this change, so the tree never contains a consumer of the old name. The rename is done first, with the React admin's import updated so every step still builds, and the admin replacement comes last.
