# Design

## Context

See proposal.md for the motivation. The code as it stands:

- **Schema (`packages/site/src/schema/schema.ts`).**
  - `page.blocks` allows `hero`, `rich_text` and `services`.
  - Images are `image` nodes held in a `node_array` property named `image` (0..1), as in `hero.image`.
  - Links as nodes (`page_link`, `external_link`) carry a required `label` text, and validation reports an empty label (`empty-link-label`).
- **Validation (`domain.ts`).** `checkPageBlocks` walks the blocks for hero placement, empty headings and heading order (`hasH2`); `checkImage` applies the alt rule to every reachable image.
- **Rendering (`blocks.ts`, `css.ts`).**
  - `renderImage(image, ctx, { lazy, sizes, className })` emits the responsive `<img>`.
  - The stylesheet uses theme custom properties and `@container (min-width: 48rem)` for wide layouts, which the editor canvas reuses for its mobile toggle.
- **Editor.**
  - Node components live in `nodes/`, and blocks are created through `blockInserters`.
  - Items are added with `insertItem`, via the Svedit inserters `list_item` and `service_item`.
  - `isFixedListProperty` keeps any property named `image` fixed on the canvas.
  - `hero-image.ts` (`chooseHeroImage`, `removeImageFromHero`, `heroOfSelectedImage`) and `setHeroImage`/`removeHeroImage` are hero-specific.
  - `MediaLibrary.open()` resolves with one `ChosenImage`.
- **Fixtures.** The demo site has no image blocks, and its Playwright tests depend on its exact content.

## Goals / Non-Goals

**Goals:**
- Four blocks that look finished with the theme alone: no per-block colour or size options.
- One image mechanism for every slot, whether hero, text, portrait, gallery or logo.
- The demo site stays unchanged; the new blocks get their own fixture.

**Non-Goals:**
- Changes to the hero, and any JavaScript in published pages.

## Decisions

### 1. Schema

```
text_with_image  heading: text (no marks)       body: node_array [paragraph, list] (default paragraph)
                 image: node_array [image] 0..1  image_side: string "left" | "right" (default "right")
gallery          heading: text                   items: node_array [gallery_item]
gallery_item     image: node_array [image] 1     caption: text (no marks, single line)
team             heading: text                   people: node_array [person] (default person)
person           name: text   role: text   text: text (marks, newlines)   image: node_array [image] 0..1
logos            heading: text                   items: node_array [logo_item]
logo_item        image: node_array [image] 1     name: text (single line)
                 page_id: string ("" = none)     url: string ("" = none)
```

- **The logo link is two plain strings,** not a `page_link`/`external_link` node. Link nodes need a visible label, which a logo doesn't have, and every logo link would be reported for an empty label. Validation:
  - `page_id` must name a page (`missing-page`);
  - `url` must pass `isSafeHref` (`unsafe-link`);
  - both set at once is `invalid-value`.
- **Counts** (`image` 1 vs 0..1) are enforced by validation, not by the schema, as with `hero.image`.
- **Types.** `NodeType` grows by seven types; `types.ts` gets their interfaces.

### 2. Validation

- **New codes:**
  - `empty-name`: error, site; for a person or logo item.
  - `empty-block`: warning, site; for a gallery, team or logos block without items.
  - `missing-image`: error, site; for a gallery or logo item without an image.
- **Alt rule.** `checkImage` skips images whose parent is a `logo_item`. The walker already knows each node's parent through the reachability pass; `checkSiteRules` gets a `parentOf` map.
- **Heading order.** A non-empty heading on `text_with_image`, `gallery`, `team` or `logos` sets `hasH2`, as the services heading does. Person names never trigger `heading-skip`, because their level follows the block heading (decision 3).
- **Messages** name the block and page by title, following the page-management convention: "A person on "Kontakt" needs a name."

### 3. Rendering

| Block | Markup (inside `<section class="block …">` + `.container`) | `sizes` / loading |
|---|---|---|
| text_with_image | `class="text-with-image image-left"`; `h2`; `.twi-text` with `p`/`ul`; `.twi-image` with `img` | `(min-width: 48rem) 50vw, 100vw`, lazy |
| gallery | `h2`; `ul.gallery-grid > li > figure > a[href=largest variant] > img` + `figcaption` | `(min-width: 48rem) 33vw, 50vw`, lazy |
| team | `h2`; `ul.team-list > li.person` with `img.portrait`, `h3`/`h2` name, `p.role`, `p.person-text` | `10rem`, lazy |
| logos | `h2`; `ul.logo-row > li` with `a > img` or `img`, alt = name | `12rem`, lazy |

