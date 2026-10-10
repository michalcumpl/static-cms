# Proposal

## Why

A new owner without a website of their own starts from an empty one-page starter site and must
find their way through the Business section, What you offer, the media library and the editor
before anything looks like their business. The import helps only those who already have a site.
A short "Tell us about your business" wizard can ask what a small business always has (its type,
name, contact, hours, services and photos) and build a whole, valid site from the template's
layouts, which the control panel and the editor then take over.

## What Changes

- **New project page:** "Tell us about your business" becomes the main way in; "Start from your
  current website" stays beside it; "Start empty" becomes a small link to the starter site.
- **A wizard of steps**, each on its own page with Back and Continue:
  1. *Your business:* its type (café, bakery, restaurant, shop, hair salon, beauty salon,
     professional services, healthcare, sports, other), its name, and one sentence about it.
     Continuing creates the project.
  2. *Design:* the templates that suit the type, the suggested one chosen (only Standard today).
  3. *Contact:* phone, email, address, and opening hours by day.
  4. *Services:* up to 12, each a name, a short description and an optional price.
  5. *Photos:* a logo and up to 12 photos into the project's media library, each with a
     description.
  6. *Pages:* the pages the type suggests (from the template's layouts), as checkboxes the owner
     can change; Home always.
  7. *Preview:* the whole site as it would be published, with "Create my website".
- **Resumable:** every step saves the answers with the project; leaving and coming back opens the
  next unfinished step, and the projects page shows "Finish setting up" on the project. Until the
  owner finishes, the project holds the starter site.
- **Finishing** builds the site from the answers and saves it as one new version: the business
  and its main location with hours, the services collection, the logo, the chosen pages from the
  template's layouts with the photos placed (hero, photo beside text, a gallery), and the site
  description; then the project's Overview opens. The setup can't be run again on a finished
  project.

## Capabilities

### New Capabilities

- `guided-setup`: the wizard's steps, what each asks and saves, resuming, the preview, and the
  site it builds.

### Modified Capabilities

- `accounts`: "Projects" offers three ways to a new project, with the guided setup first, and the
  projects page shows an unfinished setup.

## Impact

- Admin: a `project_setups` table (the answers as JSON, the step reached, finished) with a
  migration; routes under `/p/[project]/setup/[step]` and a preview of the answers; the New project
  page; the projects page; Czech and English strings.
- `@webmio/templates`: suggested layouts per business type, and a pure function building a site
  document from setup answers with the template's layouts (`pageFromLayout`) and the model's
  builder.
- No change to publishing, the editor or the document schema.
- Non-goals: AI-written texts, more business types (`business-details`), team members and
  testimonials in the wizard, choosing between templates beyond the one that exists, and running
  the setup again over an edited site.
