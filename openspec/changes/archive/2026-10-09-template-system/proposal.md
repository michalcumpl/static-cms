# Proposal

## Why

The strategy makes templates complete website systems that we own, separate from the owner's
design and from the pages built from layouts ("Templates, designs and layouts"). Today nothing
says which template a site uses: every site gets the same stylesheet (`BASE_CSS` in
`@webmio/render`) with hard-coded spacing and type sizes, new pages start as one empty text block,
and an owner can't hide a home page section without deleting it. The seven launch templates,
`guided-setup` and `template-switching` all need a template contract to build on, so it comes
first.

## What Changes

- **A template contract and registry** in a new package, `@webmio/templates` (model ← templates ←
  render ← export). A template is code-owned data: an ID, a name and a description, the trades it
  suits, a release number, its design tokens (type scale, spacing, block padding), extra styles,
  the default look of each block that has a look, and its layouts.
- **The Standard template:** today's stylesheet becomes the first template, its hard-coded sizes
  turned into the template's tokens. Release 1 renders every existing site byte for byte as today.
  The seven launch templates are later changes (`template-creative` and the others).
- **Sites record their template:** the site node gets a template ID and the template release it
  was last upgraded to (schema version 13). Version-12 documents upgrade to Standard, release 1.
- **Automatic template upgrades:** a template's releases are numbered. A newer release applies to
  every site using the template at its next preview, save or publish. A release that needs
  document changes ships an upgrade step, run like schema upgrades. Only each template's current
  release is kept in the code. A document recording a release newer than the code knows is
  invalid.
- **Layouts as data:** a layout is a named page recipe, an ordered list of blocks with their
  settings and starting texts, without styling. The shared layouts from `docs/layouts.md` (Home,
  Services, About, Team, Contact, FAQ, Careers) come with every template; a template can add its
  own.
- **"Add page" offers layouts:** the dialog asks for a title and a starting point, "Blank page"
  or one of the template's layouts, already filled from the collections. Once made, the page is
  the owner's and nothing links it back to the layout.
- **Hiding blocks:** every block gets a "Show on website" switch. A hidden block stays in the
  document and in the editor (dimmed, marked "Hidden") but isn't rendered, published or counted
  for media. The Website section lists the home page's sections with these switches, which is
  how "homepage sections on or off" works.
- **Template defaults in the editor:** a block inserted from the picker or a layout takes the
  template's default look. The canvas is styled by the site's template as well as its theme.
- **The template shown in the panel:** the Website section's Design card names the template.
  Choosing another is `template-switching`.
- **Fixture checks:** every template's current release is rendered against every fixture site in
  the tests (valid output, `html-validate`, the template's layouts producing valid pages).
  Lighthouse comes with `lighthouse-gate`.
- **A developer guide**, `docs/templates.md`: the contract, layouts, releases and upgrades, the
  fixture checks, and how to add a block.

Not in this change: choosing or switching templates (`template-switching`), the single-page
variant (it needs links to sections of a page), template-specific design presets, Lighthouse.

## Capabilities

### New Capabilities
- `templates`: the template contract, the registry, the Standard template, releases and
  automatic upgrades, layouts and creating a page from one, and the fixture checks.

### Modified Capabilities
- `site-document`: the site node records its template and release (schema version 13); every
  block has a hidden switch; a page whose blocks are all hidden is warned about; upgrading
  version-12 documents.
- `site-rendering`: the stylesheet comes from the site's template; hidden blocks aren't rendered;
  the `<h1>` rule and the media list consider shown blocks only.
- `site-editing`: adding a page from a layout; the "Show on website" switch and hidden blocks on
  the canvas; inserted blocks take the template's default look; the canvas uses the template's
  styles.
- `project-page`: the Website section names the template and lists the home page's sections with
  their switches.

## Impact

- **New package** `packages/templates` (`@webmio/templates`), depending on `@webmio/model` only;
  `@webmio/render` depends on it, and the boundary tests change to match.
- **`@webmio/model`:** `SiteNode` gains `template` and `template_release`; every block type gains
  `hidden`; schema version 13 with a migration; validation of the template fields, through a
  template lookup passed in, since the model can't import templates; a warning for pages that
  show nothing; the builder sets a template.
- **`@webmio/render`:** `siteCss` takes the template; `BASE_CSS` splits into the shared structure
  and the Standard template's tokens and styles; block rendering skips hidden blocks; the media
  list skips them.
- **Admin:** the Add page dialog with layouts (`apps/admin/src/lib/editor/pages.ts`,
  `PagesSidebar.svelte`); the switch in the block panel and dimmed hidden blocks on the canvas;
  the picker's default looks; the Website section's Design card and Home page sections card;
  Czech and English strings; stored documents upgraded on read (`upgrade-projects.ts`).
- **`load-site` and the example sites** keep rendering as now (Standard, release 1).
- **Docs:** `docs/templates.md` (new); `roadmap.md` and `layouts.md` updated when done.
