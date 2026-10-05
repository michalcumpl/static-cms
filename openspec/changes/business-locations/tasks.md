# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Model (`packages/model`)

- [ ] 1.1 Change the schema and types for decisions 1 and 2:
  - the `location` node, `business.locations`, and the business without its contact and hours
    fields;
  - `location_id` on `contact` and `opening_hours`;
  - schema version 8.

  Verify with `schema.test.ts` and the type check.
- [ ] 1.2 Validation:
  - `checkBusiness` becomes per location, with the location named when there are several;
  - names required with two or more locations;
  - a business without locations is a structural error;
  - `missing-location` for blocks;
  - nothing-to-show per the block's locations.

  Verify with tests for every scenario of "Locations", "Location of a business block",
  "Business details", "Opening hours" and "Business blocks with nothing to show" in the
  site-document delta.
- [ ] 1.3 Implement `toVersion8` (decision 6), keep `demo-site-v7.json` as a fixture, and
  regenerate the demo, starter and image-blocks fixtures. Verify with `migrate.test.ts`
  ("Upgrade the bakery", deterministic IDs across two languages' documents, input not modified)
  and the existing render snapshots passing **unchanged**.
- [ ] 1.4 Extend `applySharedFields` (decision 5). Verify with `languages.test.ts`: "Second shop
  in English", a translated location name kept after the primary reorders its locations, and a
  dropped location resetting a block's choice.

## 2. Render (`packages/render`)

- [ ] 2.1 Refactor `businessInfo`, `contactDetails` and `openingHoursTable` to locations
  (decision 3). Render contact and opening hours blocks for one or several locations, and the
  footer's compact entries for several. Verify with the scenarios of "Business blocks for
  several locations" and "Footer contact details" (including "Two shops in the footer"),
  html-validate on a two-location page, and the demo snapshots unchanged.
- [ ] 2.2 Structured data for several locations (decision 4). Verify with "Two shops" and the
  existing structured data tests unchanged.

## 3. Admin (`apps/admin`)

- [ ] 3.1 Location operations in `business.ts` (decision 7), including `removeLocation`
  resetting the blocks that chose it in one transaction. Verify with unit tests: add, remove,
  move, a field per location, copy Monday within one location, and the reset undone in one
  step.
- [ ] 3.2 `LocationSettings.svelte` and the business settings with the list of locations, the
  main-location mark, "Add a location", remove (with "Shown on …" when blocks chose it) and
  move. Fields are read-only outside the primary language, except each location's name and
  hours note. Verify with e2e tests "Add a second shop", "Remove a chosen location", and "Phone
  in English" and the other existing settings tests updated.
- [ ] 3.3 Problems lead to a location's field (`locate.ts`, `businessFieldElementId` with a
  location). Verify with `locate.test.ts` cases for a branch's phone and a branch's Monday
  hours.
- [ ] 3.4 The block panel's location choice (decision 8), and the canvas blocks and footer
  through `business-view.ts`. Verify with the e2e test "Choose a shop" and "Details follow the
  settings" still passing.
- [ ] 3.5 Update the existing unit and e2e tests that read the business's address, phone or
  hours (`business.svelte.test.ts`, `settings.spec.ts`, `business.spec.ts`, …). Verify with
  the full admin unit suite and the Playwright suite.

## 4. Integration

- [ ] 4.1 On a copy of the local database, render every project's pages with `main` and with
  this branch, as for format 7, and diff them. Verify that they are identical, and record the
  result in the design.
- [ ] 4.2 Update `docs/roadmap.md` (milestone A: locations done, next change) and the model and
  render READMEs. Verify by reading.
