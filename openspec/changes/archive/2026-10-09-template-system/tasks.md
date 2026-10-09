# Tasks

## 1. Baselines, before anything changes

- [x] 1.1 Save today's `siteCss` output for the demo site's theme (and for a theme with webfonts) as fixture files in `packages/render` (for example `src/__fixtures__/base-css-v12.css`), and verify they're committed unchanged by any later task
- [x] 1.2 Copy `packages/model/fixtures/demo-site.json` to `demo-site-v12.json` while it's still at schema 12, and verify `migrate.test.ts`'s existing per-version checks pick it up (or add it to them)

## 2. Model: schema 13, hidden blocks, template fields

- [x] 2.1 Add a shared `hidden` property (boolean, default `false`) to all 18 block types in `schema/schema.ts`, the way `COLLECTION_BLOCK` is shared, and `template` (ID pattern) and `template_release` (positive integer) to the site node; bump the default `schema_version` to 13; verify `schema.test.ts` and `pnpm --filter @webmio/model typecheck` pass
- [x] 2.2 Add `toVersion13` to `migrate.ts` (site gets `standard` / `1`, every block `hidden: false`, schema 13) and chain it after `toVersion12`; verify a `migrate.test.ts` case upgrades `demo-site-v12.json` to a valid version-13 document matching the upgraded `demo-site.json`
- [x] 2.3 Upgrade `demo-site.json`, `image-blocks-site.json` and `starter-site.json` to version 13, and verify `schema/fixture.test.ts` and all model tests pass
- [x] 2.4 Give `validateSite(input, { templates })` an optional `ReadonlyMap<string, number>`: with it, report `unknown-template` and `unknown-template-release` on the site node; without it, check only the shapes. Verify with tests for the "Site template" scenarios (Standard at release 1, unknown `bakery`, release 4 when current is 2)
- [x] 2.5 Add the `page-shows-nothing` warning (all blocks hidden, or no blocks) naming the page by title, and verify tests for "Everything hidden" and that a hidden hero placed second still gets the hero-first error
- [x] 2.6 Move `builder.ts`'s internal `block(input)` and its helpers (`body`, `link`, `collectionBlock`, `image`) into an exported `createBlockNodes(input, ctx)` with an ID generator and page lookup in `ctx`; make `siteBuilder` use it and set `template: "standard"`, `template_release: 1`; verify `builder.test.ts` passes unchanged and the admin's `load-site.test.ts` still passes

## 3. The `@webmio/templates` package: contract, registry, Standard

- [x] 3.1 Scaffold `packages/templates` (`package.json` named `@webmio/templates` depending only on `@webmio/model`, `tsconfig`, `tsconfig.build.json`, `vitest`), and verify `pnpm install` and `pnpm --filter @webmio/templates build` succeed
- [x] 3.2 Add a `boundaries.test.ts` that allows only `@webmio/model` and no Node modules, and verify it passes
- [x] 3.3 Define the `Template`, `TemplateTokens`, `Localized`, `Layout` and `LayoutBlock` types (design decisions 2 and 7), the fixed token names (decision 3), and `TEMPLATES`, `templateById` and `TEMPLATE_RELEASES`; verify tests for "Standard is there" and "Unknown ID"
- [x] 3.4 Write the Standard template at release 1: Czech and English name, description and trades; token values copied exactly from `css.ts`; `css: ""`; looks `beside`, `cards`, `cards`, `fill`, `below`; no upgrades. Verify a test that its looks are each block's first look in the schema
- [x] 3.5 Add registry-wide checks: every token value is a valid CSS length or unitless number (it can't break out of its declaration), and every default look is in that block's schema look list, with failures naming the template and the block. Verify with a made-up template that gives the hero `split`

## 4. Layouts and making a page from one

- [x] 4.1 Write the seven shared layouts (Home, Services, About, Team, Contact, FAQ, Careers) as `LayoutBlock` lists with Czech and English starting texts, following `docs/layouts.md` and the templates spec, and give them to Standard; verify a test that Standard's layouts are those seven in order
- [x] 4.2 Implement `pageFromLayout(doc, template, layoutId, { title, slug, newId })` with `createBlockNodes`: texts in the site's language with English as the fallback, the hero's site name and description placeholders, the call to action's email, then phone, then no button, and the template's looks where the recipe sets none. Verify tests for "Services page filled in", "Czech starting texts", "German site" and "Call to action without email" (`tel:+420321123456`)
- [x] 4.3 Add the layout check: every layout of every registry template, made into a page on each fixture site (`demo-site`, `image-blocks-site`, `starter-site`) and added to the document, validates without errors, and a failure names the template and the layout. Verify it fails for a made-up layout whose call to action has an empty heading

## 5. Template releases and upgrades

- [x] 5.1 Implement `upgradeSite(doc)`: `migrateSite`, then the template's steps from `template_release + 1` up to `release`, then record the current release. An unknown template or a newer release is left alone. Verify tests with made-up templates for "Release without document changes", "Release with an upgrade step" (`beside` heroes become `cover`) and for leaving a future release alone
- [x] 5.2 Add the upgrade-step check: every registry template's steps run on every fixture at an older recorded release, give valid documents, and don't change texts, images, collections or the theme. Verify it passes for Standard (no steps) and fails for a made-up step that edits a heading

## 6. Rendering with templates

- [x] 6.1 Add `@webmio/templates` to `@webmio/render`'s dependencies and change its boundary test to allow `@webmio/model` and `@webmio/templates`; verify the boundary test passes
- [x] 6.2 Change `siteCss(theme, template, options)` to write a `:root` block of the template's tokens after the theme's properties and to append `template.css`; replace in `BASE_CSS` only the literals that exactly equal a token's value with `var(--token)`. Pass the template from `renderSite` (`templateById(site.template)`). Verify the substitution test: with Standard's values in place of each `var(--token)` and the token block removed, the stylesheet equals the fixtures from 1.1 byte for byte
- [x] 6.3 Verify the existing page snapshots (`snapshot.test.ts`, `__snapshots__/`) are unchanged, and add the "Template change leaves HTML unchanged" and "Larger headings" tests with a made-up template
- [x] 6.4 Add `visibleBlocks(ctx, page)` to `context.ts` and use it in `page.ts` for the `<h1>` decision, the block loop and the slideshow script check, and in `index.ts` for the media list. Verify tests for "Hidden hero", "Hidden testimonials on the home page", "Hidden slideshow" and "Image only in a hidden block"
- [x] 6.5 Make `renderSite` validate with `{ templates: TEMPLATE_RELEASES }`, and verify a document using `bakery` fails to render with an unknown-template problem
- [x] 6.6 Add the template render check: every registry template renders every fixture site without errors and every page passes `html-validate`. Add `upgrade.test.ts` cases showing the upgraded version-12 demo site renders exactly as before. Verify `pnpm --filter @webmio/render test` passes
- [x] 6.7 Have `@webmio/export`'s `validateSite` call in `languages.ts` pass `TEMPLATE_RELEASES` (add the dependency and update export's boundary test), and verify `pnpm --filter @webmio/export test` passes

