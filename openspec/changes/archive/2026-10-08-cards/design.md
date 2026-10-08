# Design

## Context

See proposal.md for the motivation. The current state:

- **Blocks with their own items** (`gallery`, `logos`, `figures`, `steps`) hold them in an `items`
  node array; the editor's item handles, Enter and "Add item" work through `ITEM_LISTS`,
  `ITEM_TYPES` and `itemInsertionPoint` in `lib/editor/handles.ts` and `structure.ts`.
- **Links of items:** a `logo_item` has `page_id` and `url` (at most one set), edited in the
  Image panel when the logo is selected (`setLogoLink`, with `checkLinkAddress`). Validation
  reports a missing page and an unsafe address.
- **Item pages** (`collection-pages`): a service or project has a page while its collection has a
  listing page; `RenderContext.itemUrl(id)` gives its URL, and `routes` holds every page and item
  route by ID, so `pageUrl(id)` works for both.
- **Columns by count:** `figureColumns(count)` in `@webmio/render` gives key figures' columns, with
  a container query on the block.
- **Looks** are a string property with `values` and a default (`block-variants`), set with
  `setBlockLook` and listed in `LOOKS` (`lib/editor/looks.ts`).
- **Headings:** block headings are `<h2>`; an item's title under a heading is `<h3>`, else `<h2>`,
  as people's names are.

## Goals / Non-Goals

**Goals:**
- One block for section tiles, awards and capabilities, with a link per card.
- Links to projects and services with pages, so tiles can lead to the work itself.

**Non-Goals:**
- Cards from a collection, icons, carousels, and a third look (horizontal cards).

## Decisions

### 1. Node types, no format change

```
cards  heading, layout: "below" | "over" (default "below"),
       items: node_array<card> (1–12)
card   image: node_array<image> (≤ 1), title (text, one line), text (text, marks, newlines),
       target_id: string (""), url: string ("")
```

- **`target_id`, not `page_id`:** it names a page or an item (service or project), so its name
  says it isn't always a page. It's resolved through `routes`, which hold both.
- New types only: documents without cards are unchanged and stay at format 10, as figures and
  steps did.
- `layout` joins `LOOKS`, with the names "Text under the photo" and "Title over the photo".

### 2. Validation

In `domain.ts`, per page: cards count 1–12 (`too-many-items` / `empty-block` as an error), a
title per card (`empty-title`, "Card 2 on Úvod needs a title"), both `target_id` and `url`
(`invalid-value`), `url` through `checkHref` (`unsafe-link`), and `target_id` that is neither a
page of the site nor an item with a page (`broken-card-link`, a new warning code, "The link of
card 2 on Úvod leads to something that no longer has a page").

### 3. Rendering

```html
<section class="block cards cards-over">          <!-- cards-below for the default -->
  <div class="container">
    <h2>Projekty</h2>
    <ul class="card-list cards-cols-4">
      <li class="card">
        <img class="card-image" … loading="lazy">
        <h3 class="card-title"><a href="/vystavy/">Výstavy</a></h3>
        <p class="card-text">…</p>
      </li>
    </ul>
  </div>
</section>
```

- **Whole-card link:** the title's `<a>` gets `::after { position: absolute; inset: 0 }` over the
  card (`position: relative`), so there is one link with the title as its name, and text links
  inside the card text stay clickable above it (`position: relative; z-index: 1`).
- **`over`:** the card is a grid; the image and the title share the first cell (the title
  aligned to the bottom on the shade, as the full-photo hero does), the text sits under it.
- **Columns:** `figureColumns(count)`, shared with key figures (its comment says so), with the
  same container query; `IMAGE_SIZES.card` follows the widest case of the column count.
- Styles from theme values only, no comments, `aspect-ratio: 4 / 3` images with `object-fit:
  cover`.

### 4. Editor

- **Canvas:** `nodes/Cards.svelte` (heading, the list with the look's class) and
  `nodes/Card.svelte` (`ImageSlot`, title and text as `TextProperty`). `ITEM_TYPES` gains `card`,
  `ITEM_LISTS.items` gains `cards`, and `itemInsertionPoint` learns `cards`, with a maximum of
  twelve and a minimum of one (like figures' six, and `isFixedList`-style minimum for delete).
- **Inserter:** `insertCards`: empty heading, `layout: "below"`, three empty cards, caret in the
  first title. Picker drawing: three cards with photos, title bars and text lines.
- **Card panel** (`CardPanel.svelte`, beside the block panel): shown for the card holding the
  caret or selected, with radio choices and a page `<select>`, an item `<select>` (services and
  projects with pages, grouped), and an address field using `checkLinkAddress`; `setCardLink`
  (one transaction). The logo's link panel stays as it is.
- **Look:** `cards` in `LOOKS`, so the existing "Look" fieldset shows it.

### 5. Builder and examples

`blocks.cards({ heading?, look?: "below" | "over", items: { image?, title, text?, page?, item?,
url? }[] })`, `item` naming a project or service by the ID the builder returned. Locally:
Scénografie's home gets category and workshop tiles (`over`, linking to their pages) instead of
its galleries, its About page the awards and capabilities as cards (`below`); Punk Film's home
gets its three sections as tiles linking to Work.

## Risks / Trade-offs

- **[Whole-card links and selection]** A stretched link makes the card's text hard to select. →
  Text links stay above it; selecting card text is rare on a business site.
- **[Twelve as a limit]** comes from the examples (eight capabilities, seven awards); a template
  wanting more can raise it.
- **[Links to items that lose their page]** Turning item pages off leaves cards linking nowhere.
  → A warning, the card renders without a link, and the Card panel says so.

## Migration Plan

None: new node types only.

## Changes made while building

- **The title's shade in the `over` look is rounded with `clip-path`**, since the stylesheet may
  only take radii from the theme as a whole value (`border-radius: var(--radius)`).
- **The Card panel's selects** are found by role in the tests; their labels repeat the radio
  choices' words.
- **Card limits** live in `cardLimit` (`structure.ts`), which the handle menu uses for the
  disabled Duplicate and Delete entries and their reasons.
- **The picker test** counts sixteen blocks now (cards after projects).