- **`HERO_IMAGE_SIZES` becomes `IMAGE_SIZES`,** a record per block kind, so the values live in one place.
- **Largest variant.** `imageVariants(width).at(-1)` gives the file the gallery links to.
- **Stylesheet:**
  - gallery `img { aspect-ratio: 4/3; object-fit: cover }`;
  - `.portrait { aspect-ratio: 1; border-radius: 50%; object-fit: cover; width: 8rem }`;
  - `.logo-row img { max-height: 4rem; width: auto }`;
  - grids through `grid-template-columns: repeat(auto-fill, minmax(…))`;
  - the text-with-image two-column layout inside `@container (min-width: 48rem)`, where `.image-left` swaps the order;
  - all colours and radii from theme custom properties.

### 4. One image mechanism in the editor

- **`image-slots.ts` replaces `hero-image.ts`.** It works for any node with an `image` property:
  - `chooseImage(editor, ownerId)`;
  - `removeImage(editor, ownerId)`;
  - `ownerOfSelectedImage(editor)`, returning `{ id, type }`.

  `setHeroImage`/`removeHeroImage` become `setImage(tr, ownerId, image, { decorative })` and `removeImage(tr, ownerId)`. Portraits are created decorative.
- **`ImageSlot.svelte`** renders either the owner's image (`Child`) or an "Add image…" button (`contenteditable=false`). The hero, text-with-image and person components use it. Gallery and logo items always have an image.
- **The Image panel** reads `ownerOfSelectedImage`:
  - Replace is offered for every image;
  - Remove only where the image is optional (hero, text with image, person);
  - Left/Right radio buttons for `text_with_image`;
  - for `logo_item`, no alt field: it shows "Described by its name", with link fields (a page select or an address) and "Remove link", addresses checked by `checkLinkAddress`.
- **Fixed lists.** `isFixedListProperty` already covers `image`, so Backspace can't delete a required image.

### 5. Adding items

- **Multi-select library.** `MediaLibrary.open({ multiple: true })` resolves with `ChosenImage[]`. Options become checkable, the button reads "Add N images", and uploads made meanwhile are selected automatically.
- **Add buttons.** `Gallery.svelte`, `Team.svelte` and `Logos.svelte` render "Add photos… / Add people… / Add logos…" (`contenteditable=false`) after their items.
- **The add transaction** creates all items in one transaction (`addItemsWithImages(tr, blockId, images)`):
  - gallery items get an empty caption;
  - people get a placeholder name ("Jméno") and a decorative portrait;
  - logo items get the image's original name without its extension (for legacy keys, the key without its extension).
- **Enter and "Add item".** `person` gets an inserter, so Enter at the end of a person's text and "Add item" add an empty person. Gallery and logo items have no inserter, because they need an image; "Add item" is disabled for them and the block's add button is the way in. Delete and move reuse `delete_node` and `move_up`/`move_down`.

### 6. Inserting blocks

- **Toolbar.** `BLOCK_LABELS` and `blockInserters` gain "Text + image", "Gallery", "Team" and "Logos". The "Add:" group grows, and wraps as the toolbar already does.
- **Inserters** create the placeholder heading ("Nadpis") and, for text with image, one empty paragraph. `insertableBlocks` allows all four anywhere, the hero rule unchanged.

### 7. Fixtures and tests

- **`packages/site/fixtures/image-blocks-site.json`:** the demo site plus a page "Galerie" (`galerie`) with one block of each type, using the demo's `hero.png` (320×180) as every image, so only `hero.png-320.webp` is needed. The page is left out of the menu, so it doesn't disturb the tests that check the demo's navigation.
- **Rendering:** unit tests for each block's HTML and `sizes`, the gallery link, logo alt text and links, heading levels, and snapshots of `galerie/index.html`, which html-validate also checks.
- **Editor:** unit tests for the transforms (`setImage`, `addItemsWithImages`, the side, logo links).
- **Playwright,** on a test project seeded with the image-blocks fixture:
  - insert each block;
  - add three photos through the multi-select library, then undo;
  - put the image on the left;
  - link a logo;
  - reorder gallery photos;
  - check the preview.

## Risks / Trade-offs

- **[Risk] Seven node types make `schema.ts`, the node components and `nodeComponents` longer.** → Each block is small and follows the services pattern. A test asserts that every schema type has a component (`validate_config_components`).
- **[Trade-off] The 4:3 crop hides the edges of portrait-format photos.** Focal points come with the cropping item on the roadmap.
- **[Trade-off] Logo names start as file names** ("harmonie"). The owner renames them in place; an unchanged file name isn't flagged, since it is a valid name.
- **[Risk] The multi-select library adds a second mode to an already busy dialog.** → The mode only changes selection and the confirm button, and the Playwright tests cover both modes.
- **[Risk] A gallery item left without an image** (from a hand-edited document) shows nothing in the editor. → Validation reports `missing-image`, and the item can still be deleted.
