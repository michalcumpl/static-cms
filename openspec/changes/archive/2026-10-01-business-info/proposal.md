# Proposal

## Why

A small business's site exists mostly to answer four questions: where is it, how do I reach it, when is it open, and how do I get there. Today owners type the answers as free text into a text block (the demo's "Kontakt" page does exactly that). As a result:
- software can't read them: no `LocalBusiness` structured data for search engines and AI answers, no phone links;
- the same facts typed twice (on a page and in the footer) can disagree.

Storing the facts once, as data, fixes both. It also prepares Milestone 5: with one document per language, data that doesn't depend on language (the phone, the hours) stays identical across languages and can be kept in sync mechanically, instead of being retyped per language.

## What Changes

- **Business details, once per site.** A new **Business** tab in the editor's settings column edits them:
  - the business name (empty: the site name);
  - the address (street, postal code, city, country);
  - the phone and email;
  - an optional map address;
  - the type of business, from a short list of schema.org types;
  - the weekly opening hours, with a note.
- **Opening hours** are given for each day of the week:
  - a day has any number of time ranges, such as a lunch break, or none (closed);
  - one free-text note covers the rest ("Closed on public holidays").
  - Dated exceptions aren't part of this change.
- **Contact block.** It shows the address, the phone (as a `tel:` link), the email (as a `mailto:` link) and a "Show on map" link, under an optional heading. Each can be hidden per block. The map link is the owner's map address, or else a Google Maps search for the address. There is no embedded map, so nothing loads from third parties.
- **Opening hours block.** It shows the week as a table in the site's language, under an optional heading. Days with the same hours are grouped ("Po–Pá 6:00–17:00"), and the note goes below.
- **Footer.** The footer shows the filled-in contact details and hours on every page. A switch in the Business tab turns this off, and it's on by default.
- **Structured data.** When the business has an address or a phone, the home page's JSON-LD describes it as the chosen type (`LocalBusiness` by default) in place of `Organization`. It includes the address, phone, email and opening hours.
- **Validation.** The following are errors:
  - an invalid phone, email or map address;
  - a time range that ends before it starts;
  - overlapping ranges on one day.

  A contact or opening hours block with nothing to show is a warning.
- **Document format 4.** It adds the business details. Stored documents are upgraded with empty details, every day closed, and the footer switch on.

### Non-goals (this change)

- Call to action and testimonials blocks (the next change, `cta-and-testimonials`).
- Dated exceptions to the opening hours ("closed 24.–26. 12.").
- Embedded or static maps, and geographic coordinates.
- Several locations per site.
- "Open now" indicators, which would need JavaScript on a static site.

## Capabilities

### New Capabilities

None. The behaviour extends the document, rendering and editing capabilities.

### Modified Capabilities

- `site-document`:
  - the site's business details and their validation;
  - the contact and opening hours block types;
  - schema version 4 and its upgrade.
- `site-rendering`:
  - the contact and opening hours blocks;
  - the footer with contact details;
  - `LocalBusiness` structured data;
  - day names and labels in the site's language.
- `site-editing`:
  - the Business tab;
  - inserting the two new blocks;
  - problems about business details leading to their fields.

## Impact

- **`packages/site`:**
  - the `business`, `opening_day` and `time_range` node types;
  - the `contact` and `opening_hours` blocks;
  - schema version 4 and the migration from 3;
  - validation;
  - the renderers and footer;
  - more site strings (day names, "Closed", "Show on map");
  - `LocalBusiness` JSON-LD;
  - CSS;
  - tests and snapshots.
- **`apps/admin`:**
  - the Business tab (`BusinessSettings.svelte`) with an opening hours editor;
  - editor operations;
  - canvas components for the two blocks and the footer;
  - the block inserter;
  - `locate.ts` targets;
  - unit and e2e tests.
- **No new dependencies.**
- **Docs:** the roadmap (Milestone 3: business blocks, part 1) and a README note on document format 4.
