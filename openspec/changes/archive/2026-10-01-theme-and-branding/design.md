# Design

## Context

See proposal.md for the motivation. Two choices were settled with the owner before drafting:
- **Fonts are self-hosted webfonts** from a curated catalog, rather than system font stacks only.
- **The Theme tab offers presets** as a starting point.

The current state that shapes the approach:
- **The theme node** (`schema.ts`, `types.ts`) has eight strings:
  - four colours;
  - `font_heading` and `font_body`, free CSS font lists checked by the `FONT_STACK` regex in `validate/domain.ts`;
  - `radius` and `content_width`.

  `checkTheme` validates the colours and lengths, and checks one contrast pair: text on background.
- **The stylesheet.** `render/css.ts` emits `:root` custom properties (`themeCss`) followed by fixed layout CSS. Colours are used in more pairs than the one checked:
  - the button label is `--color-background` on `--color-primary`;
  - the hero (`css.ts:155`), the call to action (`:321`), testimonials (`:357`) and logo rows (`:303`) sit on `--color-secondary`, with text and links on top.
- **The header** is `<a class="site-name">${site.name}</a>` (`render/page.ts:71`). `Site.svelte` mirrors it on the canvas.
- **The canvas stylesheet** comes from `canvasCss()` (`lib/editor/canvas-css.ts`). It is injected once by an `$effect` that reads the document through `untrack`, so theme edits never reach it. While any theme value is invalid, it swaps in a whole `FALLBACK_THEME`.
- **Media bytes.** Export takes media bytes from its caller, keyed by file name, and fails on a missing file. Three callers gather them:
  - the preview (`lib/server/preview.ts`), from `usedMediaFiles`;
  - publishing (`lib/server/publishing/publish.ts`), the same way;
  - the in-browser ZIP download (`routes/p/[project]/+page.svelte`), via the `export-input` endpoint, then each file through `paths.media(name)`.
- **Shared fields** are copied from the primary in `applySharedFields` (`packages/site/src/languages.ts`); the theme is already one of them.
- **Image slots.** The site's favicon and share image are `node_array` slots with at most one image. They have `ImageSetting.svelte` for the UI and `setSlotImage` in `site.ts`. A table in `images.ts` decides which derived files a slot uses.
- **Migrations.** `migrateSite` chains 1 → … → 5; this change adds 5 → 6.

## Goals / Non-Goals

**Goals:**
- `packages/site` stays pure: no font bytes, no file system access, the same in Node and the browser. It knows the catalog as data.
- Rendering stays deterministic: the same document and the same font package versions give byte-identical output.
- The canvas shows what will be published (fonts, colours, logo), live.
- No request from a published site, or from the editor, goes to a third party.

**Non-Goals:**
- Font subsetting to the characters a site actually uses. The latin and latin-ext subsets are small enough.
- Preloading fonts (`<link rel="preload">`). `font-display: swap` and small files are enough for now.
- A colour picker that suggests accessible colours. The tab measures and reports; it doesn't fix colours for the owner.

## Decisions

### 1. Fonts are catalog IDs in the document

`font_heading` and `font_body` become IDs such as `lora` or `system-sans`. The catalog in `packages/site/src/fonts.ts` gives each ID:
- a display name and a CSS family (`"Lora"`);
- a kind (`sans`/`serif`);
- a fallback list (for example `Georgia, 'Times New Roman', serif`);
- for webfonts, the files and the `unicode-range` of each subset.

`themeCss` writes `--font-heading: "Lora", Georgia, 'Times New Roman', serif`.

**Why IDs:**
- The renderer has to know which files to ship and which `@font-face` rules to write. A free CSS list would have to be reverse-mapped to files.
- Free lists invite values the site can't deliver.
- IDs keep the document small and readable.

*Alternative:* keep CSS lists and add a separate `fonts` property naming the files. That's two sources for one choice, and they could disagree.

### 2. Font files come from `@fontsource-variable/*`, supplied by the caller like media

Each catalog webfont is one npm package, `@fontsource-variable/<name>`, pinned in the pnpm catalog and depended on by `apps/admin` only. Each ships variable WOFF2 files per subset and style, plus the OFL `LICENSE`.

The catalog maps our stable file names (`lora-latin-ext-normal.woff2`, `lora-OFL.txt`) to the package's own paths, which look like `@fontsource-variable/lora/files/lora-latin-ext-wght-normal.woff2`. The `unicode-range` strings are copied into the catalog from each package's CSS at the pinned version. The flow:

