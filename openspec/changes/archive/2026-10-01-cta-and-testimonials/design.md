# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:
- **Buttons today.** The hero has an `action` list of at most one `page_link` or `external_link`, rendered by `renderLink(…, "button")`.
  - On the canvas the label is editable through the link's node component.
  - Nothing sets the target. `insertHero` creates the hero without an action, and `structure.ts` treats `action` as a fixed list, so the canvas can't add or remove buttons.
  - The logo link in `ImagePanel` is the only existing UI that picks "a page or an address". It uses `checkLinkAddress` from `links.ts`, the same rules as the link dialog.
- **People in a team** are the model for testimonials: `person` items with an optional `image` list. `ImageSlot` adds or replaces the portrait, `chooseImage` makes a portrait decorative, and "Add item" inserts a person through `itemInsertionPoint`.
- **Validation** already handles link labels, missing pages and unsafe links for `page_link` and `external_link` nodes anywhere. Messages name the page through `placesOf`, and a link in a block that isn't the menu is "a button" (`linkLabel`).
- **The settings column** shows `BlockPanel` for the selected contact block and `ImagePanel` for a selected image. The left column's Add block section lists the block types.

## Goals / Non-Goals

**Goals:**
- Two content blocks that fit the existing block, item and image patterns, so they need no new mechanisms.
- One button panel for every button, so the hero's call to action becomes usable as well.

**Non-Goals:**
- Changing how the menu's links or text links are edited. They keep their sidebar and link dialog.
- Review structured data (decision 4).

## Decisions

### 1. Node types

```
call_to_action  heading: text (single line)   text: text (single line)
                actions: node_array<page_link | external_link>      1..2
testimonials    heading: text (single line)
                items:   node_array<testimonial> (default testimonial)
testimonial     quote: text   name: text   detail: text   (single line each)
                image: node_array<image>                            0..1
```

- **Buttons reuse `page_link` and `external_link`,** exactly like the hero's action. Rendering, validation (labels, missing pages, unsafe links), `countLinksTo` and the delete-page warning then cover them with no new code.
- **`actions` is a fixed list** (added to the fixed-list rule in `structure.ts`), like the hero's `action`. Buttons are only added and removed through the panel, so the canvas can't leave a call to action in a state the owner didn't choose.
- **The quote is a single line of text** (no line breaks). Testimonials are short, and a single text keeps the `<blockquote><p>` markup simple. It can be widened later without a migration.
- **Document format:** new types only, so the schema version stays 4, as with the image blocks.

### 2. Rendering and styles

- **The call to action** renders as `<section class="block cta">` with the `h2`, an optional `<p class="cta-text">` and a `<p class="cta-actions">` with the buttons. The second button gets `button-secondary`.
- **CSS:**
  - the section has the theme's secondary colour as background, like the hero band;
  - `.button-secondary` is outlined: transparent background, the primary colour for border and text;
  - the buttons wrap with a gap on small screens.
- **Testimonials** render as `<section class="block testimonials">` with a `<ul class="testimonial-list">` of `<li><figure class="testimonial">`. Each has `<blockquote><p>…</p></blockquote>` and a `<figcaption>` with:
  - the optional photo (`sizes="4rem"`, lazy, round);
  - `<span class="testimonial-name">`;
  - `<span class="testimonial-detail">`.

  The grid is one column on phones and two from 48rem.
- **Images:** testimonial photos are images in a page's blocks, so `usedMediaFiles` and export already include their variants, because the walk covers every block. `IMAGE_SIZES.testimonial` is `4rem`.

### 3. Editor

- **Canvas components:**
  - `CallToAction.svelte`: the editable heading and text, and its buttons through the existing `PageLink`/`ExternalLink` components, which edit the label in place.
  - `Testimonials.svelte` and `Testimonial.svelte`: the quote, name and detail as text properties, and the photo through `ImageSlot` with the label "Add photo…".
