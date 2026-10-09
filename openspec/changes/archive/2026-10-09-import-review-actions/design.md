# Design

## Context

- **The import** (`site-import`, archived 2026-10-09): `crawl` → `readSite` (twice: image
  references, then with fetched files) → `fetchImages` → `createSiteProject`; the `imports` row
  holds the report (`ImportReport`: pages, counts, `leftOut` with a reason, a page path and a
  detail) and `page_origins` each page's old path.
- **What a retry would need but isn't kept:** a failed image's candidates and the page that
  showed it (the report keeps only its first address), the URLs over the page limit (the crawl
  keeps only their count), the media keys of the images that did arrive (to read a page again),
  and the version the import saved (to tell whether the owner changed a page since).
- **Saving:** `saveSite(db, projectId, userId, doc, baseVersion, lang)` refuses a stale base
  version (site-storage, "Conflict detection"); version history keeps every saved version.
- **Images** go into the library through `uploadImage`; `MAX_IMAGES` (100) and `MAX_PAGES` (20)
  limit the import.

## Goals / Non-Goals

**Goals:**
- A retry is the import's own machinery on fewer addresses, not a second importer.
- Nothing the owner made is overwritten; when in doubt, add to the library and say so.
- Every action is one saved version, undoable from version history.

**Non-Goals:**
- Retrying for other languages, or after the review is dismissed.
- Re-reading pages the owner has edited, or merging the owner's edits with a fresh read.
- Describing images automatically.

## Decisions

### 1. The import keeps what a retry needs: `imports.retry_state`

A JSON column written when the import ends (and rewritten by each retry):

```ts
interface RetryState {
  /** The primary language's version the import (or the last retry) saved. */
  versionId: string;
  /** Pages that didn't answer: their addresses, in the import's order. */
  unreachable: string[];
  /** Pages over the limit, in the order the crawl would have read them. */
  queue: string[];
  /** Images that failed: their reference, with every candidate and the pages showing them. */
  failedImages: ImageReference[];
  /** Images that arrived: reference ID → media key, for reading a page again. */
  media: Record<string, string>;
  /** Each imported page: its address on the old site and its page ID. */
  pages: { url: string; pageId: string; menu: boolean }[];
}
```

`crawl` returns the remaining queue (not only its count) and which pages the menu linked;
`ImageReference` gains `pages` (the old paths of the pages showing it), filled by the collector.
Imports made before this change have no `retry_state`, and their review offers no retry.

*Alternative:* re-deriving everything by crawling the site again on retry. Rejected: the site may
have changed, and the whole point is to fetch only what failed.

### 2. A retry is a row in `import_retries`, run on the import queue

```
import_retries: id, import_id, user_id, kind ("again" | "next"), state (running | done | failed),
                progress (JSON), error, added (JSON: pages, images placed, images to the library),
                started_at, finished_at
```

`startRetry(db, projectId, userId, kind)` refuses while the project's import or another retry runs
(spec), or when there is nothing to retry, then queues the run on the same in-process queue as
imports (`job.ts`), so retries and imports never run at once on the server. Interrupted retries are
failed at start-up with the imports.

### 3. The run: fetch, read, merge, save once

1. **Fetch.** `kind: "again"`: the unreachable pages and the failed images' candidates.
   `kind: "next"`: the first 20 of `queue` (the rest stays queued), then those pages' images.
   Each through `safeFetch`, the crawl's page checks (HTML, language, script-built) and
   `fetchImages`.