- `packages/site` exports `usedFontFiles(doc)`.
- Export gains a `fonts` map, separate from `media`, and the `fonts` option is required whenever the theme uses a webfont. Missing bytes fail the export exactly like missing media.
- In `apps/admin`, `lib/server/fonts.ts` resolves a name through the catalog to the file in `node_modules` (via `import.meta.resolve`/`createRequire`) and reads it. The preview and publishing call it.
- A route `GET /fonts/[name]` serves the same files to the canvas and the in-browser ZIP download, cached for a day. The names carry no version, so they aren't marked immutable: a package upgrade has to reach editors within a day. They are public open-licence files, so the route needs no sign-in. `export-input` adds `fontFiles`.

**Why variable fonts:** one file per subset and style covers weights 400–700. There's no need to guess which static weights the CSS uses (400, 700, and bold in headings).

**Why our own file names:** published URLs don't change if a package renames its files. The spec can name them, and they read well in a deployed site.

**Why separate from media:** media is per project and on disk under the project; fonts are global and come from packages. Mixing the maps would leak this difference into `usedMediaFiles`, the media access rules and cleanup.

*Alternatives:*
- **Vendoring the WOFF2 files into the repo:** a few MB of binaries in git, updated by hand. The packages give versioned updates and the licence text.
- **Bundling the bytes into `packages/site`:** this breaks the "no bytes, pure" goal, and bloats the browser bundle.
- **Google Fonts CSS:** a third-party request from every visitor, which the project avoids (see the map decision in business-info).

### 3. The catalog

| ID | Family | Kind | Package |
|---|---|---|---|
| `inter` | Inter | sans | `@fontsource-variable/inter` |
| `work-sans` | Work Sans | sans | `@fontsource-variable/work-sans` |
| `source-sans` | Source Sans 3 | sans | `@fontsource-variable/source-sans-3` |
| `nunito` | Nunito | sans | `@fontsource-variable/nunito` |
| `lora` | Lora | serif | `@fontsource-variable/lora` |
| `source-serif` | Source Serif 4 | serif | `@fontsource-variable/source-serif-4` |
| `merriweather` | Merriweather | serif | `@fontsource-variable/merriweather` |
| `playfair` | Playfair Display | serif | `@fontsource-variable/playfair-display` |
| `system-sans` | (system) | sans | none: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `georgia` | (system) | serif | none: `Georgia, 'Times New Roman', serif` |

Checked at version 5.3.0 of every package (task 1.1). Each has:
- a `wght` axis covering 400–700 (Lora's is exactly 400–700, Playfair Display's 400–900);
- `latin` and `latin-ext` files in both styles, named `<package>-<subset>-wght-<style>.woff2`;
- an SIL Open Font Licence 1.1 `LICENSE`.

None needed swapping.

### 4. Presets live in `packages/site`

`THEME_PRESETS` sits next to the catalog, so a unit test can run every preset through `validateSite` (contrast included). The editor imports it.

Five presets:
1. **Harbour:** today's starter values. It is first, so new projects look the same as before.
2. **Bakery:** warm brown and cream, Lora and Work Sans.
3. **Garden:** deep green, Source Serif and Source Sans.
4. **Studio:** near-black and off-white, Inter for both, square corners.
5. **Clinic:** teal and pale blue, Nunito for both, round corners.

The exact hex values are chosen during implementation and pinned by the validation test.

### 5. Contrast: four pairs, each its own problem

`checkTheme` checks the four pairs from the theming spec with the existing `contrastRatio`. Each failure is a `low-contrast` problem with the pair in the message ("Links and buttons", "Text on panels", …) and the problem's `property` set to the pair's first colour, so `locate.ts` can focus that field.

The button label (background on primary) is the same pair as primary on background, so it needs no extra check.

The existing projects all still have the starter theme (nothing could edit it), which passes every pair, so the new errors block no stored site. A test checks the fixtures.

### 6. Logo: a site image slot, rendered with the width ladder

`site.logo` is a `node_array` of at most one `image`, like `favicon`, and `site.header_show_name` is a boolean (default `true`).

**Logo files.** The logo uses the ordinary WebP variants (`usedMediaFiles` lists them), not a derived file kind:
- The header shows it at most 3rem (48 CSS px) high, so at 2× density a wide logo needs at most a few hundred pixels. The ladder's 480 variant covers most logos, and `sizes` lets the browser pick.
- The server's WebP encoding keeps the alpha channel, so transparent PNG logos stay transparent. A media test with a transparent PNG confirms this before the renderer relies on it.

