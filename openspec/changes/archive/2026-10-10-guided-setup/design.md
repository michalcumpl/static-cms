# Design

## Context

A project is created today from the starter site (`starterSite` in `lib/server/demo.ts`) or by an
import. Its document is saved by `saveSite` as versions; `servePreview` exports and serves any
documents given to it, so a preview needn't be saved. `@webmio/templates` has the Standard
template and seven shared layouts (Home, Services, About us, Team, Contact, FAQ, Careers);
`pageFromLayout` makes a page's nodes from a layout into an existing document. The layouts have no
photo places except the hero; Home shows testimonials, About us and Team show the team, FAQ shows
questions. The model's `siteBuilder` makes a site with a business, a location with hours, services
and a logo. The ten business types the wizard offers map one to one onto the model's
`BUSINESS_TYPES` (café → `CafeOrCoffeeShop`, … other → `LocalBusiness`). Every block has
`hidden`, shown in the editor and left out of the website.

## Goals / Non-Goals

**Goals:**
- One pure function from answers to a site document, used by both the preview and finishing, so
  what the owner previews is what they get.
- Plain server-rendered forms for the steps (form actions), working without client JavaScript
  except the photo uploads, like the rest of the panel's forms.

**Non-Goals:**
- Editing the site during the setup through the wizard: the editor stays open, but finishing
  replaces the starter site.
- A second run of the setup on a finished project.

## Decisions

### 1. Answers live in `project_setups` until finishing

```
project_setups: project_id (PK, → projects, cascade), answers (JSON), step (the next step to
                show, 1–7), finished_at (null until finished), updated_at
```

`answers` is typed in `@webmio/templates` as `SetupAnswers`: `type`, `name`, `sentence`,
`template`, `contact` (`phone`, `email`, `street`, `postal_code`, `city`, `hours` by weekday as
`[opens, closes][]`), `services` (`name`, `description`, `price`), `logo` and `photos` (media keys
with `alt`, and which is the main one), `pages` (layout IDs). The first step creates the project
from the starter site (named, in the owner's interface language) and the row; each Continue
validates and merges that step's answers and moves `step` forward. Nothing touches the document
until finishing.

*Alternative:* rebuilding and saving the document at every step. Rejected: it fills version
history with half-built sites, and the preview already shows the result.

### 2. `siteFromSetup(answers, template, lang)` builds the whole document

A pure function in `@webmio/templates` (`setup.ts`): `siteBuilder` makes the site, theme (the
template's tokens), business (name, type), main location (address, phone, email, hours), services
in order, logo (with its size from the media key's record, passed in), and the description; then
each ticked layout, in the layouts' order, is added with `pageFromLayout` (slugs from the layouts'
names, unique), in the menu, Home as the home page. Then:
- the hero gets the main photo;
- the other photos become a gallery appended to About us, or to Home without it;
- collection blocks whose collection is empty (testimonials, team, questions) get `hidden: true`.

The admin passes media sizes so image nodes carry `width` and `height`, as uploads give them.

*Alternative:* editing the starter site's document step by step. Rejected: the starter site is a
one-page placeholder, and the layouts already define the pages.

### 3. Suggestions per business type are data

`SETUP_TYPES` in `@webmio/templates` lists the ten types with their schema.org type, Czech and
English labels and suggested layouts (spec, "Pages step"). The design step lists `TEMPLATES`,
those whose `trades` match the type's label first; Standard suits every trade.

### 4. Routes and the flow

- `/w/[workspace]/new`: "Tell us about your business" first (a button to step 1), the import
  beside it, "Start empty" as a small link opening its name field.
- `/w/[workspace]/setup`: step 1 before a project exists; its action creates the project and the
  setup row and redirects to `/p/[project]/setup/2`.
- `/p/[project]/setup/[step]` (2–7): owners only, one form each; Back is a link, Continue the
  form's action. A step beyond `step` redirects to `step`; a finished setup redirects to the
  Overview.
- `/p/[project]/setup/preview/[...path]`: `servePreview` of `siteFromSetup(answers)`, shown in an
  `<iframe>` on step 7 with a link to open it in a new tab.
- Step 7's action builds the document, saves it with `saveSite` on the current version (one new
  version; edits the owner made to the starter site stay in version history), sets `finished_at`,
  and redirects to the Overview.
- The Overview redirects to the setup's next step while it is unfinished; the projects page's
  `listWorkspaces` result gains `setupUnfinished` for "Finish setting up".

### 5. Photos upload as the media library does

The photos step uploads each file at once with the existing `POST /api/projects/[project]/media`
(the library's checks and messages) and keeps the returned key and size in the form; the step's
action stores the keys, descriptions and the main one. A photo removed in the step stays in the
library, as a library photo does when it is taken out of a page.

## Risks / Trade-offs

- [The owner edits the starter site in the editor during the setup, then finishes] → finishing
  replaces it; the previous version stays in version history. The preview step says so when the
  project has more than its first version.
- [Layout texts are placeholders the owner must rewrite] → they are the layouts' starting texts,
  which tell the owner what to write, as adding a page does today.
- [A type without fitting pages] → the owner adjusts the ticks; "other" suggests the general set.

## Migration Plan

A Drizzle migration adds `project_setups`. Existing projects have no row and are finished as far
as the setup is concerned.

## Implementation notes

- The migration is `0006_guided_setup`; a change merged meanwhile with its own `0006` means
  regenerating one of them.
- The site's language is the owner's interface language at step 1; a phone without a country
  code gets `+420` only on Czech sites, as the import does.
- Step 1 can be revisited once the project exists (`/p/[project]/setup/1`); a changed name renames
  the project too.
- Opening hours take one range per day in the setup; breaks are added later in Business.
- The services step shows the saved services and one empty row more (at least three), up to 12,
  so it works without JavaScript; the photos step needs it, for the uploads.
- A logo without a description takes the business's name; the main photo is sent first, so the
  hero takes it.
- Blocks of a services collection left empty are hidden too, as testimonials, team and questions
  are ("A step left empty": no services block on the website).
- The workspace's other role is `editor`: editors keep their Overview during a setup and can't
  open its steps (403).