- **Inserters:**
  - `insertCallToAction`: heading "Nadpis", empty text, and one `page_link` to the home page labelled "Tlačítko".
  - `insertTestimonials`: heading "Nadpis" and one empty testimonial.
  - `insertTestimonial`, used by Enter and "Add item". `itemInsertionPoint` learns the `testimonials` block's `items`.
- **Photos:** `OPTIONAL_IMAGE_OWNERS` gains `testimonial`, and `chooseImage` makes its photo decorative, like a portrait, because the name is next to it.
- **`ButtonPanel.svelte`** in the settings column, above `BlockPanel`. It finds the button the selection is in, or on (a `page_link` or `external_link` whose owner is a `hero` or a `call_to_action`), and the block the selection is in, for "Add a button".
  - **Target:** radio buttons "A page of the site" (a `<select>` of pages) and "An address" (a text field applied on change, checked with `checkLinkAddress`, and an error message when refused).
- **Button operations,** in `lib/editor/buttons.ts`, one transaction each:
  - `setButtonPage` and `setButtonAddress` replace the link node with one of the other kind when the kind changes, keeping its ID out of reuse and keeping the label;
  - `addButton(blockId)`: up to 1 for a hero, 2 for a call to action;
  - `removeButton(buttonId)`: never the last of a call to action.
- **The Add block section** gets "Call to action" and "Testimonials".
- **`locate.ts`** needs nothing new: buttons and testimonials are nodes on pages, so problems select them on the canvas as other blocks' problems do.

*Alternative:* put the target in the existing link dialog (used for text links). It edits marks on a text selection, not link nodes, and a panel next to the selection matches how logo links work.

### 4. No structured data for testimonials

Google's review snippet guidelines exclude "self-serving" reviews: reviews a business puts on its own site about itself, for `LocalBusiness` and `Organization`. Marking them up earns no stars and can lead to a manual action. Testimonials therefore render as plain semantic HTML (`blockquote`, `figcaption`) without schema.org markup.

### 5. Validation

- **Call to action:**
  - `empty-heading` (error) for an empty heading;
  - `too-many-items` (error) for more than two buttons;
  - `empty-block` (warning) for none.
- **Testimonial:** `empty-name` for the name, and a new `empty-quote` for the quote, both errors.
- **Testimonials block:** `empty-block` (warning) without items.

Messages follow the existing page-naming pattern ("A testimonial on "Úvod" needs its quote."). Buttons are already "a button on …" through `linkLabel`.

### 6. Tests

- **`packages/site`:**
  - validation for every rule, and the owners'-words test;
  - rendering of both blocks, with the spec's scenarios;
  - photo sizes, and that photos appear in `usedMediaFiles`;
  - `html-validate` on a page with both blocks;
  - snapshots unchanged.
- **`apps/admin`:**
  - button operations: page or address, unsafe address refused, add up to the limit, remove but not the last, undo;
  - inserters, "Add item" in testimonials, and photo choosing (decorative).
- **e2e:**
  - insert a call to action, point its button at "Kontakt", add a "tel:" second button, and check the preview;
  - give the hero a button;
  - insert testimonials, add a second one with a photo, and check the preview.

## Real publish (task 3.3, 2026-10-01)

The owner added a call to action with a call button and a testimonials block to a real site, published it, and checked it on a phone. They reported that everything worked: the call button dials, and the buttons and testimonials wrap well.

## Risks / Trade-offs

- **[Replacing a link node when its kind changes]** A selection inside the old node goes away. → The panel re-selects the new button after the change, so the panel stays open.
- **[Fixed lists]** Owners can't delete a button by selecting it and pressing Delete on the canvas. → The panel's "Remove button" does it, and the hint in the panel says so.
- **[Hero buttons were half-supported]** Documents may hold heroes with a button whose target the owner never chose: the demo's points at "Kontakt". → Nothing changes for them. The panel now lets owners see and change the target.

## Migration Plan

None: no format change and no data migration. Deploying adds the blocks and the panel.
