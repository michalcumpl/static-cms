# Proposal

## Why

A full-width photo band with a heading, a sentence and a button is how many sites break up a
long page ("Last minute", "Book your stay", "Visit our showroom"). Today only the hero looks
like this, and the hero must be the first block. So owners can't place one further down. The
import also turns such mid-page bands into a text block plus a one-photo gallery
(vroomagazine's bands between card grids). The roadmap lists `banner-block` as the rest of
phase 3.

## What Changes

- A new `banner` page block holds:
  - a heading (one line);
  - a short text (bold and italic, one line);
  - one photo, with its own focal point;
  - at most one button.

  It can go anywhere on a page, as many times as wanted, and it can be hidden like every block.
  Validation requires a heading, and at most one photo and one button.
- **Rendering:** there is one look. The photo fills a full-width band, and the heading, text and
  button sit in a dark panel over it, the same panel as the full-photo hero. A banner without a
  photo shows as a band in the site's primary colour. The heading is an `<h2>`, and it counts as
  a main subheading for the page's heading levels. The photo is lazy-loaded with `sizes="100vw"`.
- **Editor:**
  - The block picker gets a "Banner" card and drawing.
  - On the canvas, the heading and text are edited in place, and the photo uses the hero's
    image slot (add, replace, remove, focal point).
  - The button panel handles the banner's one button as it does the hero's.
- **Import:** an element with a background photo, a heading, at most two short paragraphs and
  no other images becomes a banner. Its first link becomes the button. On the home page, the
  panel the hero already takes stays the hero.

No document version step is needed: a new block type adds no field to existing nodes, as with
`jobs` and `contact_form`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: a `banner` block, with its fields and validation.
- `site-rendering`: banner rendering (the photo band, the colour band without a photo, the
  `<h2>`).
- `site-editing`:
  - the banner in the picker and on the canvas;
  - the button panel also serves banners (MODIFIED "Button panel").
- `site-import`: mid-page photo bands become banners (MODIFIED "Page content").

## Impact

- `packages/model`:
  - the schema (`banner` node, page blocks) and types;
  - validation: required heading, at most one photo and button, the heading counting as a main
    subheading;
  - `block-nodes`/`builder` (`blocks.banner`).
- `packages/render`: `renderBanner`, banner CSS (sharing the hero cover's panel), image sizes,
  and the pinned stylesheet fixtures.
- `apps/admin`:
  - the picker list, illustration, inserter and strings;
  - the `Banner.svelte` canvas component;
  - `buttons.ts` (the banner's `action`) and the image panel's owner types;
  - unit and e2e tests.
- `packages/import`: banner detection in `structures.ts`, its segment and mapping in `site.ts`,
  a band in the agency fixture and its tests.
- Docs: README block count (20), `docs/import-mapping.md`, `docs/roadmap.md`.
