# Proposal

## Why

The import review (`site-import`) tells the owner what was left out and what to fix, but fixing
it is all manual. Running the import on the seven examples showed what owners will hit most:
pages and images that failed for passing reasons (a timeout, an error page), sites with more
pages than the first 20, and a list of images without descriptions that blocks publishing. The
review should let the owner act on these where they read them.

## What Changes

- **Retry what was left out.** The review offers "Try again":
  - for pages that didn't answer, and images that couldn't be imported: fetched again, added to
    the project when they arrive;
  - for pages over the limit: "Import the next pages", the next batch of up to 20 from the
    site's menu and sitemap, as often as there are more.

  A retry runs as a background job with progress, like the import, and updates the review: what
  arrived leaves the "left out" list, what failed again stays with its new reason. Things a retry
  can't change (forms, embeds, pages `robots.txt` disallows or that are built by a script, other
  languages) offer no retry.
- **Retries respect the owner's edits.** A page the owner hasn't changed since the import is read
  again with the images that arrived, so they land where they were. A page the owner has changed
  isn't touched: its new images go into the media library, and the review says so. New pages are
  added at the end of the page list, and to the menu when the old site's menu linked them.
- **Mark images decorative.** "Before you publish" offers "Mark these images as decorative" for
  the imported images still without a description, saved as one new version; the owner can still
  describe each image instead, and the review says what decorative means for visitors who use a
  screen reader.

Not in this change: describing images automatically (AI), importing other language versions,
retrying anything after the review has been dismissed.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `site-import`: "Import review" gains the retry and decorative actions; new requirements for
  retrying (what can be retried, the job, merging with the owner's edits) and for marking images
  decorative.

## Impact

- **Admin server:** a retry job next to the import job (`lib/server/import/`), reusing the crawl,
  image fetching and `readSite`; merging into the project's saved documents; the import's state
  extended (what was left out, which pages were imported and from which version) so a retry knows
  what to try; actions on the review page.
- **`@webmio/import`:** reading only the pages a retry names, with the slugs the project already
  uses taken.
- **Admin UI:** retry buttons and progress on the review, the decorative action, Czech and English
  strings.
- **Docs:** `import-mapping.md` (the review's actions), `roadmap.md` when done.
