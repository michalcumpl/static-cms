# Tasks

## 1. Font catalog and presets in `packages/site`

- [x] 1.1 Check each candidate `@fontsource-variable/*` package at its latest version for a `wght` axis covering 400–700, italic files and a `latin-ext` subset (design.md decision 3). Swap any family that fails for another of the same kind, and update the theming spec, the proposal and decision 3 to match. Verify that the catalog table in design.md lists only checked packages, with their versions noted.
- [x] 1.2 Add `src/fonts.ts` with the catalog (decisions 1–3): for each ID, the name, kind, family, fallback list, and for webfonts each file's subset, style, `unicode-range` (copied from the package CSS) and package path. Add `themeFontFiles(theme)` and `usedFontFiles(doc)`. Verify with unit tests for "Lora headings, Inter body", "Same font for both" and "System fonts only".
- [x] 1.3 Add `THEME_PRESETS` with the five presets of decision 4, the first equal to today's starter theme. Verify with a unit test that runs every preset through validation with no theme problem (after group 2), and one that "Harbour" equals the starter fixture's theme.

## 2. Document format 6 in `packages/site`

- [x] 2.1 Add `logo` (`node_array` of `image`) and `header_show_name` (boolean, default `true`) to the site schema and types. Set `SCHEMA_VERSION` to 6 and add `toVersion6` to the migration chain (decision 9). Verify with unit tests for "Upgrade the starter theme", a custom serif list (→ `georgia`), an unknown list (→ `system-sans`), the earlier upgrade scenarios now ending at 6, "Already upgraded" and "Unsupported schema version" (version 5).
- [x] 2.2 Upgrade the fixtures (demo, image blocks, starter), the e2e fixture documents and the admin's starter to version 6, keeping today's `demo-site.json` as `demo-site-v5.json`. Verify that both packages' test suites pass.
- [x] 2.3 Validation (decision 5): fonts must be catalog IDs (drop `FONT_STACK`); the four contrast pairs, each its own `low-contrast` problem with the pair named and `property` set to its first colour; at most one logo; the logo exempt from image descriptions; the "name hidden without a logo" warning. Verify with unit tests for "Unknown font", "Font list instead of an ID", "Pale primary colour" (2.23:1), "Dark secondary colour", "Every pair passes", "Two logos", "Site logo without description" and "Name hidden without a logo", and extend the owners'-words test. Verify the fixtures still have no theme problem.
- [x] 2.4 Add the logo and header switch to `applySharedFields`. Verify with a unit test for "Logo in every language" at the document level: the other language gets the primary's logo node and switch, and keeps its own site name.

## 3. Rendering and export in `packages/site`

- [x] 3.1 Stylesheet: `themeCss` writes the family plus fallback for each font, and `fontFaceCss(theme, urlPrefix)` writes the `@font-face` rules ahead of it (theming spec, "Theme stylesheet"). Verify with unit tests for "Font change leaves HTML unchanged", "System fonts" and the exact rule for one Inter file, and updated snapshots.
- [x] 3.2 Header: render the logo and name per "Header logo", with `sizes` from the aspect ratio and the header CSS for the logo's height on wide and narrow screens. Verify with unit tests for "Logo and name", "Logo only", "Name hidden without a logo", a non-integer ratio (for example `calc(3rem * 2.67)`), the not-found page's header, and `html-validate` on a page with a logo.
- [x] 3.3 `usedMediaFiles` lists the logo's variants, and the organisation's JSON-LD prefers the logo (decision 6). Verify with unit tests for "Site logo" and "Logo preferred over the favicon", and that a favicon-only site still uses `icon-512.png`.
- [x] 3.4 Export: a `fonts` map supplied by the caller, placed under `assets/fonts/`, the primary's fonts with several languages, and failure on a missing file (site-export spec, "Font files"). Verify with unit tests for "Webfonts exported", "Missing font file" and "System fonts only", and a two-language export with the fonts once.
- [x] 3.5 Add a README note on document format 6 and fonts as catalog IDs. Verify by reading it.

## 4. Fonts and logo files in `apps/admin`

- [x] 4.1 Add the checked `@fontsource-variable/*` packages to the pnpm catalog and as runtime dependencies of `apps/admin`. Verify that `pnpm install` succeeds and that each catalog file path resolves (unit test over the whole catalog).
- [x] 4.2 Add `lib/server/fonts.ts` (name → bytes through the catalog) and the `GET /fonts/[name]` route (immutable caching; unknown names are 404). Add `woff2` to `content-type.ts`. Verify with unit tests for a known file, a licence file, and an unknown name.
- [x] 4.3 Supply font bytes in the preview, publishing and the ZIP download (`export-input` gains `fontFiles`). Verify with unit tests: the preview serves `assets/fonts/lora-latin-normal.woff2` for a Lora site, and a publish uploads it to the fake Netlify.
- [x] 4.4 Confirm that WebP variants keep transparency (decision 6). Verify with a media test that uploads a transparent PNG and finds alpha in its 480 variant.
- [x] 4.5 Build the admin app and start the built server. Verify that `/fonts/inter-latin-normal.woff2` is served from it (the fontsource packages are available at runtime), and add the dependency note to the deployment docs.

## 5. Editor

- [x] 5.1 Add theme operations in `lib/editor/theme.ts` (decision 7): set a colour from a hex value (batched, only when valid), set a font, radius and width, apply a preset in one transaction, and toggle the header switch. Add the `logo` slot to `ImageSlot`/`setSlotImage`. Verify with unit tests for "Apply a preset" (width kept, one undo), "Type a hex colour", "Choose a logo" (switch on) and removing the logo.
- [x] 5.2 Live canvas (decision 8): the stylesheet effect follows the theme without `untrack` and updates one `<style>`; `canvasCss` keeps the last valid value per field and loads fonts from `/fonts/`; `Site.svelte` renders the logo and name. Verify with unit tests for `canvasCss` (one invalid colour keeps the other fields, a contrast failure still applies the colour), and e2e tests for "Live colour", "Live font" and "Low contrast still shown".
- [x] 5.3 Add the Theme tab (`ThemeSettings.svelte`): presets with swatches, colour pickers and hex fields, the contrast list, the font radio lists in their own faces, radius and width with "Custom", the logo setting and the header switch (disabled without a logo). Verify with e2e tests for "Apply a preset", "Failing contrast shown", "Choose a logo" and "Hide the name", and an axe check of the tab.
  - Note: the project has no axe dependency, so the e2e test checks that every control of the tab has an accessible name and that its groups are labelled, instead of a full axe scan. Adding `@axe-core/playwright` is open for the owner to decide.
- [x] 5.4 Shared fields outside the primary: the Theme tab is read-only with the `SharedNote` link. Verify with an e2e test for "Theme in English".
- [x] 5.5 Extend `settingsTarget` in `locate.ts` for theme fields, contrast pairs and the logo. Verify with unit tests for each, and an e2e test for "Go to a contrast problem".

## 6. End to end and docs

- [x] 6.1 e2e: in a two-language project, apply a preset, choose Lora headings and a logo with the name hidden, save, and publish to the fake Netlify. The deployed files include the Lora fonts and licence. Both languages' headers show the logo, with their own site names as alt text, and the stylesheet has the preset's colours.
- [x] 6.2 Update the roadmap (Milestone 3: theme and branding done, with decisions and known limits: no SVG logos, no custom fonts). Verify by reading it.
- [ ] 6.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [ ] 6.4 Manual check by the owner: give a real project its brand colours, fonts and logo, publish, and check the site on a phone and a desktop, Czech characters in every chosen font included. Record the outcome in design.md.
