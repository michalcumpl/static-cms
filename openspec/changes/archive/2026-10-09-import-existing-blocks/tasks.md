# Tasks

## 1. Fixtures

- [x] 1.1 Add to the bakery: opening hours in a table on `kontakt.html` (Monday to Saturday, matching its structured hours), three key figures on `o-nas/`, and "Jak to funguje" with an ordered list of three bold-titled steps on `nase-pecivo/`; add a new invented fixture `agency/` (a small Czech travel agency, `https://cestovka-vlna.example`): a home page with a grid of six article cards (photo, linked heading, sentence; four linking to pages of the fixture, two to pages not served), a Lodgify booking iframe under "Rezervace", a Google map embed with `q=` on its contact page, and three award logos with names in its footer. Describe both in `fixtures/README.md`; verify the existing fixture tests still pass

## 2. Recognising structures (`@webmio/import`)

- [x] 2.1 Add `detect(el)` in `blocks.ts`, called before the walk descends, with the structured item kinds and their pass-through in `assemble` (a heading directly before becomes the block's heading); verify a blocks test that a recognised element's contents produce no other items
- [x] 2.2 Cards (design decision 2): signature, one image, a title, short text, links through the link context, split at 12; verify "A grid of cards", "Cards linking to pages not imported", a story with three photos and subheadings staying text with images, and a 14-card grid making two blocks
- [x] 2.3 Key figures (design decision 3) and steps (design decision 4); verify "Key figures", seven figures staying text, "How it works" from an `<ol>` and from numbered headings, and steps without a heading staying text
- [x] 2.4 Opening hours (design decision 5) with `hoursKnown`; verify "Opening hours shown on the page" and "Opening hours without structured data", and a course timetable naming other days staying text
- [x] 2.5 Maps and booking (design decision 6) with the host list in `booking.ts`; verify "A map" (Google with `q=`, Google with `pb=` only, Mapy.cz), "A booking widget", a booking link button, and a script-only widget still left out

## 3. Blocks (`site.ts`)

- [x] 3.1 Map the new segments in `segmentBlocks` to `cards`, `figures`, `steps`, `opening_hours`, `contact` and `call_to_action` (the main location's ID passed in), set the location's `map_url` from a map embed when it has no address or link, and make `readPagesForRetry` map them too; verify site tests that each fixture page has the expected blocks and validates without errors, and a retry test reading the bakery's contact page (its map, and its hours only when the business has them)
- [x] 3.2 Footer logos on the home page (design decision 7); verify "Award logos in the footer" on the agency fixture, the site's logo and social icons left out of it, and the bakery's home unchanged
- [x] 3.3 Review the snapshots: the only one is the bakery's report (`site.test.ts`), which changes only by the map leaving "left out"; `fixtures.test.ts` has no snapshots, so it gains a check that the agency's pages parse, its images exist and two of its cards link to pages it doesn't serve

## 4. Documentation and integration

- [x] 4.1 Update `docs/import-mapping.md` (the "Blocks the examples call for" table: done for each block, and the "In code" table); the roadmap row turns Done when the change is archived; verify the links resolve
- [x] 4.2 Import the agency fixture end to end through the admin (`job.test.ts` against the fixture server: the cards, the call to action, the contact block and the footer logos in the saved project, and no left-out map or booking widget), and re-import marespartners.cz with the admin command to check its footer awards become a logos block; run `pnpm turbo run typecheck test build`, Biome and the admin's end-to-end tests, and verify everything passes
