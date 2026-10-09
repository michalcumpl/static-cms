# Templates

A **template** is a website system we own and ship: design tokens, styles, the default look of
each block, and page layouts. It is separate from the owner's **design** (colours, fonts, logo,
corner radius, content width, all in the site's theme) and from the **pages**, which belong to
the owner once made (strategy, "Templates, designs and layouts"). The specs are in
[`openspec/specs/templates`](../openspec/specs/templates/spec.md); the decisions behind them in
the `template-system` change.

Templates live in [`@webmio/templates`](../packages/templates/), which sits between the model and
the renderer:

```
@webmio/model ← @webmio/templates ← @webmio/render ← @webmio/export
```

Each package's `boundaries.test.ts` checks this. Templates are code, reviewed like any code; a
site document only records which template it uses.

## The contract

A template is a `Template` object (`packages/templates/src/types.ts`):

| Field | What it is |
| --- | --- |
| `id` | lowercase letters, digits and dashes; never changed or reused once a site uses it |
| `release` | the current release, a positive whole number |
| `name`, `description` | Czech and English (`Localized`); the description is one line |
| `trades` | short names of the trades it suits, for suggesting it |
| `tokens` | a value for every design token (below) |
| `css` | its own styles, added after the shared block styles; `""` for none |
| `looks` | the default look of `hero`, `services`, `team`, `gallery` and `cards` |
| `layouts` | the shared layouts first, then its own |
| `upgrades` | the upgrade step of each release that changes documents |

`TEMPLATES` in `registry.ts` lists them; `templateById(id)` finds one and `TEMPLATE_RELEASES`
maps each ID to its current release.

Every template renders the same HTML. Only the stylesheet differs: `siteCss(theme, template)` in
`@webmio/render` writes the theme's custom properties, then the template's tokens, then the shared
styles (`BASE_CSS` in `packages/render/src/css.ts`), then `template.css`. A template that needs
other markup needs a new block look, shared by all templates.

## Design tokens

The shared styles read these custom properties wherever they set the type scale, line heights,
gaps between a block's items, and a block's padding. Small details (labels, captions, badges)
keep fixed sizes.

| Token | Used for | Standard |
| --- | --- | --- |
| `--text-small` | small text (language switcher, project categories) | `0.9rem` |
| `--text-body` | body text | `1.125rem` |
| `--text-h3`, `--text-h2` | headings | `1.3rem`, `1.75rem` |
| `--text-hero` | slide titles | `clamp(1.75rem, 5vw, 3.5rem)` |
| `--text-title` | the page's `h1`, the hero heading included | `clamp(2rem, 5cqi, 3rem)` |
| `--leading-body`, `--leading-heading` | line heights | `1.6`, `1.2` |
| `--space-1` … `--space-5` | gaps | `0.25rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem` |
| `--block-padding`, `--block-padding-wide` | a block's vertical padding, narrow and from 48rem | `2rem`, `3rem` |

Token values are checked by `isTokenValue`: a CSS length, a unitless number, or `clamp`, `min`,
`max` or `calc` of those. Nothing else can get into the stylesheet.

**Standard** is the template every site had before templates existed. Its tokens are the values
the shared styles used to write out, so it renders exactly as before; `templates.test.ts` in
`@webmio/render` puts Standard's values back in place of the token references and compares the
stylesheet with the saved one in `src/__fixtures__/`, byte for byte. When you turn another
literal into a token, only do it where the value equals the token's exactly, or that check fails.

## Layouts

A layout is a page recipe: an ID, a name and a description, and a list of `LayoutBlock`s, each a
block's settings and starting texts in Czech and English (a site in another language gets the
English ones). Layouts carry no styling and no images, links or chosen items, since those belong
to a site. Starting texts use the builder's inline syntax (`**bold**`, `## ` subheadings, `- `
lists).

The shared layouts (`SHARED_LAYOUTS` in `layouts.ts`) come with every template: Home, Services,
About us, Team, Contact, FAQ and Careers. Their recipes come from the example sites, see
[`layouts.md`](layouts.md).

