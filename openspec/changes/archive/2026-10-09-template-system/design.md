# Design

## Context

- **Styles:** `@webmio/render` has one stylesheet: `siteCss(theme)` writes the theme's custom
  properties, then `BASE_CSS` (about 1,300 lines in `css.ts`) with literal type sizes, gaps and
  paddings (`1.5rem` gaps, `3rem` block padding, `clamp(…)` hero headings). Pages never read
  anything but the theme's custom properties and block classes, and variants already put a class
  on the block's root "so templates can style it" (site-rendering, "Block variants").
- **Packages:** imports go one way, `@webmio/model ← @webmio/render ← @webmio/export`, checked by
  `boundaries.test.ts` in each package; the package entries run in the browser too.
- **Documents:** schema version 12. `migrateSite` in the model upgrades on read in the admin
  (`site-documents.ts`, `versions.ts`, `load-site.ts`, `publishing/redirects.ts`); `renderSite`
  validates and doesn't migrate.
- **Blocks from data:** `siteBuilder` (`builder.ts`) turns `BlockInput` objects (headings,
  `## `/`- ` text bodies, `show: all` collection blocks, looks) into nodes, but the conversion
  lives inside `build()`. The admin creates blocks through its own `transforms.ts`, with
  placeholders.
- **Add page:** `addPage(session, title)` in `apps/admin/src/lib/editor/pages.ts` creates one
  text block; the dialog in `PagesSidebar.svelte` asks for a title only.
- The layouts to ship are in `docs/layouts.md`; the shared ones are listed in the templates spec.

## Goals / Non-Goals

**Goals:**
- One place that defines a template, used by rendering, the editor, the panel and later the
  guided setup and template switching.
- Existing sites look exactly as they do now, proven by tests, not by eye.
- Adding a launch template is adding a module to the registry: tokens, styles, looks, layouts.

**Non-Goals:**
- Templates as uploadable or third-party code. They're ours and reviewed like any code.
- Per-template HTML. Every template renders the same markup; only the stylesheet differs. If a
  launch template needs other markup, that is a new block look, shared by all templates.
- Old template releases kept for rendering. There is only the current release.

## Decisions

### 1. A new package, `@webmio/templates`, between the model and the renderer

`model ← templates ← render ← export`. The templates need the model (block inputs, node types,
looks) and the renderer needs the templates (tokens and styles); the admin needs the layouts
without rendering anything.

- *In `@webmio/render`:* layouts and upgrades aren't rendering, and the guided setup would import
  the renderer to make pages.
- *In `@webmio/model`:* the model would carry stylesheets.

The package entry needs no filesystem, like the others. Its boundary test allows only
`@webmio/model`; render's allows `@webmio/model` and `@webmio/templates`.

### 2. A template is a typed module; the registry is a list

```ts
interface Template {
  id: string;                    // "standard"
  release: number;               // 1
  name: Localized; description: Localized; trades: Localized[];
  tokens: TemplateTokens;        // every token, see decision 3
  css: string;                   // after the shared styles; "" for Standard
  looks: { hero: HeroLayout; services: ServicesLayout; team: TeamLayout;
           gallery: GalleryImageFit; cards: CardsLayout };
  layouts: readonly Layout[];    // shared layouts first (decision 6)
  upgrades: Readonly<Record<number, (doc: SiteDocumentJson) => void>>; // by release
}
type Localized = { cs: string; en: string };
```

`TEMPLATES` is the list; `templateById(id)` looks one up. Names and texts are in the template,
not in the admin's i18n files, because the template owns them and the guided setup needs them.

### 3. Tokens are custom properties; the shared styles stay in the renderer

The shared block styles are tied to the renderer's markup, so they stay in `css.ts` and read
tokens. The template supplies the values and extra rules. The stylesheet becomes:

```
@font-face …  →  :root { theme props }  →  :root { template tokens }  →  shared CSS  →  template.css
```

Tokens (names fixed for all templates):

| Token | Standard (today's literal) |
| --- | --- |
| `--text-small`, `--text-body` | `0.9rem`, `1rem` |
| `--text-h3`, `--text-h2` | today's `h3`, `h2` sizes |
| `--text-title` (the page `h1`), `--text-hero` | `2.25rem`, `clamp(1.75rem, 5vw, 3.5rem)` |
| `--leading-body`, `--leading-heading` | today's line heights |
| `--space-1` … `--space-5` | `0.25rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem` |
| `--block-padding`, `--block-padding-wide` | `2rem`, `3rem` |

The exact values are copied from `css.ts` during implementation. A literal becomes a token only
where the value matches the token exactly. Other sizes (`0.85rem` labels, `0.95rem` captions)
stay literal, as the spec allows for small details. This is what makes the Standard check
possible: **substitute Standard's values for every `var(--token)` the change introduced and
drop the token block, and the result must equal the old stylesheet byte for byte**. The test
keeps the old stylesheet as a fixture file, taken before the CSS is touched.

`siteCss(theme, template, options)` gets the template object, not an ID, so a test can pass a
made-up template, and the canvas can use the same call.

*Alternative:* a template owns the whole stylesheet. Rejected: seven copies of 1,300 lines tied
to markup the templates don't own.

### 4. The document records `template` and `template_release`; every block gets `hidden`

Schema 13: `SiteNode.template: string`, `SiteNode.template_release: number`, and a boolean
`hidden` (default `false`) on all 18 block types. `hidden` is added through one shared property
object, like `COLLECTION_BLOCK`. The migration `toVersion13` sets `standard`, `1` and
`hidden: false`, and a `demo-site-v12.json` fixture is saved before the bump, as for earlier
versions.

*Alternative for hiding:* a list of hidden block IDs on the page. Rejected: duplicating, copying
across languages and deleting blocks would all have to keep it in step. A flag on the block
travels with it.

### 5. Validation learns the registry from its caller

The model can't import the templates. `validateSite(input, { templates })` takes an optional
`ReadonlyMap<string, number>` (ID to current release):
- given: `unknown-template` and `unknown-template-release` errors as the spec says;
- not given: only the shape is checked (an ID matching the pattern, a positive whole number).

`@webmio/templates` exports `TEMPLATE_RELEASES` built from the registry. `renderSite` and the
admin's problem checks (editor problems panel, publish) pass it. The new warning
`page-shows-nothing` (all blocks hidden, or none) is a plain model rule.

### 6. Template upgrades run right after schema upgrades, through one function

`@webmio/templates` exports `upgradeSite(doc)`: `migrateSite(doc)`, then the template's steps
from `template_release + 1` up to the current release, then `template_release = release`. It
leaves an unknown template or a newer release alone, so validation reports it. Every admin read
path that calls `migrateSite` today calls `upgradeSite` instead. Rendering doesn't upgrade:
`siteCss` takes the current release's styles, so an un-upgraded document still renders with
today's styles (the spec's "Rendering always uses the current release").