**Description.** The logo's alt text comes from the site name at render time, not from its image node. The node's own `alt` is ignored, and `checkImageAlt` exempts the slot. This is why the logo's description is per language with nothing to translate.

**Header switch.** "Show the site name" off without a logo is a warning, not an error: the renderer falls back to the name, so there's nothing to block. The editor disables the switch while there is no logo.

**Structured data.** The organisation's `logo` uses the logo's `src` variant when there is one; Google accepts WebP logos. Otherwise it uses the favicon's `icon-512.png`, as today.

*Alternative:* a dedicated `-logo.png` derived file, like the icon files. That adds another server-side derivation and its cleanup rules, for no visible gain over WebP variants.

### 7. The Theme tab and its operations

`ThemeSettings.svelte` sits beside `SiteSettings`/`BusinessSettings`, with `editor.settingsTab = "theme"`. Operations go in `lib/editor/theme.ts`, in the style of `site.ts`:
- each is one Svedit transaction;
- hex typing uses `{ batch: true }` and writes only when the value parses;
- `applyPreset` sets seven properties in one transaction.

The logo reuses `ImageSetting` with a new `logo` slot, and `ImageSlot` grows to `"favicon" | "share_image" | "logo"`.

**Font previews.** Each option in the font pickers is rendered in its own face. The tab loads the catalog's `@font-face` rules once (from `/fonts/…`, latin subset only) when it opens. Browsers fetch a face only when text uses it, so this costs a request per font shown, not every file.

The pickers are a list of radio buttons (a `fieldset` per font role), not `<select>`: options of a native select can't be styled with their own font in every browser, and radios are accessible without extra ARIA.

### 8. The canvas restyles from the theme node

The `$effect` in `edit/+layout.svelte` stops using `untrack`. It derives the theme node and `logo`/`header_show_name`, and updates one `<style>` element's `textContent` when they change, rather than recreating the element.

`canvasCss` drops the whole-theme fallback. It keeps a per-field "last valid value" (seeded from the first preset), so typing `#8b` into one colour doesn't reset the fonts. Contrast problems don't count as invalid, because the owner must see the colour they chose.

The `@font-face` rules on the canvas point at `/fonts/<file>`. `fontFaceCss(theme, urlPrefix)` takes the prefix: `fonts/` in the published stylesheet, `/fonts/` in the editor.

`Site.svelte` renders the logo and name in the header with the same markup rules as `render/page.ts`, so the canvas and the site agree.

### 9. Document format 6

`toVersion6` in `migrate.ts`:
- maps each font list to `georgia` when its first family is Georgia or it ends in the generic `serif`, and to `system-sans` otherwise;
- adds `logo: []` and `header_show_name: true`;
- sets the schema version to 6.

The current fixtures move to format 6; a copy of today's `demo-site.json` is kept as `demo-site-v5.json` for the upgrade test, as earlier formats did. `FONT_STACK` goes away.

## Risks / Trade-offs

- **[Font package updates change output bytes]** → The packages are pinned in the pnpm catalog. A deliberate upgrade shows up as a snapshot and stylesheet diff in review, and the `unicode-range` strings in the catalog are re-copied then.
- **[`import.meta.resolve` of package files under adapter-node]** → The production build must keep `@fontsource-variable/*` as runtime dependencies (not bundled into the server chunk) so the files exist on disk. Tasks include checking the built server serves `/fonts/…` and that the deployment notes mention it.
- **[More contrast errors make previously valid documents invalid]** → Only true if a stored theme fails a new pair. No editor could change themes before this change, and a fixture test covers the starter. The panel names the pair and jumps to the colour.
- **[Large logos in the header]** → `sizes` from the aspect ratio plus `max-height`/`max-width` in CSS keep a 4000-pixel upload from being downloaded at full size. The ladder is capped at 2400 anyway.
- **[Webfont flash on first visit]** → `font-display: swap` with metric-similar fallbacks in the catalog. Accepted.
- **[A catalog font later needs replacing]** → IDs are never removed (spec). A retired font keeps rendering; the picker can hide it.

## Migration Plan

- Stored documents are upgraded on read (5 → 6) and saved as 6 on the next save, as with earlier formats. Nothing needs running at deploy.
- Deploy notes: `@fontsource-variable/*` are runtime dependencies of `apps/admin`; `pnpm install --prod` must include them.
- Rollback: an older build can't read format-6 documents. Rolling back after any format-6 save means restoring the database from backup (Litestream), as with earlier format bumps.
