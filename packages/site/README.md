# @static-cms/site

The site model and the build from that model to a static website. It is pure TypeScript with no
Svelte, Svedit, or filesystem dependencies, so the same code runs in Node (server, scripts, tests)
and in the browser.

```
site document --validateSite--> problems
      |
      +--------renderSite------> HTML per page + stylesheet
      |
      +--------exportSite------> file tree --zipFiles--> website.zip
```

## The site document

A whole website is one [Svedit](https://github.com/michael/svedit) document: a `document_id`
naming the root `site` node, and a flat `nodes` map. `siteSchema` is the schema in Svedit's
format, so the editor can pass it to Svedit unchanged. The TypeScript types (`SiteDocument`,
`SiteNode`, `PageNode`, …) describe the same shape.

- `site`: name, language, optional base URL, logo, theme, navigation, and pages (the first is the home page).
- `page`: title, slug (empty for the home page), SEO description, and blocks.
- Blocks: `hero` (first block only), `rich_text` (paragraphs, subheadings, bullet lists), `services`.
- Links to pages use the page's node ID (`page_link`, `internal_link`), so they survive slug changes.
- Text values are `{ content, marks, annotations }`. Mark offsets count grapheme clusters, as in Svedit.

`fixtures/demo-site.json` is a complete two-page example, and `fixtures/media/` holds its image.
Both are exported as `@static-cms/site/fixtures/*`.

## API

```ts
import { exportSite, renderSite, validateSite, zipFiles } from "@static-cms/site";

// 1. Validate: every problem at once, each with a code, message and node ID.
const validation = validateSite(doc);
if (!validation.valid) console.error(validation.problems);

// 2. Render: HTML per page plus the stylesheet. Validates first.
const rendered = renderSite(doc, { basePath: "/preview/" });
if (rendered.ok) {
  for (const page of rendered.site.pages) console.log(page.path, page.url);
}

// 3. Export: the static file tree. `media` maps each image's `src` to its bytes.
const media = new Map<string, Uint8Array>([["hero.png", heroBytes]]);
const exported = exportSite(doc, media);
if (exported.ok) {
  const zip: Uint8Array = zipFiles(exported.files); // website.zip
}
```

- **Results, not exceptions.** Invalid documents are expected input. `renderSite` and
  `exportSite` return `{ ok: false, problems }` instead of throwing, and pass warnings along
  when they succeed.
- **Base path.** `basePath` (default `/`) prefixes every internal URL, for sites served
  from a subdirectory or a preview route. It must start and end with `/`.
- **Media.** The caller supplies image bytes; the package never touches the filesystem.
  Export includes only images the site uses and fails with `missing-media` if one is missing.
- **Fonts.** A theme's fonts are IDs from `FONTS` (eight open-licence webfonts and two system
  fonts), not CSS lists. The package knows the catalog but holds no font files: `usedFontFiles(doc)`
  names the WOFF2 files and licences a site needs, and the caller passes their bytes as
  `exportSite(doc, media, { fonts })`. They come from the `@fontsource-variable/*` packages
  (`fontPackagePath(name)`); export places them under `assets/fonts/` and fails with
  `missing-media` if one is missing. System fonts need none.
- **Output.** `index.html`, `<slug>/index.html`, `assets/style.css`, `assets/images/<src>`,
  and `sitemap.xml` when the site has a base URL. Rendering and ZIP output are byte-identical
  for the same input.

## Demo build

```sh
pnpm build-demo
```

This builds the package and exports the demo fixture to `packages/site/out/website.zip`
(git-ignored). Unzip it and serve the folder with any static server to see the site.
The script is `scripts/build-demo.ts`, and it runs on the built package through Node's
built-in TypeScript type stripping.
