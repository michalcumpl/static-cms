# Design

## Context

See proposal.md for the motivation. Two choices were made with the owner before drafting:
- handles on **blocks and items**;
- a menu of **Move up, Move down, Duplicate, Delete**.

The current state that shapes the approach:
- **The canvas is one Svedit editor** rooted at the site node (`edit/+layout.svelte`). Blocks render through Svedit's `NodeArrayProperty`, which looks up a component per node type in `config.ts`'s `node_components`. There are about fifteen block and item components in `lib/editor/nodes/`.
- **Svedit marks every node element** with `data-type="node"`, `data-path="<serialized path>"` and `style="anchor-name: --<serialized path>"`. Its own selection outline (`NodeSelectionMarkers.svelte`) is placed with CSS anchor positioning (`position-anchor`, `anchor(top)`), so the editor already depends on anchor positioning.
- **Structure commands exist and act on a node selection:**
  - Svedit's `move_up`, `move_down` and `delete_node` commands, wired to the toolbar;
  - `selectedNode`, `moveSelectedNode` and `deleteSelectedNode` in `structure.ts`;
  - `isFixedList`, which keeps the navigation, pages, image slots and buttons out of reach.
- **Escape is Svedit's `select_parent`.** It's the only way to get a node selection with the keyboard today.
- **Copying a subtree already exists:** `duplicatePage` uses `tr.build(id, doc.nodes)`, which copies a node and everything under it with fresh IDs.
- **Adding blocks, before this change.** `BlockInserter.svelte` (left column) called `insertBlock`, which inserts at `blockInsertionPoint`: a selected gap, else after the block holding the selection, else the end. `insertableBlocks(blocks, index)` decides what may go there; today it allows any block above an existing hero, which then fails validation (`hero-not-first`). Each block's inserter (`blockInserters` in `transforms.ts`) already puts the caret in the new block's first text (`insertAndFocus`). Nothing scrolls the block into view or marks it.
- **Block and item placement:** a page's blocks live at `[site, "pages", i, "blocks", j]`. Items are in a block's `items` list (list, services, gallery, logos, testimonials) or `people` (team).

## Goals / Non-Goals

**Goals:**
- One mechanism for every block and item type, without editing each node component.
- The handle acts through the same selection and commands as the keyboard path, so the two can't diverge (undo steps, fixed lists, selection afterwards).
- Usable with a mouse, a touch screen and a keyboard.

**Non-Goals:**
- Drag and drop.
- Live, rendered previews of blocks in the picker. Drawings are enough to tell blocks apart (decision 10).
- Handles in the published site, or any change to `packages/site`.

## Decisions

### 1. One overlay, placed by Svedit's anchors

`BlockHandles.svelte` is rendered once, next to `<Svedit>` inside `.site-canvas`. It shows at most two handles, one for the **block** and one for the **item**.

- Each handle is a `<button>` with `position: absolute; position-anchor: --<path>`, placed at `anchor(top)` and just inside `anchor(left)`.
- Anchor names come from Svedit's own `anchor-name`, so a handle follows its node through re-layout, the mobile width toggle and scrolling, with no measuring code.

*Alternative:* add a handle inside each node component. That means about fifteen edits, each with its own layout quirks (gallery grid, logo row, round portraits). Handles would also sit inside `contenteditable`, where buttons misbehave.

*Alternative:* measure with `getBoundingClientRect` and position by hand. This would duplicate what anchor positioning already does for Svedit, and needs resize and scroll listeners.

### 2. Which block and item a handle is for

A pure function `handleTargets(session, path)` in `lib/editor/handles.ts` takes a document path and returns:
- the block: the path's prefix up to `blocks/<j>`;
- the item: the innermost prefix ending in `items/<n>` or `people/<n>` under that block, when the list isn't fixed (`isFixedList`) and its owner is one of list, services, gallery, logos, team or testimonials.

