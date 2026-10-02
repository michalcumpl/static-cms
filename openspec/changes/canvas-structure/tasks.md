# Tasks

## 1. Structure operations and names

- [x] 1.1 Add `duplicateSelectedNode` to `lib/editor/structure.ts` (design.md decision 4): copy the selected block or item with `tr.build`, insert it right after the original, select the copy, one transaction; refuse fixed lists and a hero. Verify with unit tests for "Duplicate a services block" (same texts and the bold word, no shared IDs, one undo), "Edit the copy only", "Duplicate a person" (own image node, same media key and description), a gallery photo, and "Hero is not duplicated".
- [x] 1.2 Add `lib/editor/handles.ts` with `handleTargets(session, path)` and `selectionLabel(session)`, plus `BLOCK_NAMES` and item names (decisions 2 and 5). Verify with unit tests: a path inside a service's text gives the service and its services block; a paragraph of a text block gives only the block; navigation, hero slots, buttons and image slots give nothing; labels "Services block", "Photo 3 of 6", "List item 4 of 4", and none for a text selection.

## 2. Handles on the canvas

- [x] 2.1 Add `BlockHandles.svelte` (decisions 1, 2 and 6): at most a block handle and an item handle, placed with `position-anchor` on Svedit's node anchors, following the selection first and the pointer otherwise (with the 300 ms hold), hidden without anchor-positioning support, with large hit areas on coarse pointers. Mount it inside `.site-canvas` in `edit/+layout.svelte`. Verify with an e2e test for "Handle without hovering" and "No handle on the menu", plus a screenshot check of desktop and mobile widths, gallery and team blocks included.
- [x] 2.2 Add `HandleMenu.svelte` (decision 3): the handle selects its target and opens a menu-button menu with Move up, Move down, Duplicate and Delete (Add block above/below join it in 2.4), run through Svedit's commands and `duplicateSelectedNode`, with disabled entries, keyboard handling, and focus back on the canvas. Verify with e2e tests for "Delete a block with the mouse" (and undo), "Remove one gallery photo", "First block", "Keyboard only" and "Close the menu".

- [x] 2.3 Add `insertBlockAt(session, blocksPath, index, type)` to `structure.ts`, make `insertBlock` use it, and stop `insertableBlocks` offering anything above an existing hero; add `BLOCK_DESCRIPTIONS` and `unavailableReason` to `handles.ts` (decision 8). Verify with unit tests: inserting at a given index regardless of the caret, "Nothing above the hero", and a reason for Hero between two blocks.
- [x] 2.4 Add the "+ Add block" points to the overlay (decision 7), `BlockPicker.svelte` (decision 8), and Add block above/below in a block's handle menu. Verify with e2e tests for "Add between two blocks" (and undo), "Add below from the handle", "Hero greyed out with a reason", "Descriptions", "Close the picker" and "Touch", plus the screenshot check from 2.1 with the add points showing.
- [x] 2.5 Reveal inserted blocks (decision 9): scroll into view (no smooth scrolling under reduced motion) and a 1 s highlight. Verify with the e2e test for "Add between two blocks": the new block is in the viewport, carries the highlight, and has the caret.
- [x] 2.6 Turn the picker into a grid of cards with drawings (decisions 8 and 10): `block-illustrations.ts` with one SVG per block type, cards with drawing, name and description (or the reason it's unavailable), two per row (one when narrow), arrow keys across the grid. Verify with a unit test that every block type has a drawing with the shared viewBox, e2e tests for "Pictures in the picker", "Empty page" and keyboard movement across the grid, and a screenshot check of the picker on desktop and mobile widths.

## 3. Toolbar and left column

- [x] 3.1 Show the selection label in the toolbar as an `aria-live="polite"` "<label> selected", and extend the Delete button's description with the Escape hint (decision 5). Verify with e2e tests for "Photo selected", "Escape reaches the block" and "Typing".
- [x] 3.2 Remove the left column's Add block section (`BlockInserter.svelte`), `insertionHint`, and `insertBlock`/`blockInsertionPoint` if nothing else uses them, with their tests; adapt e2e tests that added blocks from the left column to use the canvas. Verify with an e2e test for "No Add block buttons in the left column" and the full e2e suite.

## 4. End to end and docs

- [x] 4.1 Update the roadmap (Milestone 3 editor polish: block handles and adding blocks on the canvas with an illustrated picker done; the left column no longer adds blocks; drag and drop later) and the admin README's editing notes. Verify by reading both.
- [ ] 4.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [ ] 4.3 Manual check by the owner: on a laptop and on a phone or tablet, delete a block, remove one photo, duplicate a service, reorder blocks and add a block between two others, using only the handles and the "+ Add block" buttons. Record the outcome in design.md.
