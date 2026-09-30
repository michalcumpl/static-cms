# Proposal

## Why

Uploading works, but only a page's hero can show a picture. Real sites need more. The Aniděti project, for example, has 13 uploaded images that no page can use yet:
- ten "how we work" photos;
- two staff portraits;
- a voucher and an award picture meant to sit beside text;
- two partner logos.

Owners can upload them and then have nowhere to put them. This is the next step of Milestone 3 after the media library.

## What Changes

- **Four new block types,** following the rule of business blocks, not layout primitives:
  - **Text with image** (`text_with_image`): a heading, text (paragraphs and bulleted lists, with bold, italic and links), an optional image, and which side the image is on (left or right). On phones the two stack.
  - **Gallery** (`gallery`): an optional heading and photos, each with alt text and an optional caption. Shown as a grid cropped to 4:3. Clicking a photo opens its largest version through a plain link, with no JavaScript.
  - **Team** (`team`): an optional heading and people, each with a name, an optional role, an optional short text, and an optional portrait, shown round.
  - **Partner logos** (`logos`): an optional heading and logos, each with the partner's name, which becomes the image's alt text, and an optional link to a page of the site or an address.
- **Rendering:**
  - every picture uses the existing responsive image output (WebP variants, `srcset`), with a fixed `sizes` value per block;
  - headings stay in order: block headings are `<h2>`, and a person's name is one level below its block heading;
  - the site stylesheet gets styles for the four blocks, using only theme custom properties.
- **Validation:**
  - an empty gallery, logo row or team is a warning;
  - a gallery photo without alt text is an error, as for any image;
  - a person or logo without a name is an error;
  - logo images are exempt from the alt text rule, because their name serves as the alt text.
- **Editor:**
  - the four blocks can be inserted with placeholder content;
  - their items (photos, people, logos) can be added, moved and deleted like service items;
  - images are added, replaced and removed through the media library;
  - the Image panel sets the image side (text with image) and a logo's link;
  - the library dialog gets a **multi-select mode**, so several photos can be added to a gallery, team or logo row in one go;
  - every action can be undone.

### Non-goals (this change)

- Free image sizes, cropping by hand, and focal points (they stay on the roadmap as "cropping and focal points").
- A lightbox or any JavaScript on published pages.
- Images inside `rich_text`, carousels and sliders, and videos.
- Changing the hero block.

## Capabilities

### New Capabilities

None. The blocks extend the site document, rendering and editing.

### Modified Capabilities

- `site-document`: the four block types and their items; validation for names, empty blocks, and the alt text exception for logos.
- `site-rendering`: HTML for the four blocks, their `sizes`, the gallery's enlarge links, and heading levels for block headings and person names.
- `site-editing`: inserting the new blocks, editing their items and images, the image side and logo links in the Image panel, and a multi-select media library.

## Impact

- `packages/site`:
  - schema and types (`text_with_image`, `gallery`, `gallery_item`, `team`, `person`, `logos`, `logo_item`);
  - validation (`domain.ts`, new problem codes);
  - rendering (`blocks.ts`) and the stylesheet (`css.ts`);
  - a demo-site fixture page with all four blocks;
  - render, snapshot and html-validate tests.
- `apps/admin`:
  - editor node components for the new types and items;
  - inserters and transforms;
  - generalised image-slot helpers (today hero-only);
  - the Image panel (side, logo link);
  - `MediaLibrary.svelte` (multi-select);
  - `structure.ts` (block list, fixed image slots);
  - unit and Playwright tests.
- No server, database, media or export changes: export already includes every image reachable from the site.
- `docs/roadmap.md`: the "More blocks" and image options items.
