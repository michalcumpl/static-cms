# Proposal

## Why

Two content blocks small-business sites rely on are still missing, the second half of the split agreed when exploring business blocks:
- **A call to action:** a short band that asks visitors to do one thing, like "Order a cake" or "Book an appointment", with a button or two. Today the only button on a site is the hero's.
- **Testimonials:** what customers say, with their names. These are the most persuasive content a small business has, and they currently have to be typed as plain paragraphs.

Exploring this showed a gap that has to close first: **the editor can't set where a button points.** The hero's call to action can only have its label edited, and a new hero starts without one. A call-to-action block is useless without that, so this change adds a button panel, and it serves the hero too.

## What Changes

- **Call to action block.** It has:
  - a heading and an optional short text;
  - one or two buttons, each linking to a page of the site or to an address (`https`, `mailto:` or `tel:`, so "Call us" works).

  It renders as a highlighted band, and the second button looks secondary. A new one starts with one button to the home page, labelled "Tlačítko". A block without buttons is a warning, and more than two is an error.
- **Testimonials block.** It has an optional heading and a list of testimonials. Each testimonial has:
  - the quote;
  - the person's name;
  - an optional detail (such as "zákaznice od roku 2015");
  - an optional round photo.

  They render as `<figure>` elements with `<blockquote>` and `<figcaption>`. An empty quote or name is an error, and a block without testimonials is a warning. Items are added, removed and reordered like people in a team, and photos come from the media library like portraits.
- **Button panel.** When a button is selected (in the hero or a call to action), the details column shows where it points: a page of the site, or an address checked by the same rules as links. The panel can also add a button to a hero without one, add the second button to a call to action, and remove a button (a call to action keeps at least one). Every action is one undo step.
- **No structured data for testimonials.** Google doesn't show review stars for reviews a business publishes about itself, and marking them up risks a penalty. The design records this.
- **No document format change.** These are new block types. Existing documents stay valid, as when the image blocks were added.

### Non-goals (this change)

- Star ratings, review sources (Google, Facebook) and importing reviews.
- A testimonial carousel or slider. The list is static; there's no JavaScript on published sites.
- More than two buttons, button styles beyond primary and secondary, and icons on buttons.

## Capabilities

### New Capabilities

None. The behaviour extends the document, rendering and editing capabilities.

### Modified Capabilities

- `site-document`:
  - the `call_to_action` and `testimonials` block types and the `testimonial` item;
  - their content rules.
- `site-rendering`:
  - rendering of the two blocks;
  - the testimonial photo's image size.
- `site-editing`:
  - inserting the two blocks;
  - editing their texts and testimonial items and photos;
  - the button panel for the hero and the call to action.

## Impact

- **`packages/site`:**
  - schema and types;
  - validation, and the owners'-words test;
  - the block renderers and CSS;
  - image sizes and used media files (testimonial photos);
  - tests and snapshots.
- **`apps/admin`:**
  - canvas components (`CallToAction.svelte`, `Testimonials.svelte`, `Testimonial.svelte`);
  - inserters, including "Add item" for testimonials;
  - image slots for testimonial photos;
  - `ButtonPanel.svelte` with button operations;
  - the Add block section;
  - `locate.ts`;
  - unit and e2e tests.
- **No new dependencies, and no migration.**
- **Docs:** the roadmap (Milestone 3: business blocks done).
