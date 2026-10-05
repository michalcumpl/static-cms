# Design

## Context

See proposal.md for the motivation. The current state:

- **Model (`packages/model`).** The `business` node holds:
  - the name and type;
  - the street, postal code, city and country;
  - the phone, email and map address;
  - `hours_note`, the footer switch and `social`;
  - `days`: seven `opening_day` nodes with `time_range` nodes.

  The `contact` block has four switches and `opening_hours` has only a heading; both read "the"
  business. Validation (`checkBusiness` in `validate/domain.ts`) and the nothing-to-show warning
  work on that one node. `applySharedFields` copies `SHARED_BUSINESS_FIELDS`, the days and the
  social profiles from the primary. `migrateSite` is at format 7.
- **Render (`packages/render`).** `businessInfo(nodes, businessId)` flattens the business into a
  `BusinessInfo` (the same fields, days resolved, `social`). `contactDetails(info, strings, …)`
  and `openingHoursTable(info, strings)` produce the markup for the blocks, the footer
  (`page.ts`, `footerDetails`) and, through `business-view.ts`, the editor's canvas.
  `organizationData` in `head.ts` builds the JSON-LD.
- **Admin.**
  - `BusinessSettings.svelte` edits the business's fields through `business.ts` operations
    (`setBusinessField`, `setPhone`, `addRange`, `copyMondayToWeekdays`, …), which all target
    the one business node.
  - `OpeningHoursEditor.svelte` edits its days.
  - `locate.ts` sends business problems to field IDs (`businessFieldElementId`).
  - `BlockPanel.svelte` shows the contact block's switches.
  - `Site.svelte` draws the footer.

## Goals / Non-Goals

**Goals:**
- One location looks and publishes exactly as today (byte-identical pages after the upgrade).
- A location is the same set of facts the business has today, so the existing rendering
  functions take a location instead of the business, with no new markup for the one-location
  case.

**Non-Goals:**
- Pages generated per location; per-location services or team; holiday exceptions.

## Decisions

### 1. `location` nodes on the business

`business.locations` is a `node_array` of `location` nodes. Each holds:
- `name`, `street`, `postal_code`, `city`, `country`, `phone`, `email` and `map_url`;
- `hours_note`;
- `days`: seven `opening_day` nodes, as the business has today.

These fields leave the business node, which keeps `name`, `business_type`, `show_in_footer` and
`social`. The first location is the main one. There is no separate flag, so reordering is the
only way to change it.

*Alternative:* keep the business's own address as the main location and add `branches` for the
others. That gives two code paths for the same facts in validation, rendering and settings, and
an awkward "make this branch the main one".

### 2. Blocks name a location by ID, or all

`contact` and `opening_hours` get `location_id: string`: `""` for all locations (the default),
or a location's node ID, like `page_link.page_id`. A dangling ID is a site error
(`missing-location`), not structural, so a save is never refused for it. Rendering skips a
dangling choice as if no location matched, and removing a location in the settings resets the
blocks that chose it (decision 7).

### 3. Rendering reuses the location functions

- `businessInfo` returns `{ name, business_type, show_in_footer, social, locations:
  LocationInfo[] }`, where `LocationInfo` has today's `BusinessInfo` contact and hours fields
  plus `name`.
- `contactDetails` and `openingHoursTable` take a `LocationInfo`, so their output for one
  location is byte-identical.
- A block with several locations to show wraps each location's output in a group headed by its
  name, one level below the block heading. The footer's compact entry for several locations is
  new markup (`footer-locations`), in `page.ts`.
- The editor's canvas uses the same functions through `business-view.ts`, so it keeps matching
  the published site.

### 4. Structured data

`organizationData` keeps today's code for one location, fed by that location, so the JSON-LD is
unchanged. For several, the organization is typed `Organization` (no address of its own), and
`locationsData` adds one entry per location with an address or phone:
- of the business's type;
- with `@id` `<site>#location-<n>` and the name "<business> – <location>";
- with the location's address, phone, email, `hasMap` and `openingHoursSpecification`, built by
  the same helper as today;
- with `parentOrganization: {"@id": "<site>#organization"}`.

Positions rather than node IDs keep the published `@id`s free of internal IDs.

### 5. Languages: facts from the primary, names and notes per language

`applySharedFields` treats locations like the collections:
- the list and order come from the primary;
- a location the other language has keeps its `name` and `hours_note`, and takes the primary's
  address, phone, email, map address, country and days (with their range nodes);
- a location it lacks is copied from the primary;
- locations only it has are dropped.

Blocks in the other language whose `location_id` names a dropped location are reset to `""`.

### 6. The upgrade (format 8) uses deterministic IDs

`toVersion8` creates the location as `location_1`, or the first free `location_1_<n>`. It moves
the address, contact, map, note and `days` from the business into it, and adds
`location_id: ""` to every contact and opening hours block. Every language's document is
upgraded separately, and the same input IDs give the same location ID, so a project's languages
keep pairing their locations without a project-level step (unlike format 7).

### 7. Settings: one panel per location, operations by location ID

- `business.ts` operations take the location's node ID: `setLocationField`, `setPhone`,
  `addRange`, `removeRange`, `setRangeTime`, `copyMondayToWeekdays`. New ones are
  `addLocation`, `removeLocation` and `moveLocation`.
- `removeLocation` also resets every block that chose the location, in the same transaction
  (one undo).
- `BusinessSettings.svelte` shows the business fields, then a `LocationSettings.svelte` per
  location (a fieldset headed by its name, or "Main location" while unnamed), each with the
  existing `OpeningHoursEditor`, which gets a location ID.
- Element IDs for problems become `businessFieldElementId(field, locationId?)`, so `locate.ts`
  can lead a location's problem to its field.
- Outside the primary language, each location's name and hours note stay editable; everything
  else is read-only.

### 8. Block panel

`BlockPanel.svelte` shows a "Location" select for a selected contact or opening hours block
when the business has two or more locations: "All locations", then each location by name.
Choosing sets `location_id` as one undoable step.

## Risks / Trade-offs

- **[Byte-identical output for one location]** → the existing render snapshot tests run on the
  upgraded fixtures unchanged, and a rehearsal on a copy of the local database compares every
  page before and after, as for format 7.
- **[Old versions restored from history]** → format-7 versions upgrade on read with the same
  deterministic location ID, so a restored version pairs with the other languages.
- **[A long settings page with several locations]** → each location's fieldset can be collapsed.
  The business control panel (milestone B) will give locations their own screen.

## Migration Plan

Ship the model, render and admin together; stored documents upgrade on read and are saved as
format 8 by the next save. No project-level upgrade is needed (decision 6). Rollback: the
previous release can't read format 8, so restore the database backup together with the release,
as for format 7.
