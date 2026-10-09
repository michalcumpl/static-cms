# Design

## Context

- **Making a project from a site already exists:** `loadSite` (`apps/admin/src/lib/server/load-site.ts`,
  `example-sites`) reads a folder (`project.json`, one document per language naming image
  files, the images), uploads the images with `uploadImage`, points the documents at the media
  keys, and creates the project, removing it again (`deleteProject` + `purgeProject`) when
  anything fails. It refuses documents with any validation error. Saving refuses only structural
  problems (site-storage, "Accepting saves").
- **Documents from data:** `siteBuilder` and `blockFactory` (`@webmio/model`) write documents from
  plain inputs, with an inline syntax for texts (`**bold**`, `*italic*`, `[words](url)`,
  `[words](page:slug)`) and `## `/`- ` text bodies. Layouts and `pageFromLayout` live in
  `@webmio/templates`.
- **Background work:** publishing runs in-process on a promise queue (`publishing/publish.ts`),
  records its state in the `publishes` table, and the Publish page polls it
  (`lib/publishing.svelte.ts`). There is no job runner.
- **Redirects:** `publishing/redirects.ts` derives redirects from the documents of earlier
  publishes; addresses on another site have nowhere to live yet.
- **Media:** `uploadImage` takes JPEG, PNG and WebP up to 20 MB and 40 MP; `sharp` is a
  dependency of the admin.
- **Creating a project:** `routes/w/[workspace]/new` takes a name and calls `createProject`.
- Decisions taken with the owner of the plan: the import starts from the New website page; plain
  HTML only (pages built by JavaScript are reported); the source's primary language only.

## Goals / Non-Goals

**Goals:**
- The mapping is pure and testable: HTML in, a site and a report out, no network.
- Fetching can't be pointed at our own network, whatever the source site does.
- One way to turn "documents plus image files" into a project, shared with `load-site`.
- Every rule in `import-mapping.md` marked v1 is covered by a fixture test.

**Non-Goals:**
- Sorting texts into services, team or testimonials (v2), other languages, headless rendering,
  documents, importing into an existing project, re-running an import to update a project.
- A general job system. One kind of job, in-process, like publishing.

## Decisions

### 1. Two halves: `@webmio/import` reads, the admin fetches

```
admin: safe fetch → crawl (pages, robots.txt, sitemap) → @webmio/import: readSite(pages)
     → ImportedSite { project, document, images: name → URL, origins, report }
     → admin: fetch images → createSiteProject(...) → review
```

- **`packages/import`** (`@webmio/import`, depends on `@webmio/model` and `@webmio/templates`):
  `readSite(pages, options)` takes the fetched pages (address, final address, HTML, the CSS of
  their stylesheets, structured data is read from the HTML) and returns the document, the image
  references, each page's old path, and the report. The job calls it twice: once for the image
  references, and again with the fetched images' file names, so the document names only images
  that arrived (reading 20 pages twice costs milliseconds). It also exports the pieces the crawler needs
  without building anything: `menuLinks(html, base)`, `sitemapLinks(xml)`, `robotsRules(text)`,
  `looksBuiltByScript(html)`. No Node APIs, so it is tested with strings.
- **The admin** (`apps/admin/src/lib/server/import/`): `safe-fetch.ts`, `crawl.ts`, `job.ts`,
  `images.ts`. It owns the network, the limits, the database and the media library.

*Alternative:* everything in the admin. Rejected: the mapping is most of the work and the part
that needs the most tests; it shouldn't need a database or a server to test.

### 2. Parsing with `cheerio` and `css-tree`

`cheerio` (parse5 underneath, spec-compliant on unquoted, minified HTML; CSS selectors) for HTML,
and `css-tree` for stylesheets (`background-image` URLs, colours, `font-family`, `@font-face`).
The import never uses patterns on HTML (`import-mapping.md`, "Fetching").

