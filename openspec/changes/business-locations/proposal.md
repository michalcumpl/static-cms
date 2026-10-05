# Proposal

## Why

Many small businesses have more than one place: a bakery with two shops, a physiotherapist
working in two towns, a school with branches. Today the business has exactly one address, phone,
email and set of opening hours, so a second place can only be typed as text, outside the data.
That breaks the strategy's promise that the business's facts live once, as data (milestone A).
Templates (milestone C) and the business control panel (milestone B) both need locations as
data.

## What Changes

- **Locations on the business.** The business keeps its identity:
  - name, type of business and social profiles;
  - the footer switch.

  Its contact details and opening hours move into an ordered list of **locations**. Each
  location has:
  - a name ("Kolín – Lipová"), which may be empty while it is the only one;
  - street, postal code, city and country;
  - phone, email and map address;
  - the weekly opening hours and their note.

  The first location is the **main** one.
- **Contact and opening hours blocks choose a location:**
  - "all locations", the default, shows each location under its name;
  - "one location" shows just that one.

  With a single location, both look exactly as today.
- **Footer.** With one location, it is unchanged. With several, it shows each location
  compactly (name, address, phone, in columns), without opening hours.
- **Structured data:**
  - **one location:** the home page's organization stays as it is today, the business's type
    with its address, phone and hours;
  - **several locations:** the organization becomes an `Organization`, and each location becomes
    a `LocalBusiness` of the business's type, with its own address, phone and hours, and
    `parentOrganization` pointing at the organization.
- **Settings.** The business settings list the locations, each with its fields and opening
  hours, with buttons to add, remove and reorder them. "Copy Monday to Tuesday–Friday" works per
  location.
- **Languages.** Which locations exist, their order, and their addresses, phones, emails, map
  addresses and hours are shared from the primary language. A location's name and its hours
  note are translated.
- **Validation:**
  - location fields follow today's business rules, with messages that name the location when
    there are several ("Kolín – Lipová: Monday's hours close before they open");
  - with several locations, each needs a name;
  - a block pointing at a location that no longer exists is an error.
- **Document format 8.** The upgrade moves the business's contact details and hours into one
  location and gives contact and opening hours blocks the "all locations" choice. Every page
  publishes byte-for-byte as before.

### Non-goals

- **A page per location**, generated: templates (milestone C) decide that. Owners can add a page
  and put a contact block for one location on it.
- **Dated exceptions to opening hours** (holidays).
- **Coordinates or embedded maps.**
- **Choosing a location for the services, team or testimonials.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: business details split into identity and locations; opening hours per
  location; contact and opening hours blocks choose a location; nothing-to-show warnings per
  location; upgrade to format 8.
- `site-rendering`: contact details and opening hours for one or all locations; the footer with
  several locations; structured data with several locations.
- `site-editing`: the block panel's location choice for contact and opening hours blocks.
- `project-page`: the business settings with a list of locations; shared fields outside the
  primary language.
- `languages`: locations' facts shared, their names and hours notes translated.

## Impact

- **`packages/model`:**
  - schema and types (`location` node, `business.locations`, block `location_id`);
  - validation;
  - `migrate.ts` (`toVersion8`);
  - `languages.ts`;
  - fixtures regenerated at format 8.
- **`packages/render`:** `business.ts` (`businessInfo`, contact details and hours per
  location), `page.ts` (footer), `head.ts` (structured data), `strings.ts` (labels).
- **`apps/admin`:**
  - `BusinessSettings.svelte` and `OpeningHoursEditor.svelte` (per location);
  - `business.ts` operations and `locate.ts` (problems lead to the location's field);
  - the block panel and the contact and opening hours canvas components (`business-view.ts`);
  - `Site.svelte` (footer);
  - the i18n catalogues.
- No new dependencies. Upgraded sites publish the same HTML.
