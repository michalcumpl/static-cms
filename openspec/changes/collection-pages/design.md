# Design

## Context

See proposal.md for the motivation. The current state:

- **Collections** (`packages/model/src/collections.ts`): four collections on the site node, each
  shown by one block type; `COLLECTIONS` maps the block type to the collection and the item type,
  and `blockItems` resolves `all` and `chosen`. Item structure is shared across languages; item
  texts are per language (languages spec, "Shared fields"), merged on read.
- **Pages** are `page` nodes with a flat slug. `RenderContext` builds one route per page
  (`<slug>/index.html`); `renderSite` returns `RenderedPage { pageId, path, url, html }`.
  Alternates use `SiteLanguage.pages`, each page's URL by translation key, built for every
  language before rendering. The preview (`/p/<project>/preview/[...path]`) and the export serve
  whatever `renderSite` returns.
- **Sites have no JavaScript.** Rich texts on pages are node arrays (`paragraph`, `subheading`,
  `list`); item texts are single text properties with marks.
- **Admin forms** (`lib/editor/form/`) edit items through the editor's Svedit session;
  `FormField` wraps a `TextProperty`. What you offer lists services and questions.
- **Format** is 9; `toVersion9` is the last step.

## Goals / Non-Goals

**Goals:**
- Item pages come from data: the owner fills fields, the template renders the page, so a
  template switch restyles every project page at once.
- One mechanism for services and projects, so later collections can have pages too.
- Nothing changes for an existing site until the owner opts in.

**Non-Goals:**
- Item pages built from blocks, or blocks added to an item page.
- A page per person, testimonial or question.
- Category pages generated automatically: a category page is an ordinary page with a projects
  block set to that category.

## Decisions

### 1. Item pages are generated, not page nodes

An item page is rendered from the item, with a fixed recipe per collection (decision 5). There is
no `page` node per item.

- *Alternative: a real page per item* (blocks, with a header block reading the item). More
  flexible, but every project would be two things to keep in step, the page list would grow to
  ninety entries for Scénografie, and a template switch couldn't restyle project pages as a set.
  It also contradicts the strategy's "business data as the source of truth".
- The recipe is the template's later (`template-system`); for now the renderer owns it.

### 2. A listing page per collection; addresses nest under it

The site node gets `services_page_id` and `projects_page_id` (`""` for none). An item page lives at
`<listing slug>/<item slug>/`: the listing page's slug is the parent, so item addresses never
clash with page slugs, the menu can mark the listing page as current, and the back link has a
target. Each language document has its own listing page (pages are per language) and its own
item slugs (texts are per language).

- *Alternative: a collection slug* (`projects_slug: "prace"`) without a page: no back-link
  target and no menu state, and the slug could clash with a page's.
- *Alternative: flat addresses* (`/the-last-race/`): clashes with page slugs, and both
  originals nest their projects.
- The listing page can't be the home page, whose slug isn't part of its address.

### 3. Schema and format 10

```
site            + projects: node_array<project>
                + project_categories: node_array<project_category>
                + services_page_id: string ("")
                + projects_page_id: string ("")
service_item    + slug: string ("")
                + body: node_array<paragraph | subheading | list>
project         name, category_id (""), summary, body (as above),
                facts: node_array<fact>, cover: node_array<image> (≤ 1),
                photos: node_array<gallery_item>, video_url, slug
project_category  name
fact            label, value
projects        COLLECTION_BLOCK + category_id ("") + limit (integer ≥ 0, 0 = all)
```

- `photos` reuses `gallery_item` (image and caption), so the gallery renderer and the editor's
  gallery item and "add several images" work as they are.
- `body` reuses the rich text node types; a service's `description` stays the short text for
  cards.
- `projects` joins `COLLECTIONS` (`projects` → `project`), so `blockItems`, chosen references,
  "Where a list is shown", the canvas item actions and the block panel's mode work unchanged.
  The category and the limit are applied after `blockItems`, in a small `projectsShown`.
- `toVersion10` adds the empty collection and lists, the empty listing pages, and an empty slug and
  body to every service. Fixtures move to 10; today's demo is kept as `demo-site-v9.json`.
- **Validation:** the new rules of the site-document delta. Slug checks run only while the
  collection has a listing page; the messages name items by position ("Project 3") and say to edit
  them in What you offer, as for the other collections. `video_url` uses the existing link-safety
  check (`https` only).
- **Languages:** the shared-field merge gains the project structure (which projects and
  categories exist and their order, a project's category, cover, photos, facts' structure and
  video address); everything else is per language, as the languages delta lists. An item that a
  language doesn't have yet takes the primary's texts and slug.

### 4. Routes and rendering

- `RenderContext` adds item routes after page routes: for each collection with a listing page,
  each item gets `{ path: "<listing>/<slug>/index.html", route: "<listing>/<slug>/" }`, keyed by
  the item's ID. Item IDs are shared across languages, so the ID is also the item's key in
  `SiteLanguage.pages`; the helper that builds each language's page map adds item pages the same
  way, which gives alternates for free.
- `renderSite` returns item pages in `pages` after the document's pages, with `pageId` set to the
  item's ID, so the preview, the export, the sitemap and the ZIP pick them up without changes to
  their loops.
- **Head:** title, description, canonical, share image and alternates go through the same
  function as pages, given an item instead of a page; JSON-LD stays the site's (no project
  schema yet).