`pageFromLayout(doc, template, layoutId, { title, slug, newId })` makes a page from a layout and
returns its nodes, children first and the page last:

- collection blocks show their whole collection, so the page is filled from the site's data;
- looks the recipe leaves out are the template's `looks`;
- a hero's `{ from: "site-name" }` and `{ from: "site-description" }` become the site's name and
  description, as plain text;
- a call to action's `buttons: "contact"` becomes one button to the main location's email, else
  its phone, else none.

Nothing in the page refers back to the layout. The editor's Add page dialog uses it (`addPage` in
`apps/admin/src/lib/editor/pages.ts`), and so will the guided setup. Blocks are made by
`createBlockNodes` in `@webmio/model`, the same code the site builder uses.

## Releases and upgrades

A site records its template and the release it was last upgraded to (`template`,
`template_release` on the site node). Only each template's current release is in the code.

- **A release that only changes styles or tokens:** raise `release`. Sites pick it up at their
  next preview, and the published site at its next publish; publishing is never started by a
  release.
- **A release that needs the document changed** (a new default look the existing blocks should
  take, say): raise `release` and add a step under that number in `upgrades`. A step is a plain
  function that changes the JSON document in place, like a schema migration. It may change looks,
  settings and `hidden`; it must not change the owner's texts, images, collections or theme.

`upgradeSite(doc)` runs `migrateSite` and then the template's steps from the recorded release up
to the current one. Every read of a stored document in the admin goes through it; the upgraded
document is stored at the next save. A document of an unknown template, or recording a release
newer than the code's, is left alone, and validation reports it (`unknown-template`,
`unknown-template-release`). The model can't import the templates, so validation learns them
from its caller: `validateSite(doc, { templates: TEMPLATE_RELEASES })`. `renderSite` and every
admin check pass it.

## Template checks

The tests go through `TEMPLATES`, so a new template is checked without new tests:

- `packages/templates/src/registry.test.ts`: `templateProblems` (valid ID, release, every token
  set to a valid value, looks from each block's list, unique layout IDs, the shared layouts
  first, upgrade steps for the template's own releases);
- `packages/templates/src/layouts.test.ts`: every layout, made into a page on every fixture site
  (`demo-site`, `image-blocks-site`, `starter-site`), validates without errors;
- `packages/templates/src/upgrade.test.ts`: every upgrade step, from every older release, gives
  valid documents and leaves the owner's content alone;
- `packages/render/src/templates.test.ts`: every template renders every fixture site, and every
  page passes `html-validate`.

Lighthouse joins these with `lighthouse-gate`.

## Adding a template

1. Add a module next to `standard.ts` with the `Template`: tokens, `css`, `looks`,
   `layouts: [...SHARED_LAYOUTS, ...its own]`, `release: 1`, `upgrades: {}`.
2. Add it to `TEMPLATES` in `registry.ts`.
3. Run `pnpm turbo run test`. The checks above now cover it.

## Adding a block

A new block type touches every layer:

1. **`@webmio/model`:** the node type in `schema/schema.ts` (with `...PAGE_BLOCK`, so it can be
   hidden) and `schema/types.ts` (`extends PageBlock`), its validation in `validate/domain.ts`, a
   migration when existing documents need it, and its `BlockInput` in `block-nodes.ts` so the
   builder and layouts can make it.
2. **`@webmio/render`:** its HTML in `blocks.ts` and its styles in `css.ts`, using the tokens for
   type sizes, gaps and padding.
3. **`@webmio/templates`:** if it has a choice of look, add it to `TemplateLooks` and give every
   template a default; if layouts should offer it, add it to `LayoutBlock` and `pageFromLayout`.
4. **Admin:** its canvas component in `apps/admin/src/lib/editor/nodes/`, its insert transform in
   `transforms.ts` (taking the template's look, when it has one), its picker drawing in
   `block-illustrations.ts`, and its name and description in both languages.