## 7. Admin: reading and validating with templates

- [x] 7.1 Add `@webmio/templates` to the admin's dependencies, and replace `migrateSite` with `upgradeSite` in `site-documents.ts`, `versions.ts`, `publishing/redirects.ts` and `upgrade-projects.ts`; verify the server tests pass and a test reads a stored version-12 document as Standard release 1
- [x] 7.2 Pass `TEMPLATE_RELEASES` to every `validateSite` call in the admin (`site-documents.ts`, `load-site.ts`, `upgrade-projects.ts`, `ProblemsPanel.svelte`; the panel's `problems.ts` reads them from `site-documents.ts`), and verify a site whose page has every block hidden reports the `page-shows-nothing` warning, and an unknown template `unknown-template` (problem messages come from the model, as for every other problem; the admin has no per-code translations)

## 8. Editor

- [x] 8.1 Have `canvas-css.ts` pass `templateById(site.template) ?? standard` to `siteCss`, and verify `canvas-css.test.ts` covers "Template's spacing on the canvas" with a made-up template
- [x] 8.2 Make the transforms that insert `hero`, `services`, `team`, `gallery` and `cards` blocks (`transforms.ts`) take the look from the site template's `looks`. Verify `looks.svelte.test.ts` cases for "Template prefers the full photo" (made-up template) and "Standard" (services stay "Cards")
- [x] 8.3 Add the "Show on website" switch to `BlockPanel.svelte` and "Hide on website" / "Show on website" to the handle menu (`handles.ts`, `BlockHandles.svelte`), each one `tr.set([id, "hidden"], …)`, with Czech and English strings. Verify tests that hiding and showing are each one undo step and that typing in a hidden block keeps it hidden
- [x] 8.4 Mark hidden blocks on the canvas with `data-hidden`: admin styles dim them and add a non-editable "Hidden" label that isn't in the document. Verify a component test, and check in the running editor (the `run` skill) that hiding the demo home page's testimonials dims them and the preview leaves them out
- [x] 8.5 Extend `addPage(session, title, layoutId?)` in `pages.ts` to call `pageFromLayout` with `tr.generate_id` and create its nodes in the same transaction as the menu item, keeping today's blank page when there's no layout. Verify `pages.svelte.test.ts` for "Add a page from a layout" (Czech, `sluzby`, one undo removes it) and that "Add a page" is unchanged
- [x] 8.6 Change the Add page dialog in `PagesSidebar.svelte` to a radio group of cards, "Blank page" chosen first and then the template's layouts with name and description in the interface language, filling the title from the layout name in the site's language while the title is empty or still the previous layout's name. Verify tests for "Owner's own title kept" and "Empty title", with Czech and English strings

## 9. Panel: Website section

- [x] 9.1 Show "Template: <name>" and the description from the registry in `DesignCard.svelte`, in the interface language, and verify a test for "Template named" (English, Standard)
- [x] 9.2 Add the Home page sections card to the Website section (`routes/p/[project]/(panel)/website/+page.svelte`): the language's home page blocks in order, named with the editor's block-name i18n keys plus their heading, each with a "Show on website" switch saved by the section's Save, and "Edit home page", which asks to save first when there are unsaved changes. Verify tests for "Turn off the testimonials" (hidden after saving, still in the editor marked "Hidden"), "Unsaved switch" and a non-primary language's home page

## 10. Documentation and integration

- [x] 10.1 Write `docs/templates.md`: the contract, tokens, the registry, layouts and `pageFromLayout`, releases and writing an upgrade step, the template checks, and adding a block (look lists, defaults, layouts). Verify every function and file it names exists
- [x] 10.2 Update `docs/roadmap.md` (template system done) and `docs/layouts.md` (where the shared layouts live in code), and verify the links between the docs resolve
- [x] 10.3 Run `pnpm turbo run typecheck test build` across the workspace and the admin's end-to-end tests, and verify everything passes with the example sites rendering as before
