# Tasks

## 1. Document format 4 in `packages/site`

- [x] 1.1 Add the `business`, `opening_day` and `time_range` node types and the site's `business` reference, and the `contact` and `opening_hours` block types, to the schema and types (design.md decision 1). Set `SCHEMA_VERSION` to 4 and add `toVersion4` to the migration chain (decision 2). Verify with unit tests for "Upgrade a version-3 site", "Upgrade a version-2 site" and "Upgrade a two-page site" (now version 4), "Already upgraded", "Unsupported schema version" (version 3), and IDs that don't collide with existing nodes.
- [x] 1.2 Upgrade the fixtures (demo, image blocks, starter), the e2e fixture documents and the admin's starter to version 4, keeping a version-3 copy of the demo for migration tests. Verify that both packages' test suites pass.
- [x] 1.3 Add validation (decision 6) for the business fields, the seven days, the times and ranges, and business blocks with nothing to show. Verify with unit tests for "Valid business details", "Phone with spaces", "Map address over plain HTTP", "Empty business details", "Lunch break", "Closing before opening", "Overlapping ranges", "Invalid time", "Business blocks" and "Contact block before the details are filled in", and extend the owners'-words test.

## 2. Rendering in `packages/site`

- [x] 2.1 Add `render/business.ts` with the formatting helpers, the contact details and the opening hours table, plus the new site strings (decisions 3 and 4). Export what the canvas needs. Verify with unit tests for the phone formats, times, day grouping (weekdays, lunch break, closed runs, all closed), map links (generated and given), and the "Contact block", "Map address given", "Weekdays grouped", "Lunch break" and "Only a note" scenarios.
- [x] 2.2 Render the `contact` and `opening_hours` blocks, and the footer details in `renderDocument`, with CSS (decision 8). Verify with unit tests for "Phone hidden", "Footer with details", "Switch off" and "Nothing filled in" (the not-found page included), `html-validate` on a page with both blocks and the footer, and updated snapshots.
- [x] 2.3 Build the organization entry from the business details in `head.ts` (decision 5). Verify with unit tests for "Home page structured data" (still `Organization` while empty), "A bakery with opening hours", a lunch break producing two entries for that day, and `hasMap`.

## 3. Editor

- [x] 3.1 Add business operations in `lib/editor/business.ts`, with phone normalisation (decision 7). Verify with unit tests: each field, "Normalise the phone" (and `00420…`, `+421…`, a number that can't be normalised), adding and removing ranges, "Copy Monday to the weekdays" as one undo step, and an inserted contact or hours block's placeholder content.
- [x] 3.2 Add the Business tab (`BusinessSettings.svelte`, `OpeningHoursEditor.svelte`), the canvas components for the two blocks and the footer, the "Edit business details" link, the contact block's switches panel, and the inserter buttons. Verify with e2e tests for "Insert a contact block", "Lunch break", "Details follow the Business tab" and "Edit details from the block", and toggling the phone off.
- [x] 3.3 Extend `settingsTarget` and the problems panel for the business tab. Verify with unit tests for each business field and for a day's hours, and an e2e test for "Overlap problem".

## 4. End to end and docs

- [x] 4.1 e2e: fill in the business details and hours, save, and publish to the fake Netlify. The deployed home page has the `LocalBusiness` (or chosen type) JSON-LD and the footer details, and the preview shows the contact block.
- [x] 4.2 Update the roadmap (Milestone 3: business details, contact and opening hours blocks done; call to action and testimonials next) and the README (document format 4, and the map link's privacy). Verify by reading both.
- [x] 4.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [x] 4.4 Manual check by the owner: fill in a real business in the Business tab, publish, and check the contact block, footer and map link on a phone. Optionally run the published home page through Google's Rich Results Test. Record the outcome in design.md.
