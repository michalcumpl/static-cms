# Design

## Context

See proposal.md for the motivation. These decisions were made while exploring the change:
- business facts live once, as structured data on the site node;
- weekly hours with breaks and a note, without dated exceptions;
- a map link only;
- contact details in the footer, on by default;
- call to action and testimonials as a separate change.

The current state that shapes the approach:
- **Document and schema.** The document is the only input to rendering (`packages/site`). Its schema is Svedit's: properties are `string`, `integer`, `boolean`, `text`, a `node` reference or a `node_array`. There are no free-form arrays or objects, so nested data has to be nodes, as the theme is (a `block`-kind node referenced from the site). `SCHEMA_VERSION` is 3, and `migrateSite` chains 1 → 2 → 3.
- **Rendering.** Blocks render in `render/blocks.ts`. The page shell (header, `main`, footer) is shared by pages and the not-found page through `renderDocument` in `render/page.ts`. JSON-LD is built in `render/head.ts`. Text the renderer writes itself comes from `render/strings.ts` (Czech, and English as the fallback).
- **The editor.**
  - The canvas renders blocks with Svelte components (`lib/editor/nodes/*.svelte`). `Site.svelte` draws the header and a footer with only `© name`.
  - The settings column has Page and Site tabs (`editor.settingsTab`).
  - `ImagePanel` shows options for the selected image.
  - Inserting blocks goes through `BLOCK_LABELS`, `availableBlocks` and `insertBlock` (`structure.ts`, `transforms.ts`).
  - `settingsTarget` in `locate.ts` sends problems to settings fields.
- **The demo site** keeps its contact facts as rich text. This change doesn't convert it, because the snapshots and walkthroughs rely on it as it is.

## Goals / Non-Goals

**Goals:**
- One source for each fact. The blocks, the footer and the JSON-LD only read it.
- Data, not text, where the fact doesn't depend on language (phone, times, address parts, country, type), so Milestone 5 can copy it between language documents unchanged.
- The canvas shows exactly what will be published, from the same rendering code.

**Non-Goals:**
- Phone number validation per country beyond the international form, and a phone library.
- Translating the address or business name. They're stored as the owner types them.
- Converting existing free-text contact pages.

## Decisions

### 1. Nodes: `business`, `opening_day`, `time_range`

```
site ─ business: node ──> business (kind "block")
                            name, street, postal_code, city, country: string
                            phone, email, map_url: string
                            business_type: string (one of 10 values, default "LocalBusiness")
                            hours_note: string
                            show_in_footer: boolean (default true)
                            days: node_array<opening_day>       exactly 7, Monday first
                                    opening_day: day ("mon".."sun"), ranges: node_array<time_range>
                                                                  time_range: opens, closes ("HH:MM")
```

**Why seven fixed day nodes,** rather than rows of "days + ranges" that owners compose:
- every day has one place;
- the editor is a plain week;
- grouping "Po–Pá" is a rendering concern, computed from equal days;
- validation can name the day.

The order and the day values are validated, so a document can't hold two Mondays.

*Alternative:* store the hours as one encoded string, like `Mo-Fr 06:00-17:00`. It's compact, but the editor would parse and write a mini-language, and validation would report positions in a string.

**The type of business** is a `string` with `values`, as `image_side` is, so the schema rejects unknown types. The editor shows each type under an owner-facing name. The ten types are common small-business types:

| Type | Shown to owners as |
|---|---|
| `LocalBusiness` | Other local business |
| `Bakery` | Bakery |
| `CafeOrCoffeeShop` | Café |
| `Restaurant` | Restaurant |
| `Store` | Shop |
| `HairSalon` | Hairdresser |
| `BeautySalon` | Beauty salon |
| `ProfessionalService` | Professional services |
| `MedicalBusiness` | Medical practice |
| `SportsActivityLocation` | Sports and fitness |

**The `contact` block** has `heading: text` and four booleans: `show_address`, `show_phone`, `show_email` and `show_map`. **The `opening_hours` block** has `heading: text`. Neither holds facts.

