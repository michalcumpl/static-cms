# Proposal

## Why

Most of our first customers already have a website, and retyping it into Webmio is the step
that loses them. The strategy decided on "Start from your current website" (2026-10-07), and
migrating the seven example sites by hand gave us the rules (`docs/import-mapping.md`). Version 1
automates those rules without AI: the owner gives an address and gets a draft site to review,
built from their own texts and photos, never the old design.

## What Changes

- **A second way to create a website.** The "New website" page offers "Start empty" (today's
  starter site) or "Start from your current website": a public address and a confirmation that
  the owner may use its content. The guided setup will offer the same import later.
- **The import runs as a background job** with progress shown to the owner ("Reading pages…
  12 of 20"), and makes a new project when it finishes. Starting it again for the same address is
  allowed; each run makes its own project. A failed import leaves no project behind.
- **Safe fetching.** Only `http`/`https` on the standard ports, never internal or private
  addresses (checked on every connection, redirects included), the same site only, `robots.txt`
  followed, at most 20 pages and 100 images, size limits and timeouts. Pages are read as plain
  HTML; a page that needs JavaScript to show its content is reported, not rendered.
- **What is imported** (the v1 rules of `import-mapping.md`):
  - pages and the menu from the site's navigation, then `sitemap.xml`, with each page's address
    on the old site;
  - texts as text blocks (paragraphs, level 2 and 3 subheadings, lists), photos beside text as
    text with image, photo grids as galleries, rows of logos as a logos block, YouTube and Vimeo
    embeds as a videos block, `<details>` and FAQPage data as questions;
  - business details from schema.org data, `tel:` and `mailto:` links and social profile links;
  - images into the media library, de-duplicated, with their alt texts; the logo and favicon,
    an SVG logo turned into PNG;
  - a guessed design: the nearest catalogue fonts and the site's main colours, adjusted until the
    contrast checks pass;
  - the home page opening with a hero (the site's name, description and main photo), as the Home
    layout does; the site uses the Standard template.
- **The import review.** When the import finishes, the owner sees what was imported (pages,
  images, questions, business details, with counts), what was left out and why (forms, other
  embeds, hidden emails, images that failed, pages that need JavaScript, pages over the limit),
  and the site's validation problems, each leading to its field. The Overview links to the review
  until the owner dismisses it. Nothing is published by the import.
- **Redirects from the old site.** Each imported page's address on the old site redirects to
  the page's new address when the site is published on the old domain, for as long as the page
  exists.
- **An admin command**, `pnpm admin import-site <workspace> <address>`, for running the import
  against the example sites locally.

Not in this change: AI sorting of texts into services, team, testimonials and figures (`site-import`
version 2), importing the other languages of a multilingual site (the review names them),
rendering JavaScript-built sites with a headless browser, documents (PDF links stay links).

## Capabilities

### New Capabilities
- `site-import`: starting an import, safe fetching and its limits, what is read from the source
  site and how it becomes a site document, the business details and images, the guessed design,
  the job's progress and failure, the import review, and the admin command.

### Modified Capabilities
- `accounts`: "Projects": a new project starts from the starter site or from an import.
- `publishing`: "Redirects from earlier addresses": imported pages' addresses on the old site
  redirect too.
- `project-page`: "Overview": a link to the import review until it is dismissed.

## Impact

- **New package** `packages/import` (`@webmio/import`), depending on `@webmio/model` and
  `@webmio/templates`: reading fetched pages into a site (HTML and CSS parsing, the mapping
  rules, the guessed theme). Pure: it gets the pages and image bytes from its caller. New
  dependencies: an HTML parser and a CSS parser.
- **Admin server:** safe fetching (DNS checks, limits), the import job and its progress, image
  download and upload through `uploadImage` (SVG to PNG with `sharp`), project creation sharing
  `load-site`'s checks, a table for import jobs and one for imported pages' old addresses, the
  redirects in `publishing/redirects.ts`, the `import-site` admin command.
- **Admin UI:** the New website page (`routes/w/[workspace]/new`), a progress page, the review
  page, the Overview link; Czech and English strings.
- **Docs:** `import-mapping.md` marks what v1 does; `roadmap.md` when done.