Paragraphs and subheadings (`rich_text`'s `body`) aren't items. The hero's slots are fixed lists. Hero buttons are `actions`, which is fixed too.

The overlay feeds it from two sources:
- **Pointer:** a `pointermove` on the canvas, using `event.target.closest('[data-type="node"]')` and its `data-path`. Svedit's `deserialize_path` (exported, separator `__`) turns it back into a path.
- **Selection:** `session.selection.path`.

The selection wins. While it is inside a block, the handles stay with it, even when the pointer wanders. Without a selection, they follow the pointer. They hide when the pointer leaves the canvas and there's no selection.

### 3. The handle selects, then the menu runs the existing commands

Activating a handle sets a node selection on the target (`{ type: "node", path: listPath, anchor_offset: i, focus_offset: i + 1 }`). It then opens `HandleMenu.svelte`, which follows the menu-button pattern (`aria-haspopup="menu"`, `role="menu"`/`menuitem`, roving focus).

| Entry | Runs |
|---|---|
| Move up / Move down | Svedit's `move_up` / `move_down` command (as the toolbar does) |
| Duplicate | new `duplicateSelectedNode` (decision 4) |
| Delete | Svedit's `delete_node` |
| Add block above / below (blocks only) | opens the block picker for index `j` / `j + 1` (decision 8) |

Enabled states come from the same commands' `disabled`, plus "is a hero" for Duplicate and Add block above. After Delete the selection is cleared. Escape closes the menu and calls `canvas.focus_canvas()`, the same way the link dialog returns focus.

*Why select first:* the toolbar then names the selection (decision 5). Svedit draws its own outline around the target, so the owner sees what the menu will act on before choosing.

### 4. `duplicateSelectedNode` in `structure.ts`

```ts
const copyId = tr.build(id, doc.nodes);        // the subtree, fresh IDs (as duplicatePage)
tr.set(listPath, { ...list, nodes: [...before, id, copyId, ...after] });
tr.set_selection({ type: "node", path: listPath, anchor_offset: i + 1, focus_offset: i + 2 });
session.apply(tr);
```

- It refuses a fixed list and a hero.
- Images are nodes, so the copy gets its own image node with the same `src` and `alt`. No media is copied, and the library doesn't change.
- Links inside text are marks and are copied with it. Button targets (`page_link`) are copied as nodes that point at the same page.
- A copied `call_to_action` or `testimonials` block is valid as it is. A copied `contact` or `opening_hours` block shows the same business data, which is expected.

### 5. Naming the selection

`selectionLabel(session)` in `handles.ts` returns:
- "<Name> block" for a selected block, from a `BLOCK_NAMES` map in `handles.ts`. The inserter's `BLOCK_LABELS` are button captions ("Text + image", "Hours"), too short for a sentence, so they stay where they are;
- "<Item name> <n> of <count>" for a selected item.

It returns `undefined` for anything else. The toolbar shows it as "<label> selected" in an `aria-live="polite"` span before the Move buttons, so screen readers hear it too (not `role="status"`: the toolbar's one status is the save state). Item names are "List item", "Service", "Photo", "Person", "Logo" and "Testimonial". The handle's accessible name uses the same words ("Services block", "Photo 3").

### 6. Hover on touch, and not covering text

- Handles are 24 × 24 CSS px, with a 44 px invisible hit area on coarse pointers (`@media (pointer: coarse)`).
- They sit in the block's left padding. Blocks have `padding-inline: 1rem` from `.container`, and full-bleed blocks like the hero have their own padding.
- On the mobile preview width, the block handle sits on the canvas edge, half outside it, so it never covers text.
- Item handles appear at the item's top-left corner on a white chip with a shadow, readable over photos.

### 7. Add points in the same overlay

The overlay also renders "+ Add block" buttons:
- above the first block, at the first block's `anchor(top)`;
- after block *j*, at its `anchor(bottom)`, centred;
- on a page without blocks, one button at all times, anchored to the page's (empty) blocks list.

With the left column's buttons gone, these and the handle menu are the only ways to add a block. Keyboard users reach them by Tab from the caret, since they show around the block with the caret.

Which ones show uses the same targets as the handles. While the pointer is over block *j* or its bottom edge, the points above and below it show; around the block with the caret or selection, the same. That is at most two buttons at a time, so the page never fills with "+" marks. Svedit's own faint gap markers stay, since they still select a gap for the keyboard path.

Each button carries its place `{ blocksPath, index }`. A block handle's "Add block above/below" carries `index = j` or `j + 1`.

### 8. The block picker and `insertBlockAt`

The picker is a popover anchored to the button that opened it, following the menu-button pattern like the handle menu. It shows `BLOCK_ORDER` as a grid of cards: the drawing (decision 10), the name from `BLOCK_NAMES` and the description from `BLOCK_DESCRIPTIONS` in `handles.ts`.

- The enabled cards are `insertableBlocks(blocks, index)`. The disabled ones show their reason in place of the description, from `unavailableReason(type, blocks, index)`.
- The grid is two cards per row, one below a 22rem-wide popover. Left/Right arrows move by one card, Up/Down by a row, and Home/End go to the first and last.
- The popover scrolls inside itself, at most 70vh tall.

Choosing calls `insertBlockAt(session, blocksPath, index, type)` in `structure.ts`. It sets the collapsed node selection at `index`, runs `blockInserters[type]` and applies.

The left column's `BlockInserter.svelte` is removed, and so is its hint helper (`insertionHint`). `insertBlock` and `blockInsertionPoint` stay only while something else uses them; otherwise they go too, with their tests.

### 9. Feedback after inserting

Each inserter already moves the caret into the new block's first text, so the owner can type straight away; that stays. Selecting the block instead would make the toolbar name it, but nobody can type into a selected block.

After the transaction applies, a shared `revealInsertedBlock(path)` in the layout runs on the next frame:
- `element.scrollIntoView({ block: "nearest", behavior })`, with `behavior` "smooth" unless `prefers-reduced-motion`;
- an outline flash through a `data-just-added` attribute, removed after 1 s.

It finds the element by `data-path`.

### 10. Drawings of the blocks

`lib/editor/block-illustrations.ts` exports `BLOCK_ILLUSTRATIONS: Record<BlockType, string>`. Each is a hand-written inline SVG with `viewBox="0 0 120 72"`, drawn as a wireframe of the block's published layout:
- text is grey bars;
- photos are grey boxes with a small mountain mark;
- portraits are circles;
- buttons are rounded pills.

Two fills are used:
- `var(--sketch, #c9ced6)` for structure;
- `var(--color-primary)` for buttons and accents.

The picker sits inside `.site-canvas`, where the theme's custom properties are defined, so the drawings take the site's own primary colour with no extra code.

They're hand-written rather than rendered from the site's components: at 120 × 72 a real render is unreadable text, and the drawings stay the same whatever placeholder content a block gets. Each card renders its drawing with `{@html}` from this constant module (no user content) inside an `aria-hidden` wrapper. A unit test checks that every `BlockType` has one and that each parses as SVG with that viewBox.

## Risks / Trade-offs

- **[Anchor positioning support]** → Chromium and Safari support it, and so does Firefox from its 2026 releases. Svedit's selection outline already needs it, so this adds no new browser requirement. Where it's missing, the handles fall back to `display: none` (`@supports not (anchor-name: --a)`), and Escape and the toolbar still work.
- **[Handles flicker while the pointer crosses gaps]** → After the pointer leaves a node, the target stays for 300 ms before switching, and it never switches while the menu is open.
- **[Svedit's markup changes]** → The overlay depends on `data-type`, `data-path` and `anchor-name`. svedit is pinned exactly (0.14.0) in the catalog, and an e2e test exercises the handles, so an upgrade that breaks them fails CI.
- **[Duplicate of a block with an empty required field]** → The copy carries the same problems as the original (an empty heading, a missing image description), and the problems panel lists both. That's expected and needs no special case.

- **[Add buttons and handles crowd small blocks]** → At most two add buttons and two handles show at once. Add buttons sit on the boundary between blocks, centred, and handles at the left edge, so they don't overlap. The screenshot task checks the gallery, the team block and the mobile width.

- **[The card grid needs room]** → Two cards per row, one on narrow widths; the popover flips above its button when there's no room below, and scrolls inside itself.

## Migration Plan

Editor-only, with no document or database changes. Rollback is redeploying the previous build.
