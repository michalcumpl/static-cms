# Proposal

## Why

The import turns most of a page into text, galleries and photos beside text, although Webmio has
blocks made for what small business sites show: grids of cards, key figures, numbered steps,
opening hours, a contact block with a map, and a call to action. A grid of three or four article
cards came out as one gallery per card, stacked one per row (found on vroomagazine.com, a stress
test); key figures and steps came out as bold text; a map and a booking widget were left out
although the site can show both. Owners then rebuild by hand what the import could have recognised.
These are mappings only: every target block exists, so the import gets better without a new block.

## What Changes

- **Cards:** a container of three or more siblings that repeat the same structure, each with one
  image, a title (a heading or a linked line) and at most a short text, becomes a cards block of up
  to 12 cards; a card links to the imported page it linked to, to an outside address as it did,
  and nowhere when it linked to an old-site page that wasn't imported. More than 12 become several
  blocks. This replaces the one-gallery-per-card result.
- **Key figures:** two to six siblings each made of a short number-led value ("300M CZK", "40+",
  "15 let") and a label become a key figures block.
- **Steps:** an ordered list whose items each start with a bold title, or a run of two or more
  headings numbered 1, 2, 3…, under a heading, become a steps block with that heading.
- **Opening hours:** a table or list naming three or more weekdays with times becomes an opening
  hours block when structured data gave the business its hours; without them it stays text (hours
  are still imported from structured data only).
- **Map:** a Google Maps (or Mapy.cz) embed becomes a contact block with the main location's
  address and its "Show on map" link (published sites link to maps rather than embed them); a
  location without an address takes the embed's place as its map link. It is no longer reported as
  left out.
- **Booking:** an embed or a link button of a known booking service (Lodgify, Booking.com, Reservio,
  Bookio, Calendly, Reservanto, and others in a list) becomes a call to action to that service,
  under the heading before it or "Rezervace" / "Book now"; it is no longer reported as left out.
- **Footer logos:** a row of two or more award or partner logos in the home page's footer (images
  with names, linked or not) becomes a logos block at the end of the home page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-import`: "Page content" maps cards, key figures, steps, opening hours, maps and booking
  widgets to Webmio's blocks, and reads logos in the home page's footer; maps and booking widgets
  are no longer left out.

## Impact

- `@webmio/import`: `blocks.ts` gains structure detection before the item walk (repeated
  siblings, figure pairs, numbered steps, weekday tables, map and booking embeds) and new segment
  kinds; `site.ts` maps them to `cards`, `figures`, `steps`, `opening_hours`, `contact` and
  `call_to_action` blocks, sets the location's map link, and reads the home footer's logos.
- Fixtures: the bakery gains visible opening hours, key figures and a steps list; a new invented
  fixture, a small travel agency, has a card grid, a booking widget and award logos in its footer.
- Admin: nothing changes; the review's "left out" no longer lists maps and booking widgets. No
  database or API change.
- Non-goals: parsing opening hours from text, services, team and testimonials (AI, site-import
  version 2), a block for mid-page banners (`banner-block`), and importing pages the cards link to
  beyond the 20-page limit.