- **Menu:** the current-page check compares with the listing page when rendering an item page.
- **Projects block:** `<section class="block projects">` with `<ul class="projects-grid">` of
  `<li class="project-tile">`; the tile is `<a>` when there are pages, else `<div>`; image first,
  then `<p class="project-name">` over it (grid of one cell, like the full-photo hero), then
  category and summary. Covers use `IMAGE_SIZES.gallery`-like sizes and lazy loading. The "All
  projects" link is a `<p class="projects-more">` after the list.
- **Service cards** link the name (`<a>` inside `.service-name`) when services have pages; the
  accordion adds the "More about this service" link after the description.
- Strings ("All projects", "Watch the video", "More about this service", the back link's "Back
  to") go into the site strings for every site language.

### 5. Page recipes

- **Project:** `<article>`; header (h1, category, summary); cover (full width, not lazy,
  `sizes="100vw"`); a two-column body on wide screens: `<dl class="project-facts">` beside the
  body text; photos as a `.gallery-grid` (the gallery's markup and styles, `fill`); the video link;
  the back link.
- **Service:** `<article>`; h1, price, body or description, back link.
- Styles follow the stylesheet rules (theme values only, no comments, container queries).

### 6. Editor and panel

- **What you offer** gets a third list, Projects, between Services and Questions, with
  `FormProject.svelte`. New form parts: `FormBody` (a `NodeArrayProperty` of the rich text node
  types inside the form, with the formatting toolbar the forms already have), `FormFacts`
  (rows of label and value with add, move and remove), `FormPhotos` (the gallery's items, with
  "Add photos" using the media library's multi-select), and a category `<select>`. Categories
  are edited in a small list at the top of the Projects list.
- **"Each … has its own page"** is a switch and a page `<select>` at the top of each list; turning
  it on fills missing slugs with `uniqueSlug` in one transaction. The slug field shows the path
  before it; "Open page" opens the preview at the item's route.
- **Canvas:** `nodes/Projects.svelte` and `nodes/ProjectTile.svelte` reuse `CollectionItems`
  and `ImageSlot`; the block panel adds the category and limit choices to the collection panel
  (`setProjectsCategory`, `setProjectsLimit`, one transaction each) and "Edit projects".
- **Deleting a listing page** clears `services_page_id` / `projects_page_id` in the delete
  transaction; the confirmation names the collection.
- **Inserters** create `projects` blocks with `show: "all"`, `category_id: ""`, `limit: 0`; a new
  project has empty fields and an empty slug (filled when its name is first typed, while pages
  are on).

### 7. Builder and examples

The builder gets `site.projectCategory(name)`, `site.project({...})`, `site.itemPages({ services?:
slug, projects?: slug })`, `blocks.projects(heading, { category, chosen, limit })`, and a
`page` option on `site.service`. Locally, Scénografie's and Punk Film's work becomes projects
(categories, facts, photos, the PETROF 160 and The Last Race pages generated), and Mareš's
practice areas get pages with their scope lists. Their stand-in galleries and hand-made pages go.

## Risks / Trade-offs

- **[Rich text inside a form]** The forms have only edited single text properties so far. →
  `FormBody` reuses the canvas's node components and keymap inside the form; covered by a unit
  test and the e2e "Give the practice areas pages". If Svedit fights it, fall back to the
  editor (a "Edit page text" link) and record it here.
- **[Many pages from one switch]** Turning pages on for 90 projects adds 90 pages to every
  publish. → Rendering is linear and pages are small; the export test covers a site with 100
  projects.
- **[Slugs per language]** An English item without a translated slug takes the Czech one, so
  `/en/work/posledni-zavod/` until translated. → Same rule as page slugs; the item form shows the
  address so it's easy to change.
- **[Listing page deleted in one language only]** That language loses its item pages and the
  alternates drop it. → Expected per-language behaviour; the confirmation says so.

## Migration Plan

Format 10, upgraded on read and stored at the next save (decision 3). Nothing to run; no site
changes until an owner turns item pages on or adds a projects block.

## Changes made while building

- **A new item's address follows its name** as it is typed, until the owner changes the address
  (the project-page delta now says so). Made on the first typed letter, it was just "p".
- **Photos get a description field in the form** (and the decorative switch), not only in the
  editor's Image panel: a photo added in What you offer otherwise blocked the preview until
  described elsewhere.
- **One image helper for covers:** `setImage`, `removeImage`, `chooseImage`, `ImageSlot`,
  `FormImage` and the Image panel take the image property from the owner's type
  (`imagePropertyOf`: a project's `cover`, everyone else's `image`), so callers didn't change.
- **The editing operations** live in `lib/editor/item-pages.ts` (listing pages, addresses, facts,
  photos, categories, the projects block's category and number), with `listingPageChoices` for
  the page choice.
- **The block panel's "New …" button** returns focus to the canvas, so the caret is in the new
  item (for services too); the panel's category and number fields have explicit labels.
- **Share files:** a project's cover is listed as its page's share image in `usedMediaFiles` and
  the export, since the share file is made on demand.
- **Rendering:** `RenderContext` exposes `nodes`, `itemPages`, `itemUrl` and `translationUrls`
  (the export builds each language's page map from it); `renderDocument`, `indent`,
  `galleryGrid`, `blockHeading` and `renderBodyChild` are shared with the item pages.
- **Empty facts and photos** aren't drawn in the form, only their Add buttons.
