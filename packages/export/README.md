# @webmio/export

Turns a site document from [`@webmio/model`](../model/) into a static website: the file tree
of pages (rendered by [`@webmio/render`](../render/)), stylesheet, images, fonts, icons,
`sitemap.xml`, `robots.txt` and redirects, for one language or several, and its ZIP. Pure
TypeScript with no filesystem access: the caller passes media and font bytes in.

```ts
import { exportSite, zipFiles } from "@webmio/export";

// `media` maps each image's `src` to its bytes.
const exported = exportSite(doc, media, { siteUrl: "https://pekarna.cz" });
if (exported.ok) {
  const zip: Uint8Array = zipFiles(exported.files); // website.zip
}
```

- **Results, not exceptions.** An invalid document gives `{ ok: false, problems }`.
- **Media.** Export includes only images the site uses and fails with `missing-media` if one is
  missing.
- **Fonts.** `usedFontFiles(doc)` (from `@webmio/model`) names the WOFF2 files and licences a
  site needs; pass their bytes as `exportSite(doc, media, { fonts })`. They come from the
  `@fontsource-variable/*` packages and land under `assets/fonts/`.
- **Several languages.** `exportSiteLanguages` puts the primary language at `/` and the others
  at `/<lang>/`, with one sitemap.
- **Reproducible.** The same input gives byte-identical files and ZIP.

## Demo build

`pnpm build-demo` (from the repository root) exports the demo site from
`@webmio/model/fixtures` into `packages/export/out/website.zip`.