Steps are plain functions on the JSON, like `migrate.ts`, and are tested on the fixture sites.
Only the current release's code exists, so a step can't call an old release; it describes the
change in the document.

### 7. Layouts are block inputs with localized texts, built by the model's block factory

`builder.ts`'s internal `block(input)` and its helpers (`body`, `link`, `collectionBlock`,
`image`) move into an exported `createBlockNodes(input, ctx)` in the model. `ctx` is an ID
generator and a page lookup. `siteBuilder` keeps using it, so example sites and fixtures don't
change.

A layout is:

```ts
interface Layout {
  id: string; name: Localized; description: Localized;
  blocks: readonly LayoutBlock[];
}
// BlockInput, with Localized wherever BlockInput has a string text, and three placeholders:
//   hero heading/text: { from: "site-name" } / { from: "site-description" }
//   call_to_action buttons: "contact" (email, else phone, else none)
```

`pageFromLayout(doc, template, layoutId, { title, slug, newId })` resolves the localized texts
for the site's language (falling back to `en`), resolves the placeholders from the document, and
returns the new nodes: the page, its blocks and their children. Looks the recipe leaves out come
from `template.looks`. It is pure, so it can be tested on every fixture without the editor. The
guided setup will call it too.

The admin's `addPage(session, title, layoutId?)` calls it with `tr.generate_id`, creates the
nodes in the same transaction as the menu item, and the addition stays one undo step. Without a
layout it does what it does today.

### 8. Rendering filters hidden blocks once

`page.ts` takes the page's visible blocks (`!hidden`) once and uses that list for the `<h1>`
decision, the block loop and the slideshow script check. The media list (`index.ts`) uses the
same helper, a `visibleBlocks(ctx, page)` in `context.ts`, so there's one rule. Copying a page
to another language and duplicating it keep the flag as it is, since they copy nodes.

### 9. The editor reads the template from the document

- **Canvas:** the canvas stylesheet call adds `templateById(site.template) ?? standard`. Changing
  templates isn't possible in this change, so it doesn't need to restyle live.
- **Insert defaults:** the transforms that create a hero, services, team, gallery or cards block
  take the look from `template.looks` instead of the schema default.
- **Hidden:** a "Show on website" switch in the block panel, and "Hide on website" / "Show on
  website" in the handle menu, each one `tr.set([id, "hidden"], …)`. On the canvas the block's
  wrapper gets `data-hidden`, which dims it (admin styles, not site styles) and shows a "Hidden"
  label. The label isn't editable and isn't part of the document.
- **Add page dialog:** a radio group of cards: "Blank page" first, then the template's layouts
  with name and description in the interface language. The title field fills from the layout
  name in the site's language while it's empty or still the previous layout's name.

### 10. The panel uses the Website section's existing save

The Home page sections card edits the language's document through the same working copy and
Save as the site settings. Its rows use the editor's block names (shared i18n keys). The Design
card adds the template's name and description from the registry.

### 11. The template checks live where their dependencies are

- `@webmio/templates` tests: tokens are valid lengths or numbers; looks are in the schema's look
  lists; every layout made into a page on every fixture site (`demo-site`, `image-blocks-site`,
  `starter-site`) validates without errors; upgrade steps run on the fixtures and give valid
  documents.
- `@webmio/render` tests (it has `html-validate`): every template renders every fixture, and
  every page passes `html-validate`; the Standard substitution check (decision 3); the pages
  snapshot stays unchanged.

The registry is iterated, so a new template is checked without adding tests.

## Risks / Trade-offs

- [Turning literals into tokens changes the look by accident] → the substitution test fails on
  any value that isn't exact, and the page snapshots must not change.
- [A hidden block is forgotten and the owner wonders where their content went] → the canvas
  label, the Home page sections card, and the all-hidden warning. Website health can nudge later.
- [An upgrade step goes wrong across every site at once] → steps are tested on all fixtures and
  the example sites (`load-site`); the stored document isn't overwritten until the next save,
  and version history keeps the version before it.
- [Validation without the registry misses unknown templates] → render and publish always pass
  it; the model-only path is for tests and tools.
- [Moving block creation out of `siteBuilder` breaks example sites] → builder tests and the
  `load-site` tests keep passing unchanged; the move comes before any new use.

## Migration Plan

1. Deploy: stored documents upgrade to schema 13 and Standard release 1 when read, and are
   stored at their next save, as with every schema bump. Rendered output is unchanged, so no
   republish is needed.
2. Rollback: older code reports schema 13 as unsupported, as with earlier bumps. Roll back only
   before owners save, or restore the documents from the version history (the versions before
   the deploy are still schema 12).
