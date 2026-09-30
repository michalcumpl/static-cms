# Tasks

## 1. Document

- [x] 1.1 Add the seven node types to the schema and `types.ts` (design.md decision 1) and allow the four blocks in `page.blocks`; verify `pnpm --filter @static-cms/site typecheck` and the svedit schema test (`validate_document_schema`) pass
- [x] 1.2 Add validation per design.md decision 2 (`empty-name`, `empty-block`, `missing-image`, the logo alt exception, logo link checks, headings setting `hasH2`); verify with unit tests for every site-document scenario under Content blocks, Image accessibility and Image block contents
- [x] 1.3 Create `fixtures/image-blocks-site.json` (the demo site plus an unlisted page "Galerie" with one block of each type, every image `hero.png` 320×180); verify it validates without problems

## 2. Rendering

- [x] 2.1 Render the four blocks (design.md decision 3) with `IMAGE_SIZES` per block and the gallery's link to the largest variant; verify with unit tests for Image on the left, Gallery photo enlarges, Logo alt text and link, Gallery image (`sizes`, lazy), and that empty optional texts produce no elements
- [x] 2.2 Render headings for the new blocks and person names at the right level; verify with the Team names and Team without a heading scenarios, and with the heading-order validation passing on the fixture
- [x] 2.3 Add the four blocks' styles to the stylesheet (4:3 gallery crop, round portraits, logo height, two columns from 48rem with the left/right swap), using only theme custom properties; verify with the existing "only custom properties" CSS test, a snapshot of `galerie/index.html` that passes html-validate, and export of the fixture including `hero.png-320.webp`

## 3. Editor: images

- [x] 3.1 Replace the hero-only helpers with `image-slots.ts`, `setImage`/`removeImage` and `ImageSlot.svelte`, and use them in the hero; verify the existing hero transform unit tests and the media Playwright tests still pass unchanged
- [x] 3.2 Extend the Image panel: Replace for every image, Remove only for optional images, the left/right choice for text with image, and for logos no alt field but link fields (page or address, checked with `checkLinkAddress`) with "Remove link"; verify with unit tests for the side and logo link transforms (including undo) and the Image to the left, Link a logo, Unsafe logo link refused and Logo image panel scenarios in Playwright

## 4. Editor: blocks and items

- [x] 4.1 Add node components for the seven types, the block inserters and toolbar entries, and the `person` inserter; verify with a unit test that every schema type has a node component, and Playwright for Insert a text with image block and inserting each other block
- [x] 4.2 Add the multi-select mode to `MediaLibrary.svelte` and `addItemsWithImages`, with "Add photos… / people… / logos…" in the blocks; verify with Playwright for Add photos to a gallery (three images, one undo removes all), Add logos (names from file names), Portrait starts decorative, and that single-select for the hero still works
- [x] 4.3 Make gallery photos, people and logos reorderable and deletable like service items, with "Add item" adding a person but disabled for gallery and logo items; verify with Playwright for Reorder gallery photos and deleting a logo

## 5. Integration

- [x] 5.1 End-to-end in Playwright: on a page, insert all four blocks, fill them from the library, describe the gallery photos, save, and check the preview (HTML of each block, the gallery link) and the ZIP (every used variant); verify `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite pass locally and in CI
- [x] 5.2 Update `docs/roadmap.md` (image blocks done under "More blocks", the image options item narrowed to cropping and focal points) and the README's Images section; verify the roadmap links resolve once the change is archived