2. **Read.** `@webmio/import` gets `readPagesForRetry(pages, { lang, takenSlugs, images, baseUrl,
   knownPages })`: like `readSite`, but it returns, per page, its page node and block subtree
   (with IDs from a caller-given generator, prefixed so they can't collide), the questions to add
   to the FAQ collection, and the report entries; no site, theme or business. `knownPages` maps the
   project's imported old addresses to their slugs, so links between old and new pages work.
3. **Merge**, on the saved primary document:
   - new pages: appended to `pages`, a `page_origins` row each, and a menu link at the end when
     the old menu linked them;
   - arrived images for a page that is unchanged since `retry_state.versionId` (its subtree, by
     canonical JSON without IDs, equals the one in that version): the page's blocks are replaced by
     a fresh read of the same page with all images known (`media` plus the new ones), so the
     images land where the old site had them;
   - arrived images for a changed page: uploaded only; `added.library` lists them.
4. **Save** one version with `saveSite`, based on the version read in step 3; a conflict fails the
   retry with "The site was saved while retrying; try again", and the uploads stay in the library
   (harmless, and the library's cleanup removes unreferenced removed images only).
5. **Report.** The import's report: tried items removed from `leftOut`, the retry's own entries
   added, pages and counts updated; `retry_state` rewritten (new `versionId`, fewer failures,
   shorter queue).

*Alternative for images on unchanged pages:* keeping image-less placeholders in the document at
import time and filling them on retry. Rejected: placeholders are validation errors the owner
would see as problems, and the import is already archived without them.

### 4. Marking images decorative

`markImportedImagesDecorative(db, projectId, userId)`: the image node IDs in the import's version
(`retry_state.versionId` of the first import, kept as `importVersionId`) are the imported images;
in the saved document, each of those still present with an empty description and not decorative
becomes decorative. One `saveSite`. Images added later have IDs the import's version doesn't have,
so they are never touched. The action is a form action on the review page.

### 5. The review page

- "Try again" next to "What was left out" when `unreachable` or `failedImages` is not empty; "Import
  the next pages (N left)" when `queue` is not empty; neither once dismissed.
- While a retry runs, the review shows its progress, polled from `GET
  /api/projects/[project]/import-retry` every second, and reloads its data when it ends; the result
  ("Added 3 pages and 5 images; 2 images went to your library") stays above the lists.
- "Mark these images as decorative (N)" in "Before you publish", with the screen-reader sentence,
  when N > 0.

## Risks / Trade-offs

- [A page counted unchanged that the owner meant to keep as it is] → a page only counts unchanged
  when its whole subtree is identical, which means the owner did nothing to it; re-reading it only
  adds what the import missed.
- [Retries hammer a failing site] → one retry at a time per project, the import's limits and
  deadline, and nothing runs without the owner choosing it.
- [Decorative hides content from screen readers] → the action says so, counts the images, and
  each problem still leads to describing that image; version history can undo it.
- [Old imports without `retry_state`] → no retry offered; decorative still works, using the
  project's first version as the import's version.

## Migration Plan

A Drizzle migration adds `imports.retry_state`, `imports.import_version_id` and the
`import_retries` table. Existing imports keep working without retry. Rollback: older code ignores
the new column and table.

## Implementation notes

Where the implementation went beyond or differs from the decisions above:

- `RetryState` also keeps `homeLang` (pages in another language aren't imported, as in the crawl)
  and `importedImages`: the image node IDs retries placed, so marking decorative covers them too
  (decision 4 only knew the import's version). The menu is a list of addresses (`menu`) rather
  than a flag per page, since the queue's pages need it as well.
- `readPagesForRetry` takes each page optionally with `existing: { pageId, slug, title }`, which
  reads a page the document has again under its own ID; `knownPages` maps old addresses to
  `{ pageId, slug }`.
- The pages' HTML isn't stored, so an unchanged page showing an arrived image is fetched again
  from the old site; if it doesn't answer, its images go to the library.
- A page read again keeps the FAQ items the collection already has (matched by question text)
  instead of adding them twice.
- An arrived logo or favicon is placed only while the site still has none.
- A retry that places nothing and adds no page saves no version ("Still failing": the project is
  unchanged); the report and `retry_state` are still updated.
- The retry merges into the document read when it starts and saves on that version, so any save
  by the owner during the retry makes it fail ("The website was saved while retrying").
- Pages that answered with an error (a 404 included) count as unreachable and are retried by
  "Try again", as the report already says "the page didn't answer (404)".
- `crawl.ts` exposes `fetchPage`, `withStyles` and `siteRobots`, shared by the crawl and the retry;
  the fixture server can make paths fail or answer (`/__fixture/…`) for the end-to-end tests, and
  serves a generated 51-page site for the page limit.
- Fixing subheading levels (added during implementation, at the owner's request): the cause was
  the import dropping a gallery or logo row whose images all failed, heading included, which left
  the `###` subheadings after it without a main one. The import now keeps such a heading as a `##`
  text block; `fixHeadingLevels` fixes existing pages (and the owner's own edits) by promoting the
  first subheading validation flags on a page, validating again until none is left. It applies to
  every page, not only imported ones: promoting a heading loses nothing.
- Found importing marespartners.cz while testing: a logo drawn as a CSS background of the logo
  element, and a photo filling a panel beside the text (`background-size: cover`), were missed.
  `readSite` now takes them (the last matching rule for the logo; the first cover-sized background
  shown on the home page as the hero's photo when the content has none). CSS addresses are still
  resolved against the page, not the stylesheet; right for stylesheets at the site's root.
- Also from marespartners.cz: its theme came out olive because the theme guess fell back to the
  most frequent saturated colour anywhere, and got every page's copy of the same stylesheet. It now
  reads each stylesheet once, takes a fallback colour only when it repeats and isn't a pale tint,
  and otherwise uses the text colour (a black-and-white site stays one). Without a meta
  description, the home page's first paragraph of 40 characters or more, cut to about 160 at a
  word, describes the site; the hero's text stays the meta description only, so the paragraph
  isn't shown twice.
- "Before you publish" groups problems by code (`groupProblems` in `lib/panel/problems.ts`): pages
  without a description are one item leading to the site's description field; other groups open
  to list each problem. The Overview's own problem list is unchanged.
