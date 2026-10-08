# Proposal

## Why

Two launch templates, Exhibitions (Scénografie) and Creative production (Punk Film), are mostly
**projects**: about 90 at Scénografie and 30 at Punk Film. Each has a cover image, a category,
facts and photos, and its own page. Both examples now fake this: galleries with captions that
can't link, and one project page each made by hand. The Law and Education examples need the same
thing for **services**: Mareš Partners has a page per practice area with a scope list, and
Aniděti's course descriptions are too long for a card (`docs/layouts.md`, items 4 and 15).
Templates can't be built until both exist (`docs/roadmap.md`, row 6d).

## What Changes

- **A projects collection** in the site: each project has a name, a category, a short summary,
  a text (paragraphs, subheadings and lists), facts (label and value pairs, such as "Client:
  Národní technické muzeum"), a cover image, photos with captions, and a video address. The
  categories ("Exhibitions", "Interiors") are a list of their own, held once per site.
- **A projects block:** tiles with the cover photo and the name over it. It shows all projects,
  chosen ones, or one category, and can be limited to the first few with a link to all of
  them.
- **A page per item, for services and projects.** The owner chooses the page that lists them,
  such as "Work" or "Practice areas". Each item then gets its own address under that page
  (`/work/the-last-race/`), made from the item's data, with nothing else to build. Tiles and
  service cards link to these pages. Without a chosen page, nothing changes.
- **Services get a longer text for their page** (paragraphs, subheadings and lists) next to
  the short description shown on cards, and an address.
- **Item pages are full pages of the site:** title, description and share image from the item,
  language alternates, sitemap, the menu marking their listing page as current, and a link back
  to it.
- **Document format 10.** Older documents upgrade with no projects and no item pages, so nothing
  changes until the owner chooses.
- **In the admin:** What you offer gains a Projects list (all fields, the categories, the
  listing page) and, for services, the page text, the address and the listing page. The editor
  gains the Projects block, with its show and category choices in the block panel.
- **The builder** writes projects, categories and listing pages. The local examples move to them:
  Scénografie's and Punk Film's work as projects with pages, and Mareš's practice areas with
  pages.

Not in this change: filtering by category in the visitor's browser (sites stay without
JavaScript; category pages do this job, as on both originals), embedded video players (`video`),
the hero slideshow (`hero-slideshow`), links from texts and menus to an item page, structured
data for projects, and editing an item page's layout.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: the projects collection and its categories, the projects block, item pages
  (listing page, addresses, service page text), format 10 and the upgrade from version 9.
- `site-rendering`: the projects block, item pages, and links from tiles and cards to them.
- `site-export`: item pages in the export and the sitemap.
- `languages`: which project fields are shared and which are translated; item addresses per
  language.
- `site-editing`: the Projects block on the canvas and its choices in the block panel; deleting a
  listing page.
- `project-page`: the Projects list in What you offer, the services' page fields, and the listing
  page choice.

## Impact

- **Model:** schema and types (`project`, `project_category`, `fact`, `projects`, new site and
  service properties), `COLLECTIONS`, validation, `toVersion10`, fixtures at format 10 with
  `demo-site-v9.json` kept, the builder.
- **Render:** the projects block, item page routes and their head (title, description, share
  image, canonical, alternates), links from cards and tiles, styles, the sitemap in export.
- **Admin:** the Projects list form and the services form, the listing page choice, the canvas
  Projects block and its panel, deleting a listing page, the preview serving item pages, texts in
  both languages.
- **Tests:** model, render (`html-validate`, snapshots), export, editor unit tests and e2e.
- **Local examples** (not committed): Scénografie, Punk Film and Mareš Partners rebuilt.
