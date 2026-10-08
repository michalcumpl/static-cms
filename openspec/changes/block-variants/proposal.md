# Proposal

## Why

The example sites showed four blocks whose single look doesn't fit every business
(`docs/layouts.md`, "What the examples lack", items 2 and the design notes):

- **Hero:** four of five examples open with a full-width photo and the text over it; ours always
  puts the text beside a smaller photo.
- **Team:** Mareš Partners (no portraits) and Fond 10X (one portrait of four) look sparse or uneven
  as centred cards; law and finance want a compact list of names, roles and contacts.
- **Services:** eight practice areas with long scope lists make very tall cards; many or long
  services read better as a list or as an accordion.
- **Gallery:** it crops every image to one shape, so screenshots, diagrams and logos lose their
  edges.

The templates (`template-system`) will choose these per template; they need the variants to
exist first (`docs/roadmap.md`, row 6c).

## What Changes

- **Hero layout:** "Beside" (today's: text next to the photo) or **"Full photo"** (the photo fills
  the band, the text over it on a shade from the theme's colours). Without a photo a full-photo
  hero shows as "Beside", with a warning.
- **Services layout:** "Cards" (today's), **"List"** (one row per service: name and price, the
  description under them) or **"Accordion"** (one row per service, opening to its description).
- **Team layout:** "Cards" (today's: portraits, centred) or **"List"** (compact rows: name, role
  and text; no portraits).
- **Gallery images:** "Fill" (today's: cropped to one shape) or **"Whole image"** (each image
  shown complete on a calm background).
- **In the editor:** the block panel offers the choice for a selected hero, services, team or
  gallery block; the canvas shows the chosen look; each change is one undo step.
- **Document format 9:** the four choices are stored on the blocks. Older documents upgrade on
  read with today's looks, so nothing changes until an owner chooses.
- **The builder** sets them, and the examples use them (locally): a full-photo hero for Aniděti,
  Mortgage Specialist and Roubenka; the team list for Mareš Partners; services as an accordion for
  Mareš's practice areas; whole images for Mortgage Specialist's review screenshots.

Templates choosing defaults, and more variants, come with `template-system`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: format 9 with the four choices, and the upgrade from version 8.
- `site-rendering`: how each variant renders.
- `site-editing`: choosing a variant in the block panel.

## Impact

- **Model:** the properties in `schema.ts` and `types.ts`, `toVersion9` in `migrate.ts`, a
  version-8 fixture kept for the upgrade test, the fixtures moved to format 9, the hero warning,
  the builder.
- **Render:** the four blocks' markup and styles, image sizes for the full-photo hero, snapshots.
- **Admin:** `BlockPanel.svelte`, the canvas components of the four blocks, block operations,
  texts in both languages.
- **Tests:** model, render (`html-validate`), editor unit tests and e2e.
