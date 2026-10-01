# Proposal

## Why

Sites can now be published, but they go online without the basics a live site needs:
- no favicon;
- a bare link when shared in WhatsApp, Facebook or Messenger;
- no `robots.txt`, and no way to choose whether AI systems may train on the site;
- Netlify's generic "not found" page;
- no structured data telling search engines and AI answers what the site is.

The site's name can't be changed after the project is created. A page without SEO text has no description at all.

## What Changes

- **Site settings.** A new panel in the editor edits the site as a whole. All changes are undoable edits of the document, like page settings:
  - the site name;
  - a site description, which pages without their own SEO text fall back to;
  - a favicon, chosen from the media library;
  - a default share image;
  - two switches for AI crawlers: **AI search and answers** and **AI training**.
- **Page settings** gain an optional share image.
- **Share previews.** Every page gets Open Graph and Twitter card tags:
  - title, description and site name;
  - when the site's address is known, the page's absolute URL and the share image (the page's own, else the site default) as a 1200×630 JPEG.
- **Favicon.** When the site has one, export writes `favicon.ico`, `apple-touch-icon.png` and `icon-512.png`, with the whole chosen image fitted into a square, and every page links to them.
- **`robots.txt`.** Always exported. It allows everything by default, disallows the AI crawlers of each switched-off category by their user agents, and names the sitemap when the address is known.
- **Structured data.** The home page carries JSON-LD `WebSite` and `Organization` (name, URL, and the favicon as logo) when the site's address is known.
- **404 page.** Export writes `404.html` with the site's header and footer, a short "page not found" message in the site's language, and a link to the home page. Netlify serves it automatically.
- **Description warning.** A page with no description of its own, while the site has none either, is reported as a warning.
- **Document format 3.** It adds the new site and page fields. Stored format-1 and format-2 documents are upgraded when read.
- **Media.** The server derives the favicon's PNG icons and the share-image JPEG from an image's original on demand and keeps them for reuse. Preview, export and publishing supply them like the WebP variants.

### Non-goals (this change)

- `LocalBusiness` structured data (address, opening hours, phone): it comes with the contact and opening-hours blocks, from the same data they show.
- `llms.txt`.
- Hiding a page from search engines (noindex per page).
- Cropping or a focal point: share images are cut from the centre, and favicons fit the whole image.
- An editable 404 page.
- SVG favicons.

## Capabilities

### New Capabilities

None. The behaviour extends the existing document, rendering, export, editing and media capabilities.

### Modified Capabilities

- `site-document`:
  - the site node gains a description, favicon, default share image and the AI crawler switches, and pages gain a share image (schema version 3);
  - upgrading to version 3;
  - favicon images need no description;
  - the missing-description warning.
- `site-rendering`:
  - page `<head>` metadata: the description fallback, Open Graph and Twitter tags, favicon links and JSON-LD;
  - the 404 page;
  - the media files a document uses now include icon and share files.
- `site-export`:
  - `favicon.ico`, the icons, share images, `robots.txt` and `404.html` in the file tree;
  - the media files the caller supplies.
- `site-editing`:
  - the site settings panel;
  - the share image in the page settings panel.
- `media`: icon and share-image files derived from an image, served in the preview and kept by cleanup like variants.

## Impact

- **`packages/site`:**
  - schema and types, and the version-3 migration;
  - validation: the favicon, share images and the description warning;
  - `renderPage` head metadata and a not-found page renderer;
  - a list of used media files replaces the image-file list;
  - export: `robots.txt`, icons, `favicon.ico` (a small ICO writer wrapping the 32-pixel PNG), share images and `404.html`;
  - the list of AI crawler user agents;
  - tests and snapshots.
- **`apps/admin`:**
  - `media.ts`: derived icon and share files made with sharp from the original (or the largest variant for images from before the library);
  - preview route, ZIP download and publishing supply them;
  - cleanup;
  - editor: a new `SiteSettings` panel, a share image in `PageSettings`, and editor operations for the new fields;
  - new pages and the demo site carry the new fields;
  - unit and e2e tests.
- No new dependencies: sharp is already used.
- Docs: roadmap (Milestone 3: SEO settings, favicon, site metadata) and the README's publishing notes on `robots.txt`.