### 2. Format 4 migration

`toVersion4` adds a `business` node and seven `opening_day` nodes, and sets `site.business` and `schema_version: 4`. The IDs are `business_1` and `day_mon` … `day_sun`, with a numeric suffix when an ID is taken. (A bare `business` would be a node ID that is also a word in owner-facing messages, which the owners'-words test forbids.) That keeps them readable in fixtures and deterministic, so migrating the same document twice gives the same result. The admin's new-project starter and every fixture are upgraded, as in format 3.

### 3. One renderer for the site and the canvas

`packages/site` gets `render/business.ts` with pure functions that return `Html`:
- `contactDetails(business, strings, show)`;
- `openingHoursTable(business, strings)`;
- `footerDetails(ctx)`;
- the helpers `formatPhone`, `formatTime`, `groupDays` and `mapLink`.

`renderBlock` uses the first two for the new blocks, and `renderDocument` uses `footerDetails`.

The canvas components (`nodes/Contact.svelte`, `nodes/OpeningHours.svelte`, and the footer in `Site.svelte`) render the editable heading with Svedit. The details come from the same functions, exported from `@static-cms/site` and inserted with `{@html}`. The output is escaped by the same `html` template, so this is safe.

The canvas and the published site can't drift apart, and the footer on the canvas follows the Business tab as the owner types, because the components derive from `session.doc`.

*Alternative:* re-implement the markup in Svelte. That's two copies of the grouping and formatting rules, and they would diverge.

### 4. Formatting rules

- **Phone:** `+420` and `+421` with nine digits group as `+420 321 123 456`; anything else shows as stored. The `tel:` link always uses the stored number.
- **Times:** `06:00` shows as `6:00`, and ranges are joined with an en dash.
- **Day groups:** consecutive days with identical ranges, closed days included, are grouped. A single day shows alone, and a run shows "first–last". There's no wrap-around from Sunday to Monday.
- **Map link:** the map address, or a Google Maps "Maps URLs" search (`https://www.google.com/maps/search/?api=1&query=…`), which needs no API key. The query is "street, postal code city, country", with empty parts left out.
- **Strings:** `render/strings.ts` gains day abbreviations, "closed", "Show on map" and the labels the footer needs, in Czech and English. Other languages use English, as the 404 page does.

### 5. Structured data

`head.ts` builds the organization entry from the business details:
- it stays `Organization` until there is a street, a city or a phone;
- then it becomes the chosen type, with the address, phone, email and opening hours.

It keeps the `@id` `<url>#organization`, so the `WebSite`'s `publisher` link stays valid.

`openingHoursSpecification` groups by distinct range: each unique `opens`–`closes` pair lists the days that have it. That's the compact form search engines document. A day with a lunch break appears in two entries.

### 6. Validation

New codes, in category `site`:
- `invalid-phone`, `invalid-email`, `invalid-map-url` and `invalid-country` (errors);
- `invalid-hours` (error: closes before it opens, or overlaps, naming the day);
- `nothing-to-show` (warning, for a business block).

Times that aren't `HH:MM` are `invalid-value`, like other malformed properties. The seven-days rule (count, order and unique days) is checked in the domain rules and reported as `invalid-value` on the business node. Messages use the Business tab's words ("the phone number", "Tuesday's hours").

The phone rule is international form only, `^\+[1-9][0-9]{6,14}$`. The editor normalises what owners type (decision 7), so the error only appears for numbers the editor couldn't normalise, or for documents edited elsewhere.

### 7. Editor

- **The Business tab** is a third tab, `editor.settingsTab = "business"`. The Site tab is already long, and these are the facts owners update most, so they get their own tab.
- **`BusinessSettings.svelte`** has the fields, the type `<select>`, the footer switch and `OpeningHoursEditor.svelte`.
  - Each day is a row: the day name, its ranges as `<input type="time">` pairs (opening and closing), "Add range" and "Remove" buttons, and "Closed" when it has none.
  - Monday's row has "Copy to Tue–Fri".
- **Operations** go in `lib/editor/business.ts`, one transaction each, with text fields batched while typing:
  - `setBusinessField`;
  - `setPhone`, which normalises the number when the owner leaves the field;
  - `addRange` and `removeRange`;
  - `setRangeTime`, which applies a time when its field changes;
  - `copyMondayToWeekdays`, one step that replaces Tuesday to Friday's range nodes.
- **Phone normalisation:**
  1. remove spaces, dashes, dots and brackets;
  2. replace a leading `00` with `+`;
  3. a number without `+` and with nine digits gets the country's code (CZ `+420`, SK `+421`), when the country has one.

  Anything else stays as typed and is reported by validation.
- **The canvas** (decision 3):
  - Each block shows "Edit business details", a link that switches to the Business tab.
  - The contact block's switches are in `BlockPanel.svelte`, shown when a contact block is selected, as `ImagePanel` is shown for an image.
  - The inserter gets "Contact" and "Hours", with placeholder headings "Kontakt" and "Otevírací doba" on Czech sites, from the strings table.
  - With nine block types, the top bar got too crowded. The block buttons moved from the toolbar to an "Add block" section in the left column, below the pages (`BlockInserter.svelte`). They still insert after the block with the cursor, or at the end of the page. The item actions (add item, move, delete) stay in the toolbar.
- **`locate.ts`:** `settingsTarget` gains a `business` tab. The business node's properties lead to their fields, and `opening_day` and `time_range` nodes lead to the day's first time field.

*Alternative:* a section of the Site tab, as first discussed in exploration. A separate tab was chosen for the reasons above, and it doesn't change the behaviour the specs describe.

### 8. CSS

The theme stylesheet gets rules for:
- `.contact address` (no italics, spaced lines);
- `.opening-hours table` (two columns, day names in the heading font, no borders);
- `.site-footer address` and `.site-footer table` (smaller, two columns from 48rem).

These follow the theme's colours and fonts like other blocks.

### 9. Tests

- **`packages/site`:**
  - migration 3 → 4 (and 1 → 4), and that IDs don't collide;
  - validation codes, and the owners'-words test with the new messages;
  - formatting helpers (phone, time, grouping including lunch breaks and closed runs, map link encoding);
  - the contact and hours blocks;
  - the footer (on, off, empty);
  - JSON-LD (Organization while empty, Bakery with hours);
  - `html-validate` on a page with both blocks and the footer;
  - updated snapshots.
- **`apps/admin`:**
  - business operations and phone normalisation;
  - undo for "copy Monday";
  - `locate` targets.
- **e2e:**
  - fill in the business details and hours in the Business tab, and see the canvas block and footer follow;
  - insert a contact block and toggle the phone off;
  - an overlap problem focuses Wednesday;
  - publish to the fake Netlify, and the home page has the `LocalBusiness` JSON-LD.

## Risks / Trade-offs

- **[A lunch break doubles the JSON-LD entries]** Some days appear twice in `openingHoursSpecification`. → This is the documented way to express split hours.
- **[The footer grows on every page]** The hours table in the footer is tall on phones. → It's compact (abbreviated days, grouped), it can be switched off, and it shows only filled-in facts.
- **[Google Maps search may land on the wrong place]** for unusual addresses. → The map address field overrides it, and the Business tab's hint suggests pasting the business's own listing.
- **[Fixed seven days]** Several locations per business, or different weekly schedules (summer and winter), aren't possible. → They're out of scope. The note covers seasonal hours for now.
- **[Format 4 is forward-only]** It's the same trade-off as formats 2 and 3, documented in the README.

## Migration Plan

1. Deploy: documents upgrade to version 4 when read. No database migration is needed.
2. Existing sites look the same until the owner fills in the Business tab. The footer only changes once there are details.
3. Rollback needs the pre-upgrade backup for projects saved since, as before.
