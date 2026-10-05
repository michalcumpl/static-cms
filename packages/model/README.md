# @webmio/model

The site document and everything that only needs the document: the schema and types, validation,
the upgrades between document formats (`migrateSite`), the collections, the languages' shared
fields and page translation, and the catalogues of fonts, themes and image variants that
rendering and export rely on. Pure TypeScript with no filesystem access, so the same code runs in
Node and in the browser.

Its siblings build on it: [`@webmio/render`](../render/) turns a document into HTML, and
[`@webmio/export`](../export/) into a static website. Imports go one way only (model ← render ←
export), which a test in each package checks.

## The site document

A whole website is one [Svedit](https://github.com/michael/svedit) document: a `document_id`
naming the root `site` node, and a flat `nodes` map. `siteSchema` is the schema in Svedit's
format, so the editor can pass it to Svedit unchanged. The TypeScript types (`SiteDocument`,
`SiteNode`, `PageNode`, …) describe the same shape.

- `site`: name, language, optional base URL, description, favicon, share image, logo, theme,
  navigation, business details, the collections, the pages, and the ID of the home page.
- `page`: title, slug, SEO description, share image, translation key, and blocks.
- Blocks: `hero` (first block only), `rich_text`, `text_with_image`, `gallery`, `logos`,
  `contact`, `opening_hours`, `call_to_action`, and the collection blocks `services`, `team`,
  `testimonials` and `faq`.
- **Collections** (format 7): the site holds its `services`, `team`, `testimonials` and `faqs`
  once. A collection block holds no items: it shows its whole collection (`show: "all"`) or the
  items its `item_ref` nodes name (`show: "chosen"`), in their order. `blockItems(doc, block)`
  returns what a block shows; the renderer, validation and the editor all use it.
- `business`: contact details, opening hours and social profiles (`social_link` nodes;
  `socialKind(url)` names the network).
- Links to pages use the page's node ID (`page_link`, `internal_link`), so they survive slug changes.
- Text values are `{ content, marks, annotations }`. Mark offsets count grapheme clusters, as in Svedit.

`fixtures/demo-site.json` is a complete two-page example, and `fixtures/media/` holds its image.
Both are exported as `@webmio/model/fixtures/*`; `@webmio/model/testing` (Node only, for tests)
loads them.

## API

```ts
import { migrateSite, validateSite } from "@webmio/model";

const doc = migrateSite(stored); // any older format, upgraded to the current one
const validation = validateSite(doc); // every problem at once, each with a code and node ID
if (!validation.valid) console.error(validation.problems);
```

- **Results, not exceptions.** Invalid documents are expected input: `validateSite` reports
  problems, and `migrateSite` returns anything it doesn't recognise unchanged.
- **Fonts.** A theme's fonts are IDs from `FONTS`. The package knows the catalogue but holds no
  font files; `usedFontFiles(doc)` names the files a site needs (see `@webmio/export`).
