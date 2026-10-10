# Design

## Context

`readPage` (`packages/import/src/blocks.ts`) walks a page's content area element by element into
flat items (heading, paragraph, list, image, video, faq, photo beside text), and `assemble` turns
runs of items into segments; `segmentBlocks` (`site.ts`) maps segments to blocks. Structure is lost
in the walk: a card is "a heading, then an image", which is why a grid of cards became one gallery
per card. The business (with hours from structured data only) is read before the pages, so its
hours and location are known when pages are read. A contact block's map is a "Show on map" link
(`mapLink` in `@webmio/render`), from the location's `map_url` or else its address; published sites
don't embed maps. Validation allows at most 12 cards, two to six key figures (an error over six), a
figure value of 24 characters (a warning beyond), and requires a steps block's heading.

## Goals / Non-Goals

**Goals:**
- Recognise structures on elements before their contents are walked, so the walk never sees them
  as loose headings and images.
- Prefer a false negative (plain text, as today) to a false positive: a wrong block is worse than
  a text block the owner can still convert.

**Non-Goals:**
- A general "repeated pattern" engine for any block; only the six structures below.
- Changing the content area: the footer stays outside it, read for logos only.

## Decisions

### 1. Structures are detected per element, before the walk descends

In `walk`, before the `switch` on the tag, `detect(el)` tries, in order: map embed, booking embed
or link, steps (an `<ol>`, or the element starting a run of numbered headings), opening hours,
key figures, cards. A match pushes one structured item (`kind: "cards" | "figures" | "steps" |
"hours" | "map" | "booking"`) and the walk skips the element's contents. `assemble` passes these
through as segments (flushing the text before them), and a heading directly before cards, figures,
steps or booking becomes that block's heading, as it already does for galleries.

*Alternative:* recognising patterns in the flat item list after the walk. Rejected: the list has
lost which items were siblings of one container, which is exactly what tells a grid from a story.

### 2. Cards: three or more siblings with the same signature

An element qualifies when at least three of its element children share a *signature*, the tag
name plus the class list without digits (`card card--3` → `card card--`), and each of those
children has exactly one content image (not an icon, by the existing size rule), a title (its first
heading, else the words of its first link) and at most 200 characters of other text. Children that
don't share the signature are walked as usual after the block. A card's link is the first link of
the child (or its own `href`), through the same `link` context as texts: an imported page becomes
`page`, an outside address `url`, an old-site page that wasn't imported nothing. Over 12 cards
split into blocks of 12; the heading goes on the first.

*Alternative:* any three images with headings in a section. Rejected: a story with three photos
and subheadings is not a grid; the shared signature is what a template-made grid has.

### 3. Key figures: short number-led values beside labels

An element with two to six element children, each made of exactly two text parts (two child
elements, or a `<strong>`/`<b>` and the rest), where one part matches a number-led value of at
most 24 characters (`^[~≈+−-]?\d[\d\s.,]*\s?(%|\+|[\p{L}€$]{1,6}\.?)?$` after trimming, e.g. "300M
CZK" or "40+") and the other is a label of at most 60 characters. Six is the validation limit, so
seven or more stays text.

### 4. Steps: a bold-titled ordered list, or numbered headings, under a heading

An `<ol>` of two or more items, each starting with `<strong>`/`<b>` (or a heading), becomes steps:
the bold part is the title, the rest the text. Two or more consecutive headings of one level whose
words start `1.`/`1)` … in order become steps, each step's text being what follows its heading up
to the next. Both need the heading before them (validation requires one); without it they stay
text. The numbers are dropped from titles: the steps block numbers them.

### 5. Opening hours only with structured hours

An element (`table`, `ul`, `ol`, `dl` or a container of short lines) whose text names three or
more weekdays (Czech and English, full and short: `Po`, `Út`, `pondělí`, `Mon`, `Monday`) and
contains a time (`\d{1,2}[:.]\d{2}`) is a schedule. `readPage` gets `hoursKnown` from `readSite`
(true when the business has hours): then the schedule becomes an `opening_hours` block of the main
location; otherwise it is walked as before and stays text. Parsing hours from text is a later
change; the spec's "structured data only" stays.

### 6. Maps and booking are recognised by their addresses

A map is an `<iframe>` whose `src` is Google Maps (`google.*/maps`, `maps.google.*`) or Mapy.cz
(`mapy.cz`, `frame.mapy.cz`). It becomes a contact block of the main location showing the address,
phone, email and map link. When the location has neither a street, a city nor a `map_url`, the
embed's place becomes `map_url`: a Google embed's `q` parameter as
`https://www.google.com/maps/search/?api=1&query=…`, a Mapy.cz embed's `x`/`y` as
`https://mapy.cz/?x=…&y=…&z=17`; an embed naming no readable place (Google's `pb=` only) adds no
link.

A booking service is recognised from a list of hosts in `booking.ts` (Lodgify, Booking.com,
Reservio, Bookio, Calendly, Reservanto, Noona, SimplyBook, Bookero, Previo, and Airbnb listings),
in an `<iframe>`'s `src`, a `<script>`'s `src` with a container next to it, or a link whose words
or class say booking (`rezerv`, `book`, `objedn`). It becomes a call to action: the heading before
it, else "Rezervace" (Czech) or "Book now"; one action labelled from the link's words, else
"Rezervovat" / "Book", leading to the booking page: the link's `href`, or the iframe's `src`
without its widget-only parameters. Scripts with nothing else (a widget that draws itself) still
need an address: without a link, they stay left out.

### 7. Footer logos on the home page

`readSite` reads the home page's `<footer>` (and `[class*=footer]`) for two or more images that
aren't the site's logo or social icons, each with a name: its `alt`, else the words beside it in
its parent. They become a logos block appended to the home page, linked when their parent link
was, through the existing image collector (role `content`, page `/`).

## Risks / Trade-offs

- [A grid of product photos with captions read as cards] → it would be read as a gallery today
  only without titles; with titles and links, cards are what the owner would have chosen.
- [A list of numbers that isn't key figures (prices, a phone list)] → the value pattern requires a
  short number-led value with a separate label in two to six siblings; prices with a currency
  match, so a row of three prices with names may become figures. Accepted: easy to convert back.
- [A schedule that isn't opening hours (a course timetable)] → only when the business has hours;
  the block then shows the real hours, which differ from the timetable. Mitigation: the schedule
  must also name at least three of the days the business's hours name.
- [Unknown booking services] → stay left out and reported, as today; the host list grows.

## Migration Plan

None: imports made before keep their documents; new imports use the new mapping.

## Implementation notes

- A booking widget under a heading and one sentence (the agency's "Rezervace" and "Termín zájezdu
  si zarezervujete…") takes both as the call to action's heading and text, instead of leaving them
  in a text block above a call to action that repeats the heading.
- Cards: every element child must share the signature (no "others walked after the block"),
  which is stricter and simpler; key figures also refuse an element with an image.
- Opening hours: the schedule must name three days the business's hours name (decision 5's
  mitigation), so `readPage` gets the days (`hoursDays`), not a flag.
- Footer logos are read from `<footer>` and from every `[class*=footer]` element together:
  Mareš's awards sit in `.a-footer` inside the article, with a copyright `<footer>` below. A logo
  is named by its `alt` first, then by the words beside it.
- `readPagesForRetry` takes the site's language and the main location's hours days, so a retried
  page maps the same structures.
- `fixtures.test.ts` has no snapshots; the only snapshot touched is the bakery's report, which
  loses the map from "left out".
