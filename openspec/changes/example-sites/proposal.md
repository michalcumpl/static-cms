# Proposal

## Why

The launch templates (Education, Law, Financial advisory) are each proven on a real website
migrated to Webmio (`docs/strategy.md`, "Templates"). Those three example sites are our
presentation material, the reference for designing the templates and their layouts, and the
test cases of the future importer (`site-import`). Today a site can only be made by hand in the
editor, starting from the starter site, in Czech. Building three multi-page sites that way would
be slow and unrepeatable, and a project can't even start in English.

The examples' texts, people and photos belong to the businesses, and the repository is public,
so the content must stay out of it (decided 2026-10-07).

## What Changes

- **`pnpm admin load-site <folder> --workspace <id>`** creates a project from a folder: a
  `project.json` (name, primary language, languages), one site document per language, and the
  images the documents name. It uploads the images into the project's library, points the
  documents at them, checks every language with the site's validation, and stores them. It
  refuses a folder with errors, and leaves nothing behind when it fails.
- **Projects can have English (or another offered language) as their primary language** when
  created this way; the admin keeps creating new projects in Czech.
- **A site builder** in `@webmio/model`: functions that write a valid site document (site,
  business and locations, pages and menu, every block type, collections, theme) without spelling
  out node IDs and empty marks. Content-free and tested; later used for the templates' test
  sites and by the importer.
- **The three examples**, built with the builder and loaded with the command into our own
  database, in `apps/admin/data/examples/` (ignored by git):
  - **Aniděti** (Czech; Education): courses with prices as services, the two teachers as
    people, the two places as locations, how they work, films, contact, photos.
  - **Mareš Partners** (Czech and English; Law): the firm, its eight practice areas as
    services, awards as logos, contact.
  - **Mortgage Specialist** (English; Financial advisory): services, key figures, reviews as
    testimonials, a free-consultation call to action, contact.

  Close to the originals in spirit, with today's blocks and theme presets; not copies.
- **Two committed notes, without the businesses' content:**
  - `docs/layouts.md`: the page recipes the examples use, the first layouts (`template-system`
    turns them into data);
  - `docs/import-mapping.md`: how each part of a source page maps onto our model, the rules
    `site-import` v1 will automate.

Not in this change: publishing the examples, a template system, the importer itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accounts`: the admin command gains loading a site from a folder into a workspace.

## Impact

- **Model:** `packages/model/src/builder.ts`, exported from `@webmio/model`, with tests.
- **Admin:** `load-site` in `scripts/admin.ts` and `server/load-site.ts`; `createProject` takes a
  primary language.
- **Local only:** `apps/admin/data/examples/<site>/` (build scripts, images, generated
  documents) and the three projects in the development database.
- **Docs:** `docs/layouts.md`, `docs/import-mapping.md`, the admin README (the command) and the
  roadmap.
