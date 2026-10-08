# Design

## Context

See proposal.md for the motivation. The current state:

- **Schema:** `hero`, `services`, `team` and `gallery` are node types in
  `packages/model/src/schema/schema.ts`; `services` and `team` share `COLLECTION_BLOCK` with
  `testimonials` and `faq`. The generic validator checks every declared property, so a property
  missing from an older document is an error: new properties on existing types need a format
  upgrade (as `translation_key` did in format 5).
- **Format:** version 8. `migrateSite` upgrades step by step (`toVersion2` … `toVersion8`); the
  admin upgrades stored documents when it reads them and stores them on the next save (the
  startup job only covers documents below version 7). Fixtures: `demo-site.json`,
  `starter-site.json` and `image-blocks-site.json` are current; `demo-site-v1.json` …
  `demo-site-v7.json` feed the upgrade tests.
- **Rendering** (`packages/render/src/blocks.ts`): the hero is `.hero-inner` with the content
  and the image side by side (`IMAGE_SIZES.hero` = 40vw on wide screens); services are cards in
  `.services-list`; the team is centred cards with round portraits; the gallery crops images in a
  grid. The stylesheet takes every colour, font and radius from theme properties (tested) and
  has no comments.
- **Editor:** `BlockPanel.svelte` holds the selected block's settings (a collection block's
  mode and chosen items, a contact block's switches, a business block's location). Canvas
  components (`nodes/Hero.svelte`, `Services.svelte`, `Team.svelte`, `Gallery.svelte`) reuse the
  site's classes, so the canvas looks like the page.

## Goals / Non-Goals

**Goals:**
- Each variant is a value on the block, so templates can later set defaults and owners can
  override them, without new node types.
- The defaults render byte for byte as today; upgraded sites don't change.

**Non-Goals:**
- Template defaults (with `template-system`), more variants, a video hero, a hero carousel.
- Per-item variants (one service open, another closed).

## Decisions

### 1. Properties and format 9

```
hero      layout:    "beside" | "cover"            default "beside"
services  layout:    "cards" | "list" | "accordion" default "cards"
team      layout:    "cards" | "list"              default "cards"
gallery   image_fit: "fill" | "whole"              default "fill"
```

- `services` and `team` get their own `layout` next to the shared `COLLECTION_BLOCK` properties;
  `testimonials` and `faq` stay as they are.
- **`toVersion9`** adds the defaults to every such block and sets `schema_version: 9`. The
  current fixtures move to 9 (with the four properties); a copy of today's demo stays as
  `demo-site-v8.json` for the upgrade test, as for earlier versions.
- **Validation:** the schema's `values` lists make unknown values an `invalid-value` error; a
  `cover` hero without an image is a new `cover-without-image` warning ("The hero on "Úvod" shows
  its text beside the photo until it has one.").
- **Languages:** the choices belong to the page, like the rest of its blocks, so each language
  can differ; copying a page copies them.

### 2. Rendering

- **Hero `cover`:** `<section class="block hero hero-cover">` with the image first
  (`class="hero-image"`, `sizes="100vw"`, not lazy) and `.hero-inner` over it. CSS: the section
  is a grid of one cell; image and content share it; the image covers the cell with
  `object-fit: cover` and a minimum height; the content sits on a shade,
  `color-mix(in srgb, var(--color-text) 62%, transparent)`, with the text in
  `var(--color-background)`. Colours come from the theme, as the stylesheet test requires, and
  the pair already passes the contrast check. Without an image the hero renders as `beside`.
- **Services `list`:** `.services-list.services-as-list`: one column, each `.service` a row
  without a border, the name and price on one line (flex, price right), the description under
  them.
- **Services `accordion`:** `.services-as-accordion`: each service with a description is
  `<li class="service"><details><summary><span class="service-name">…</span><span
  class="service-price">…</span></summary><p class="service-description">…</p></details></li>`,
  styled like the FAQ; one without a description is the same row without `<details>`.
- **Team `list`:** `.team-list.team-as-list`: one column, each `.person` a row with the name
  (same heading level as today), the role and the text, left-aligned; portraits aren't rendered,
  so they aren't downloaded.
- **Gallery `whole`:** `.gallery-grid.gallery-whole`: the cell keeps its shape, the image uses
  `object-fit: contain` on `var(--color-secondary)`.
- `html-validate` on a page with every variant; the default variants' snapshot unchanged except
  for the stylesheet.

### 3. Editor

- **`setBlockLook(session, blockId, property, value)`** in `lib/editor/structure.ts` (or beside
  `setBlockMode`): one transaction, one undo step.
- **`BlockPanel.svelte`** gains a "Look" fieldset for the selected (or caret-holding) hero,
  services, team or gallery block: radio buttons with the names from the spec, and for a cover
  hero without an image the hint "Add a photo to the hero; until then the text shows beside
  it." It sits above the collection mode.
- **Canvas components** add the variant classes. On the canvas:
  - a `cover` hero keeps `ImageSlot` (the photo is chosen as before) behind the editable text;
  - an accordion shows each description open, in the same row style, so it can be edited;
  - the team list hides `ImageSlot`, as the page hides portraits.
- **Inserters** create blocks with the default values; duplicating copies the choice.

### 4. Builder and examples

The builder takes `layout` on `blocks.hero`, `blocks.services` and `blocks.team`, and
`imageFit` on `blocks.gallery`, writing the defaults otherwise, and writes format 9. Locally,
the examples are rebuilt with: a full-photo hero for Aniděti, Mortgage Specialist and Roubenka;
Mareš Partners' team as a list and its practice areas as an accordion; Mortgage Specialist's
review screenshots as whole images. Then they are reloaded and screenshotted.

## Risks / Trade-offs

- **[Text over photos]** A busy or light photo under a light theme could hurt legibility. → The
  shade is strong (62% of the text colour); the warning-free path still needs a human look, so
  the examples are checked by eye. Lighthouse doesn't measure text over images.
- **[A dark theme]** inverts the shade (light text colour → light shade, dark text); the pair
  still meets the theme contrast rule. → Checked on Fond 10X's dark design if it uses a cover hero.
- **[Format bump]** Every stored document upgrades on read; the first save stores version 9.
  → Same as format 8; upgrade test on the version-8 fixture.

## Migration Plan

Format 9 upgrade on read (decision 1). Nothing to run; pages look the same until an owner
chooses a variant.

## Changes made while building

- **`setBlockLook`** lives in its own module, `lib/editor/looks.ts`, with `selectedLookBlock` (the
  panel's view of the selected block) and the `LOOKS` table, instead of `structure.ts`.
- **The shade** behind a full-photo hero's text is 72% of the text colour, not 62%: on the
  examples' bright photos (Roubenka's sky, Aniděti's garden) 62% left the white text weak.
- **The accordion row** keeps the browser's disclosure marker: the summary isn't a flex row; the
  price floats to the right of the name instead.
- **The hero image's rounded corners** apply only outside the full-photo look
  (`.hero:not(.hero-cover) .hero-image`), since the stylesheet may not use literal radii to
  remove them.
- **The team list** on wide screens puts the name, role and text in fixed columns, so a person
  without a role keeps their text in its column.
- **The hint** reads "Add a photo to the hero; until then the text shows as usual.", matching the
  warning: without a photo there is nothing for the text to be beside.
- **On the canvas** a full-photo hero wraps its image slot in a `.hero-image` element, so the
  site's grid places it behind the text.