*Alternatives:* `linkedom` or `jsdom` (a whole DOM, heavier, nothing we need); `htmlparser2` with
`css-select` (lighter, but cheerio's API keeps the mapping code readable).

### 3. The document is written with the builder; texts are escaped

The mapping produces `BlockInput`s, `ServiceInput`-like collection inputs, `LinkInput`s and the
business and location inputs, and builds the document with `siteBuilder`, so IDs, empty values and
marks come out as for the example sites. Imported texts are converted from HTML to the builder's
inline syntax (`<strong>` → `**…**`, `<em>` → `*…*`, `<a>` → `[…](…)`, links to imported pages as
`page:slug`). The inline syntax gains a backslash escape (`\*`, `\[`, `\]`, `\\`) in
`block-nodes.ts`, so a literal asterisk or bracket in the owner's text survives; the builder's
existing inputs don't use backslashes, so nothing else changes.

*Alternative:* writing nodes directly. Rejected: it would duplicate the builder's ID, mark and
empty-value handling, and the example sites' documents are already proven valid.

### 4. Safe fetching on `node:http`/`node:https` with a checked `lookup`

`safeFetch(url, { kind: "page" | "image" | "text" })`:
- only `http:`/`https:`, ports 80/443 (or none);
- a custom `lookup` passed to `http.request` resolves every address of the host (`dns.lookup` with
  `all: true`) and fails unless all are public (not loopback, private, link-local, CGNAT,
  multicast, reserved, IPv4-mapped IPv6 of those, or the cloud metadata address); the socket
  connects to the checked address, so a second resolution can't swap it (DNS rebinding);
- IP-literal hosts get the same check;
- redirects followed by hand, at most 5, each hop checked again;
- `Accept-Encoding: gzip, br, deflate`, decoded with `zlib`, the limit counted on the decoded
  bytes (5 MB pages and texts, 20 MB images) so a compression bomb is cut off;
- a 15-second timeout per request (`AbortSignal.timeout`) and the job's 5-minute deadline;
- browser headers: a current desktop Chrome user agent, `Accept`, `Accept-Language: *`.

Tests pass an `allowHosts` option (a set of `127.0.0.1:<port>` origins) so the fixture server can
be fetched; it is a function parameter, never read from a request. The one exception is the
end-to-end tests, whose dev server can only learn the fixture sites' ports from the environment:
the New project action reads `E2E_IMPORT_ALLOW_HOSTS` only when `dev` (from `$app/environment`) is
true, so a production build never does.

*Alternative:* `fetch` (undici) with a dispatcher whose `connect` checks the address. Workable,
but `lookup` on `http.request` is the documented, smaller hook, and decompression limits are
easier with our own stream handling.

### 5. Crawling: home, menu, sitemap, robots.txt

1. `robots.txt` (a missing or unreadable one allows everything); rules for `*` only, longest
   match wins, `Allow` beats `Disallow` at equal length.
2. The home page. If `looksBuiltByScript` (under 200 characters of text and no images in the
   content area, and at least one `<script src>`), the import fails (spec, "Pages read").
3. Menu links in order, then `sitemap.xml` (and one level of sitemap index), same host or its
   `www.` twin, normalised (no fragment, no trailing `index.html`, a trailing slash added to
   extension-less paths for comparison only), HTML responses only, until 20 pages. A page whose
   `<html lang>` differs from the home page's is another language version: left out and
   reported. The menu is found in `<nav>`, a list in the header, or, failing those, plain links
   in the header or a menu container.
4. Each page's stylesheets (`<link rel=stylesheet>` and `<style>`), same limits, cached by URL.

Pages are fetched two at a time. Everything not fetched is recorded with its reason for the
report.

### 6. Mapping rules (`@webmio/import`)

- **Content area:** `<main>`, else `[role=main]`, else `<body>` without `header`, `nav`, `footer`,
  `aside`, `form`, `script`, `style`, `noscript`, `template`, `[hidden]`, `[aria-hidden=true]`.
  The header and footer are still read for the logo, contact details and social links.
- **Blocks:** a walk in document order collects runs. Text elements (`p`, `h1`–`h6`, `ul`, `ol`,
  `blockquote` as paragraphs) go into the current text block; an `h2`-level heading (the page's
  top level after `h1`) starts a new one. An image whose parent also holds text of 80+ characters
  becomes text with image (side from document order); three or more images with no text between
  them become a gallery; a run of three or more images each wrapped in a link, without other
  text, becomes logos; `iframe`s to YouTube or Vimeo become a videos block (`videoEmbed` from the
  model decides); `<details>` runs become FAQ items with a questions block. Questions only in
  FAQPage structured data become a questions block at the page's end, since structured data has
  no place on the page. `<embed>` and `<object>` showing an image are read as images.
- **Headings:** the page's heading levels are ranked; the first two distinct levels below `h1`
  become subheading levels 2 and 3, deeper ones level 3, so no level is skipped.
- **Home page:** a hero first (site name, description from `<meta name=description>`, the
  largest image in the top of the content area, which is then not repeated below).
- **Business:** JSON-LD `LocalBusiness` and subtypes (also inside `@graph`), then microdata;
  `tel:`/`mailto:`; `openingHoursSpecification` and `openingHours` strings; `sameAs` and social
  links through `socialKind`. Hidden emails: Cloudflare's `__cf_email__` and `[email protected]`
  text are reported, not decoded.
- **Site name and description:** JSON-LD name, else `og:site_name`, else the home `<title>` cut
  at ` | `, ` – `, ` - `; `meta description` of the home page.
- **Page title and slug:** see the spec; the home page from the Home layout's name.
- **Language:** `<html lang>`'s primary subtag when `isLanguageCode`, else the caller's fallback
  (the owner's interface language). `hreflang` alternates and links in elements whose class or
  ID mentions `lang` are reported as languages not imported.
- **Theme:** colours from `css-tree` declarations, weighted: `body`/`html` `background` and
  `color` for background and text, `a`, `button`, `.btn`-like selectors for the primary, the most
  frequent other saturated colour as the secondary. Fonts: `font-family` of `body` and `h1`–`h3`;
  a family the catalogue has by name is used, otherwise the generic family decides (serif →
  `source-serif`, sans → `source-sans`; system font stacks become `system-sans` or `georgia`). Contrast: the
  primary and text are darkened (or lightened on a dark background) in HSL lightness steps until
  `contrastRatio` passes `MIN_CONTRAST` for every pair of `CONTRAST_PAIRS`; the first preset fills
  the rest.

### 7. Images

`readSite` returns references (page, place, candidate URLs best first, alt). The admin fetches
each, best candidate first: the largest `srcset` entry up to 1600 w; WordPress-style size suffixes
(`-532x328.jpg`) are tried without the suffix first; `?w=`/`?width=` parameters set to 1600.
Bytes are de-duplicated by SHA-256, so one upload per distinct image. An SVG is only accepted for
the logo and favicon, rasterised by `sharp` at 512 px wide (the SVG is checked for size, 1 MB,
and rendered with external resources off, which is librsvg's default). Other formats are left
out. Each kept image goes into the folder-like site under a generated file name, then through
`uploadImage` like `load-site`'s.

### 8. One way to make a project from documents and files

`loadSite`'s body splits into:
- `readFolder` (stays): files to `{ project, docs, files }`;
- `createSiteProject(db, workspaceId, userId, site, { allowSiteProblems })` (new, shared): checks
  the documents (structural problems always refuse; site-rule errors refuse unless
  `allowSiteProblems`), creates the project, uploads the files, rewrites image sources, stores the
  first version and languages, and removes everything on failure.

`load-site` calls it with `allowSiteProblems: false` (unchanged behaviour); the import with
`true`, since images without descriptions are the owner's to fix.

### 9. The job: an `imports` table and an in-process queue

```
imports: id, workspace_id, user_id, address, state (running | done | failed),
         progress (JSON: phase, done, total), error (said message), project_id,
         report (JSON), review_dismissed (bool), started_at, finished_at
page_origins: project_id, lang, page_id, path        -- primary key (project_id, lang, page_id)
```

`startImport` inserts a running row and queues the run (one import at a time on the server, like
publishing's queue; one running per user is checked on start). The run updates `progress` as it
goes, ends `done` with the project and report or `failed` with a message. On first use of the
database (`getDb`), imports still `running` become `failed` ("The import was interrupted").

`GET /api/imports/[id]` returns the row for its owner; the progress page
(`routes/w/[workspace]/imports/[id]`) polls it every second and goes to the review when done.

*Alternative:* old addresses in the document (`page.former_paths`). Rejected: the owner never edits
them, every language copy and duplicate would have to decide whether to keep them, and they would
travel into version history and translations. A table keyed by page ID drops a page's addresses
with the page, as the spec asks.

### 10. Redirects

`redirectsFrom` takes the project's `page_origins` for the language besides the earlier
documents: each origin whose page still exists in the current document and whose path isn't
already a page address or the page's own becomes a redirect. Paths with a query are skipped
(Netlify `_redirects` matches queries differently, and those addresses are rarely shared).

### 11. The review

`routes/p/[project]/(panel)/import` reads the project's `imports` row (report) and the saved
site's problems (the Overview's `problems.ts` code, so each leads to its field). "Dismiss" sets
`review_dismissed`; the Overview's load includes whether an undismissed review exists.

### 12. Tests on invented sites

`packages/import/fixtures/` holds small invented websites (a Czech bakery: JSON-LD, lazy images,
an SVG logo, a grouped menu, `<details>`, a form, a hidden email, a YouTube embed; a one-page
English studio; a script-built page). `@webmio/import` tests read them as strings. The admin tests
serve them from a local HTTP server (with `robots.txt`, `sitemap.xml`, redirects, a slow and an
oversized response) and run the whole job against it with `allowHosts`. The example sites are run
by hand with the admin command, as the roadmap says; their content stays out of the repository.

## Risks / Trade-offs

- [SSRF through redirects, DNS rebinding or IPv6 forms] → every connection's address is checked in
  `lookup`, the socket uses that address, redirects are followed by hand; tests cover each form.
- [Decompression bombs and huge pages] → limits counted after decoding; requests abandoned at the
  limit.
- [Rendering untrusted SVG] → only for the logo and favicon, size-capped, rendered by `sharp`
  without external resources.
- [Heuristics misread a site] → the owner reviews everything before publishing; the report says
  what was left out; v2 brings AI for the hard cases. Fixtures pin each rule.
- [Load on the source site] → two requests at a time, at most ~150 requests in all.
- [Content the owner may not use] → the confirmation, and the design is never copied.
- [A long import blocks other imports] → one at a time is enough for the beta; the 5-minute
  deadline bounds it.
- [Images without descriptions make the draft invalid] → intended: they are the review's first
  problems, each leading to the image.

## Migration Plan

1. A Drizzle migration adds `imports` and `page_origins`; no existing data changes.
2. Rollback: older code ignores both tables; imported projects stay ordinary projects (their
   old-site redirects stop until the code returns).
