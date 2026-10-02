# Proposal

## Why

To delete, move or otherwise act on a block today, the owner must put the caret in it, press Escape once or several times until the whole block is outlined, and then use the toolbar. Nothing on screen says so. Escape usually means "cancel". The level reached (paragraph, item, block) is shown only by an outline. It also can't be done with a mouse or a touchpad alone. Removing one photo from a gallery has the same problem.

Adding a block has the same weakness. The "Add block" buttons sit in the left column, away from the canvas, and the block goes after whichever block holds the cursor, or at the end. That place isn't shown. The new block isn't scrolled into view, so after scrolling elsewhere it can look as if nothing happened. The faint "+" gaps between blocks, which choose a place, are easy to miss. The labels ("Hours", "Text + image") don't say what a block is, and a disabled Hero doesn't say why. Even the full, standard names ("Call to action", "Hero") don't tell an owner what the block will look like.

The roadmap's user is a non-technical owner, and they won't find this. Page builders they may know (WordPress, Squarespace, Notion) put a handle next to each block instead, with a menu of what can be done to it.

## What Changes

- **A handle for each block.** A small grip appears at the left edge of a block when the pointer is over it, or when the caret or selection is inside it (so it also works on touch screens). Clicking the handle selects the whole block and opens a menu:
  - Move up;
  - Move down;
  - Duplicate;
  - Delete.
- **A handle for each item** inside a block works the same way. Items are list items, services, gallery photos, people, logos and testimonials. When the caret is in an item, both the item's and the block's handles show.
- **Duplicate (new).** It copies the block or item, with its texts, marks and images, right after the original, and selects the copy, in one undoable step. A hero can't be duplicated, since a page has at most one hero and it must be first.
- **Unavailable actions are disabled, not hidden:** Move up on the first block, Move down on the last, Duplicate on a hero.
- **What is selected is said in words.** The toolbar names the selection ("Services block selected", "Photo 3 of 6 selected"), next to the existing Move and Delete buttons.
- **Add blocks where they go.** A "+ Add block" button appears between blocks and above the first one, on hover, and on both sides of the block with the cursor (for touch). A block's handle menu also offers "Add block above" and "Add block below".
- **An illustrated block picker.** Both open the same picker, a grid of cards. Each card has:
  - a simple drawing of the block (a wireframe sketch in the site's primary colour);
  - the block's standard name;
  - a one-line description ("Your weekly hours, from the Business tab").

  Blocks that can't go there are greyed out with the reason ("Only at the top of a page without a hero").
- **Feedback after adding.** The new block scrolls into view, gets a brief highlight, and the cursor goes into its first text, so the owner can type straight away.
- **Adding happens only on the canvas.** The left column's "Add block" buttons and their hint go: they inserted somewhere the owner couldn't see, and a second way of doing the same thing would only confuse. An empty page shows a single "+ Add block".
- **Keyboard.** The handle is a real button. The menu follows the menu-button pattern: arrow keys, Enter and Escape, with focus going back to the canvas. Escape on the canvas still selects the enclosing paragraph, item or block, and the toolbar's Delete tooltip mentions it.
- **Fixed parts keep no handle:** the menu, the page list, image slots, buttons and the page title (the parts `isFixedList` already protects), as well as the hero's fixed slots.

### Non-goals (this change)

- Dragging blocks by the handle. Moving stays one step at a time; drag and drop can come later.
- Copying blocks between pages or languages.
- Handles for paragraphs and subheadings inside a text block. They are text, edited in place.
- Changing a block's type ("turn into…").
- Adding *items* differently. The toolbar's "Add item" and the media library's multi-select stay as they are.

## Capabilities

### New Capabilities

None. The behaviour extends editing.

### Modified Capabilities

- `site-editing`:
  - block and item structure gain duplication, and handles as the way to act on them, and insertion at a chosen place;
  - a new requirement for the block and item handles and their menu;
  - a new requirement for naming the selection in the toolbar;
  - a new requirement for adding blocks on the canvas: add buttons, the illustrated picker and feedback after adding; the left column no longer adds blocks.

## Impact

- **`apps/admin`:**
  - a handle overlay on the canvas (`BlockHandles.svelte`), placed from Svedit's `data-path` attributes rather than by changing each block component;
  - a handle menu component;
  - `duplicateSelectedNode` in `structure.ts`, built on Svedit's `tr.build` (as `duplicatePage` is);
  - a selection-label helper with block and item names;
  - add buttons in the same overlay, and a block picker of cards with block descriptions;
  - `block-illustrations.ts`: one small inline SVG drawing per block type;
  - `insertBlockAt` for an explicit position, used by the picker;
  - the left column's `BlockInserter.svelte` and its hint removed;
  - `insertableBlocks` no longer offers blocks above an existing hero;
  - toolbar text;
  - unit and e2e tests.
- **`packages/site`:** unchanged. Duplicates are ordinary nodes, and the published HTML doesn't change.
- **No new dependencies.**
- **Docs:** the roadmap (editor polish) and the admin README's editing notes.
