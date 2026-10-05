# @webmio/render

Turns a site document from [`@webmio/model`](../model/) into HTML: one page per page of the
site, the not-found page, the stylesheet, metadata and structured data, and the business
details' markup (shared with the editor's canvas, so both show the same). Pure TypeScript with no
filesystem access; it depends only on `@webmio/model`.

```ts
import { renderSite } from "@webmio/render";

// HTML per page plus the stylesheet. Validates first.
const rendered = renderSite(doc, { basePath: "/preview/", siteUrl: "https://pekarna.cz" });
if (rendered.ok) {
  for (const page of rendered.site.pages) console.log(page.path, page.url);
}
```

- **Results, not exceptions.** An invalid document gives `{ ok: false, problems }`; warnings
  are passed along when rendering succeeds.
- **Base path.** `basePath` (default `/`) prefixes every internal URL, for sites served from a
  subdirectory or a preview route. It must start and end with `/`.
- **Deterministic.** The same document renders byte-identical HTML. The snapshot tests in
  `src/__snapshots__/` pin the demo site's output.
- **Text the renderer writes itself** (the not-found page, day names, labels) comes from
  `siteStrings(lang)` in the site's language.
