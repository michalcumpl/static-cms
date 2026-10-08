# Roadmap

**Goal:** Webmio, a managed website service for small businesses. The owner maintains the facts
about their business, and we keep a fast, valid, always-working website live. The reasoning is in
[`strategy.md`](strategy.md), open work in [`tasks.md`](tasks.md).

Milestones 1–5 below were built as a block-based site editor ("website compiler with an
editor"). The October 2026 strategy refresh moves the product above that: business data
becomes the source of truth, templates generate the first site, the block editor stays for
later changes, and there's still no free-form page builder. The
milestones from A on follow the new direction; 6–9 from the old plan are folded into them.

**MVP is out of scope for:** e-commerce, appointments, memberships, blogging, plugins, a
marketplace, AI agents, advanced analytics, free-form layout. Multilingual is built, kept and
frozen.

## Decisions so far

- **One document per site.** The whole site is one Svedit-compatible JSON document. The
  editor edits it directly (no second model), and every save is a snapshot of it.
- **Renderer separate from the editor.** `@webmio/render` (then `@static-cms/site`) turns the document into HTML without
  Svelte or Svedit, in Node and in the browser.
- **Business blocks, not layout primitives:** "Services", not rows, columns and spacers.
- **Accessibility and standards are enforced** by validation and checked with `html-validate`.
- **Hosted backend:** SvelteKit full-stack (`apps/admin`, `adapter-node`).
- **AI edits the document** through the same operations as the editor, never raw HTML.
- **A project holds one site document per language.** Theme, media and domain belong to the
  project. Languages may have different pages and structure.
- **(2026-10) Business data is the source of truth; pages are generated views of it.** Services,
  team, testimonials and FAQs move from block items into collections. Blocks become the sections
  templates are built from. See milestone A.
- **(2026-10) No free-form page builder, as a hard rule.** The block editor stays (business
  blocks only, no columns, nesting or CSS). Customisation is brand, layout (template,
  navigation, homepage sections on or off) and content.
- **(2026-10) One hosting, ours.** Customers never choose a publishing target.

## Milestones

### 1. Foundation: done

Built the site document, validation, HTML rendering, and deterministic static export to ZIP. Also
a SvelteKit admin shell with a preview route and in-browser ZIP download.

- Change: [`openspec/changes/archive/2026-09-29-site-render-pipeline`](../openspec/changes/archive/2026-09-29-site-render-pipeline/)
- Specs: [`site-document`](../openspec/specs/site-document/spec.md),
  [`site-rendering`](../openspec/specs/site-rendering/spec.md),
  [`site-export`](../openspec/specs/site-export/spec.md)
- Pulled forward: multiple pages and navigation (was M3), the SvelteKit app (was M2), and an
  optional base path for rendering.
- Blocks so far: `hero`, `rich_text`, `services`.

### 2. In-place editing with Svedit: done

Built `/edit/` in the admin app, where the owner edits the site on the page itself. It supports:
- text, bold, italic, and links (to a page or an address);
- adding, moving and deleting blocks, list items and service items;
- image descriptions (alt text, decorative);
- undo/redo;
- a desktop/mobile toggle;
- a problems panel that jumps to the problem;
- saving with conflict protection.

- Change: [`openspec/changes/archive/2026-09-29-inline-editing`](../openspec/changes/archive/2026-09-29-inline-editing/)
- Specs: [`site-editing`](../openspec/specs/site-editing/spec.md),
  [`site-storage`](../openspec/specs/site-storage/spec.md), and a problem category added to
  [`site-document`](../openspec/specs/site-document/spec.md)
- Decisions:
  - **One Svedit editor rooted at the site node.** Two editors on one session crash when focus
    moves between them.
  - **Saves go to a JSON working copy on the server.** Only structurally broken documents are
    refused; unfinished content is saved, and preview/ZIP wait until it is valid.
  - **Links are `span.link` while editing.** The editor derives their CSS from the site's link
    rules.
  - **Container queries (`@container`, `cqi`) in the site CSS,** so the mobile toggle reflows the
    page without an iframe.
  - **Playwright end-to-end tests** in CI (Chromium).
- Known limits:
  - Bold, italic and links can't overlap on the same text; Svedit marks are exclusive.
  - There is no authentication yet: run the admin locally or on a trusted network.

### 3. A real website

Carried over from Milestone 2: page management, navigation targets, theme editing and image
upload are all out of M2 on purpose. All of them are done.

- **Storage and accounts: done.**
  - Change: [`workspace-storage`](../openspec/changes/archive/2026-09-29-workspace-storage/).
    Specs: [`accounts`](../openspec/specs/accounts/spec.md),
    [`site-storage`](../openspec/specs/site-storage/spec.md).
  - **Workspaces:** a workspace is a business, with owner and editor members; agency people
    belong to several workspaces.
  - **Storage:** SQLite on one VPS. The model is *project → site documents (one per language)
    → versions*, so Milestone 5 can add languages without a migration.
  - **Sign-in:** magic links over plain SMTP; invite-only, with an admin command for the first
    user. Media per project on disk; backups with Litestream (documented).
- **Pages and navigation: done.**
  - Change: [`page-management`](../openspec/changes/archive/2026-09-29-page-management/).
    Specs: [`site-document`](../openspec/specs/site-document/spec.md),
    [`site-rendering`](../openspec/specs/site-rendering/spec.md),
    [`site-export`](../openspec/specs/site-export/spec.md),
    [`site-storage`](../openspec/specs/site-storage/spec.md),
    [`site-editing`](../openspec/specs/site-editing/spec.md).
  - **Explicit home page:** the site names its home page (`home_page_id`); every page, home
    included, keeps a unique slug, so "Set as home" changes nothing else. Document format 2;
    stored format-1 documents are upgraded when read and saved as format 2 on the next save.
  - **Editor routes by page ID** (`/p/<project>/edit/<page-id>/`), so renaming, slug edits,
    reordering and undo keep the editor on the right page.
  - **The sidebar is the menu:** "Menu" (menu order, pages and external links) and "Not in
    menu". Add, duplicate, delete, set as home, show in menu, reorder, external links; every
    action is one undoable step. A page settings panel edits title, slug and SEO text.
  - **Slug and menu label follow the title** while they still match it.
  - **Problem messages name pages by title.**
  - Known limits: no redirects from old slugs until Milestone 4; no dropdown menus or subpages;
    links to a deleted page stay in place and are listed as problems.
- **Media library and image upload: done.**
  - Change: [`media-library`](../openspec/changes/archive/2026-09-30-media-library/).
    Specs: [`media`](../openspec/specs/media/spec.md), and images in
    [`site-rendering`](../openspec/specs/site-rendering/spec.md),
    [`site-export`](../openspec/specs/site-export/spec.md),
    [`site-editing`](../openspec/specs/site-editing/spec.md).
  - **Processing with sharp on the server:** type checked from the file's bytes, turned
    upright, all metadata (EXIF, GPS) removed, JPEG/PNG/WebP up to 20 MB and 40 megapixels.
  - **WebP width ladder** 480/960/1600/2400 (never wider than the image), derived from the
    image's key and width, so the document stays the only input to rendering. Pages use
    `srcset`; the ZIP holds only the variants a site uses.
  - **Keys** are `<slug of the file name>-<content hash>`; the same file uploaded twice is one
    image. A `media` table holds the library.
  - **Remove, then clean up:** "Remove from library" only hides an image;
    `pnpm admin media-cleanup` deletes the files no stored version uses.
  - Deployment needs `BODY_SIZE_LIMIT=25M` (adapter-node's default refuses photos).
  - HEIC photos (iPhones) are converted to JPEG in the browser before upload
    ([`heic-upload`](../openspec/changes/archive/2026-09-30-heic-upload/)); the server itself
    still refuses HEIC.
  - Known limits: no AVIF; no cropping.
- **Image blocks: done.**
  - Change: [`image-blocks`](../openspec/changes/archive/2026-09-30-image-blocks/).
  - **Text with image** (image left or right), **gallery** (4:3 grid, a click opens the largest
    version through a plain link, no JavaScript), **team** (round portraits, names one heading
    level below the block heading) and **partner logos** (the name is the logo's description,
    optional link to a page or an address).
  - Each block has a fixed shape and `sizes`; a multi-select library adds several photos,
    people or logos in one go.
- Cropping and focal points per image (the blocks' fixed shapes cover sizing for now).
- **SEO settings, favicon and site metadata: done.**
  - Change: [`seo-and-metadata`](../openspec/changes/archive/2026-10-01-seo-and-metadata/).
  - **Site settings** in the editor (a Site tab next to Page): name, description (the fallback
    for pages without their own), favicon, default share image, and switches for AI search and
    AI training. Pages get their own share image. Document format 3.
  - **Published pages** carry Open Graph and Twitter tags, favicon links, and on the home page
    JSON-LD `WebSite` and `Organization`. Export adds `favicon.ico` and icons, 1200 × 630 share
    JPEGs, `robots.txt` (AI crawlers disallowed per switch) and a `404.html` in the site's
    language.
  - A warning lists pages without any description.
  - Later: `llms.txt`, noindex per page, a focal point for share images.
- **Business details, contact and opening hours blocks: done.**
  - Change: [`business-info`](../openspec/changes/archive/2026-10-01-business-info/).
  - **Facts once, as data:** a Business tab (now the Settings tab) edits the name, address, phone (stored in
    international form), email, map address, type of business and weekly opening hours (any
    number of ranges per day, and a note). Document format 4.
  - The **contact** and **opening hours** blocks only show those facts (rendered by the same code
    on the canvas and the site), and the footer shows them on every page unless switched off.
  - The home page's structured data becomes `LocalBusiness` (or the chosen type) with the address,
    phone and `openingHoursSpecification`.
  - **Map:** a "Show on map" link only, the owner's listing or a Google Maps search. No embed,
    so nothing loads from third parties.
  - Why data: with one document per language (Milestone 5), these facts stay identical across
    languages and can be copied between them unchanged.
  - Later: dated exceptions to the hours (holidays). Several locations: done in `business-locations`.
- **Call to action and testimonials: done.**
  - Change: [`cta-and-testimonials`](../openspec/changes/archive/2026-10-01-cta-and-testimonials/).
  - **Call to action:** a heading, an optional text and one or two buttons (the second
    secondary), each to a page or an address (`tel:` and `mailto:` included).
  - **Testimonials:** quote, name, optional detail and round photo, as `<figure>`/`<blockquote>`.
    No review markup: Google ignores (and may penalise) reviews a business publishes about itself.
  - **Button panel:** where a hero's or call to action's button points, adding and removing
    buttons. Until now the hero's button target couldn't be changed in the editor.
- **Editor polish: done.** Cmd/Ctrl+A selects only the current field's text; problem messages
  name pages and never show internal IDs; problems about links inside text select the linked
  words ([`editor-polish`](../openspec/changes/archive/2026-09-30-editor-polish/)).

- **Structure on the canvas: done** ([`canvas-structure`](../openspec/changes/archive/2026-10-02-canvas-structure/)).
  Blocks and items get handles (move, duplicate, delete; add above or below for blocks), and
  "+ Add block" appears between blocks. Its picker shows each block as a card with a wireframe
  drawing (in the site's primary colour), the block's standard name and a description, and says
  why a block can't go somewhere. Blocks are added only on the canvas: the left column's buttons
  are gone. New blocks are scrolled into view with the cursor in them, and the toolbar names the
  selection. Nothing can be added above a hero any more. Later: drag and drop.
- **Theme and branding: done** ([`theme-and-branding`](../openspec/changes/archive/2026-10-01-theme-and-branding/)).
  - **A Theme tab** next to Page, Site and Business: five presets (applied in one undoable step,
    keeping the content width), four colours with a picker and a hex field, the contrast of each
    colour pair the site uses, heading and body fonts, corners and content width as named
    choices, and the logo with "Show the site name next to the logo". The canvas restyles live.
  - **Fonts from a catalog, self-hosted:** eight open-licence webfonts with Czech, Slovak and
    Polish characters (Inter, Work Sans, Source Sans 3, Nunito, Lora, Source Serif 4,
    Merriweather, Playfair Display) and two system fonts. Published sites ship the WOFF2 files and
    licences under `assets/fonts/`; nothing loads from Google. The files come from pinned
    `@fontsource-variable/*` packages; the model package only knows the catalog. Document format 6
    stores catalog IDs instead of CSS font lists.
  - **Logo in the header** (WebP variants, at most 3rem tall), with the name next to it or alone;
    alone, the site name of each language describes it. It is the organisation's logo in the
    structured data.
  - **Contrast is enforced for four pairs:** text and links/buttons, each on the background and
    on panels (the secondary colour), at 4.5:1.
  - The theme, logo and header switch are shared by every language.
  - Known limits: no SVG logos (the library refuses SVG), no custom font uploads, four colour
    roles only.
- **Version history: done** ([`version-history`](../openspec/changes/archive/2026-10-01-version-history/)).
  A History page per project and language lists every saved version (who, when; marked current,
  live, published, restored from); any version can be previewed read-only and restored, which
  saves it as a new version, so restores can be undone too. Every version is kept.
- **Admin redesign, step 1 of 4 – foundation: done** ([`admin-foundation`](../openspec/changes/admin-foundation/)).
  - **A design system** in the "Glacier" direction: DM Sans (self-hosted), pale blue-green
    ground, pill buttons and tabs, 12/18px radii, status colours; `--ui-*` tokens and shared
    components in `src/lib/ui/`, none of which reach into the site canvas.
  - **An app shell:** a top bar with the product mark, the workspace switcher and the account
    menu, which also holds the interface language; compact above the editor.
  - **Czech and English** for the whole admin: pages, editor, server messages and emails, with
    Czech plural forms and date formats. The language comes from the account, else the switch on
    this device, else the browser; a test fails on text outside the catalogues.
  - The planned steps 3 (projects dashboard) and 4 (presentation website) are superseded by
    milestones B (business control panel) and F (webmio.cz). Still open: translating the site's
    validation (problem) messages, which stay in English for now.
- **Admin redesign, step 2 of 4 – project tabs: done** ([`project-tabs`](../openspec/changes/project-tabs/)).
  - **The project page is tabs,** each with its own address: Overview (address, last publish,
    Publish, validity, languages), Pages, Languages, Publishing (with the ZIP download), History
    and Settings. Pages, History and Settings show one language, chosen in the tab bar.
  - **Site and business settings left the editor** for the Settings tab, which edits the same
    document through the editor's own operations and saves like it (Save, Undo, conflict
    refusal, unsaved-changes question). The editor keeps Page and Design (the former Theme
    tab); problems about those settings and "Edit business details" lead to the Settings tab.
  - **A "⋯" menu on every page and menu link** in the editor's list: rename, duplicate, move,
    show in or remove from the menu, set as home, delete, with reasons for what isn't possible.
  - **The problems panel moved** under the pages list in the left column.
  - Later idea: page actions (add, delete) on the Pages tab, outside the editor.

Still open: open sign-up (a switch, when billing exists) and Google sign-in.

### 4. Publishing

- **Publishing to Netlify: done.**
  - Change: [`netlify-publishing`](../openspec/changes/archive/2026-09-30-netlify-publishing/).
    Spec: [`publishing`](../openspec/specs/publishing/spec.md).
  - **Each workspace connects its own Netlify team** with a token (stored encrypted). Netlify's
    standard terms don't allow one agency account to host clients' sites, and each client's
    plan and credits are theirs.
  - **Publish** from the editor or the project page: the saved site is exported on the server
    and deployed atomically, uploading only changed files; status, history and *Make live
    again* (instant restore).
  - **Custom domains** with DNS instructions and states; the site's address feeds the sitemap
    and new canonical links.
  - **Redirects** (301) from earlier addresses of renamed pages, via `_redirects`.
- Later: other targets behind the same interface (FTP/SFTP to the client's hosting, Bunny.net,
  our own VPS), taking a site offline, publishing on a schedule.

### 5. Multi-language

- **Languages: done** ([`languages`](../openspec/changes/archive/2026-10-01-languages/)).
  - A project has a **primary language** (Czech for existing projects) and can add Slovak,
    English, German or Polish. A new language starts as a **copy** of the primary (same page
    IDs, so pages pair through a `translation_key`) and stays **hidden** until published.
  - **Shared fields** (theme, favicon, default share image, AI switches, business data and
    opening hours) come from the primary whenever another language is read; they're read-only
    there. Texts, pages and the menu are per language. Document format 5.
  - The primary stays at `/`, other languages at `/<lang>/`. Pages carry `hreflang` alternates
    (with `x-default`), the header a language switcher; one sitemap lists every language with
    alternates. No redirects by browser language.
  - Publishing deploys every published language at once, with redirects per language; the preview
    shows hidden languages too; the ZIP download holds the published ones.
- **Language tools: done** ([`language-tools`](../openspec/changes/archive/2026-10-01-language-tools/)).
  - Page settings show the page "In other languages": its counterparts, or **Copy here** (the
    saved page copied into that language, paired, with a unique slug, a menu item and links
    pointed at that language's pages) and **Link to an existing page**; pages can be unlinked.
  - The project page lists, per language, pages **not translated yet** (title, or slug except for
    the home page, still the primary's) and the primary's pages **missing** there; the editor's
    page list marks untranslated pages. Hints only: nothing blocks publishing.
- Later: changing the primary language, a domain per language, machine translation (Milestone 9).

## After the strategy refresh

Milestones in order. A private beta for friends (F) starts as soon as A–E work with at least two
of the seven launch templates (Education, Law, Financial advisory, Investment management,
Short-term rentals, Exhibitions, Creative production); the others can land during the beta. The remaining templates
come after launch.

**Next steps** (2026-10-07): `project-deletion`, the cleanup and `example-sites` are done; next is
`image-cropping`; of the blocks the examples lack (`layouts.md`), `figures-and-steps` and
`block-variants` are done, and Scénografie and Punk Film added `collection-pages`, `cards`,
`video` and `hero-slideshow` before launch (2026-10-08); layouts become part of the model with
`template-system`.

**Planned changes**, in order. A → B → C build on each other's data model and must go in
sequence. D doesn't depend on them and can run in parallel; it's the longest pole before the
beta.

| # | Milestone | OpenSpec change | What | Status |
| --- | --- | --- | --- | --- |
| 1 | A | [`business-collections`](../openspec/changes/archive/2026-10-05-business-collections/) | services, team, testimonials and FAQs held once per site; blocks show all or chosen items; social profiles; format 7 | done |
| 2 | A | [`package-split`](../openspec/changes/archive/2026-10-05-package-split/) | `@static-cms/site` split into `@webmio/model`, `@webmio/render` and `@webmio/export`, and everything renamed to Webmio (packages, product name in the admin, docs) | done |
| 3 | A | [`business-locations`](../openspec/changes/archive/2026-10-06-business-locations/) | several locations, each with address, hours and contact | done |
| 4 | B | [`control-panel`](../openspec/changes/archive/2026-10-07-control-panel/) | the website home: a dashboard and the Business, Website and Publish sections, replacing the project tabs | done |
| 4b | B | [`offer-and-about`](../openspec/changes/archive/2026-10-07-offer-and-about/) | What you offer (services, FAQs) and About you (team, testimonials): forms per item, with formatting | done |
| 4c | B | [`project-deletion`](../openspec/changes/archive/2026-10-07-project-deletion/) | owners delete a website (typing its name; a published one goes offline), restore it or remove it for good | done |
| 4d | B | [`example-sites`](../openspec/changes/archive/2026-10-08-example-sites/) | a command that loads a site document and its images into a new project; the launch examples (Aniděti, Mareš Partners, Mortgage Specialist, Fond 10X, Roubenka Svitávka; Scénografie and Punk Film added 2026-10-08) built with it in our own database, not committed. Before it: the old projects deleted, the database migrations flattened into one | done |
| 5 | B | `image-cropping` | crop, focal point and rotation in the media library | next |
| 6 | B | `guided-setup` | the "Tell us about your business" wizard | |
| 6b | C | [`figures-and-steps`](../openspec/changes/archive/2026-10-08-figures-and-steps/) | two blocks: **key figures** (3–6 numbers with a label, such as "300M CZK managed") and **steps** (numbered "how it works") | done |
| 6c | C | [`block-variants`](../openspec/changes/archive/2026-10-08-block-variants/) | **full-photo hero** (text over the image), **compact team list** (name, role, contact; for teams without portraits), **services as a list or accordion** (many or long items), **gallery showing whole images** (screenshots, logos). A block setting now; templates set the defaults later | done |
| 6d | C | `collection-pages` | a page per item of a collection, for services (scope, price, a call to action; lists inside a description) and for a new **projects** collection (cover image, category, facts such as client, year, place, director and photographer, photos, a trailer); a **projects block** of tiles with the title over the image, filtered by category, with "show more" for long portfolios. Replaces `service-pages` | |
| 6e | C | `documents` | PDFs in the media library next to images; a documents block and links to documents from texts | |
| 6f | C | `business-details` | business types for education, legal, financial, lodging and production businesses; company ID and registration; a billing address or headquarters separate from the office; bank details; a regulatory note in the footer (for example "supervised by the Czech National Bank"); check-in and check-out times for rentals | |
| 6g | C | `cards` | a block of cards: an image, a title, a short text and a link (to a page or a project). Category tiles on a home page, awards, "what we do" | |
| 6h | C | `video` | YouTube and Vimeo videos, loaded only when clicked (no cookies before): a video block, and a trailer on a project. Moved before launch from the beta (was 9c) for Creative production | |
| 6i | C | `hero-slideshow` | a hero that shows several slides (a still or a short muted clip, a title, a link to the project), for film and creative agencies: pause and next/previous controls, no movement with reduced motion, the first slide without JavaScript, only the first image loaded up front | |
| 7 | C | `template-system` | the template contract, layouts (page recipes, also offered by "Add page"), homepage sections on or off, template versions | |
| 7b | B | `site-import` | import a public website by its address (v1, no AI): pages, menu, redirects from the old addresses, business details, images, a guessed theme, texts as plain blocks, and a review before anything is published | |
| 8 | C | `lighthouse-gate` | Lighthouse 100 in CI for every template and variant | |
| 9 | C | `template-education`, `template-law`, `template-finance`, `template-investment`, `template-rentals`, `template-exhibitions`, `template-creative` | the seven launch templates, each checked against its example site; two before the beta | |
| 9b | C | `reviews` | reviews with a rating and its source ("4.9 on Google"), shown with the testimonials | during the beta |
| 9c | C | `video` | moved to 6h | |
| 9d | C | `timetable` | a table block for timetables and seasonal prices | during the beta |
| 9e | C | `booking` | the owner's booking service (Lodgify and others): a booking button, and its availability calendar where the service allows embedding | during the beta |
| 9f | C | `newsletter` | a signup form passing addresses to the owner's email service | during the beta |
| 9g | C | `menu-groups` | menu items grouped under a heading ("Projects": TV and film, Events, Exhibitions, Interiors) and a small secondary menu (About, Contact) | during the beta |
| 9h | C | `jobs` | job openings: a list of positions, each with what the job is and whom to write to | during the beta |
| 9i | C | `design-touches` | a heavy display font (such as Montserrat) for headings; a darker shade offered when a brand colour fails the contrast check | during the beta |
| 10 | C | `template-switching` | choose, preview with your own content, publish | |
| 11 | D | `own-hosting` | S3 + CloudFront, `<site>.webmio.site`, atomic deploys, rollback | |
| 12 | D | `safe-publishing` | the publish pipeline: link check, deploy verification, previous version kept on failure | |
| 13 | E | `domain-guides` | DNS guides per registrar with a live record check | |
| 14 | E | `contact-form` | form endpoint, email to the owner, spam protection | |
| 14b | E | `scheduled-jobs` | recurring server jobs in one place; the first removes deleted websites 30 days after deletion | |
| 15 | E | `website-health` | daily checks, *Website healthy*, alerts (a scheduled job) | |
| 16 | F | `admin-on-aws`, `presentation-site`, `operator-console`, legal documents | the private beta | |
| 17 | C | `template-local-services`, `template-hospitality`, `template-personal-professional` | the templates after launch | |

### A. Business data as the source of truth

- **Collections: done** ([`business-collections`](../openspec/changes/archive/2026-10-05-business-collections/)).
  `services`, `team`, `testimonials` and `faqs` on the site, with today's item fields (price
  stays a text). Which items exist, their order and their images are shared across languages;
  texts are translated. Document format 7: a one-time upgrade at start lifts the items of
  existing blocks into the collections (as "System" versions), and pages publish as before
  apart from the new services catalog in the structured data. New **questions block**
  (`<details>`), **social profiles** in the business settings, the footer and `sameAs`.
  - On the canvas, items are edited where they're shown; a block shows all items or chosen
    ones (highlights). Deleting an item removes it from every page; "Remove from this block"
    keeps it. An item shown twice on one page is editable in the first block, a preview later.
  - Known limits: a restored old version of a non-primary language loses items only it had;
    keyboard Backspace on a selected item deletes it like the handle menu does.
- **Blocks become views:** a services, team, testimonials or FAQ block shows the whole
  collection, or chosen items in its own order (home page highlights).
- **Rename and package split: done** ([`package-split`](../openspec/changes/archive/2026-10-05-package-split/)). First
  everything was renamed to Webmio (`@webmio/*` packages, the admin's product name and emails,
  Czech "do Webmia", "ve Webmiu"), then `@webmio/site` was split into `@webmio/model` (schema,
  validation, upgrades, fixtures), `@webmio/render` and `@webmio/export`, with one-way imports
  checked by a test. The editor no longer loads the export code. Templates get their package with
  `template-system`.
- **Several locations: done** ([`business-locations`](../openspec/changes/archive/2026-10-06-business-locations/)).
  The business keeps its name, type and social profiles; its contact details and opening hours
  live in an ordered list of locations, the first being the main one (document format 8, upgraded
  on read with a predictable location ID). Contact and opening hours blocks show all locations,
  each under its name, or the one chosen in the block's panel. With several locations the footer
  lists each compactly, and structured data gives each its own entry with `parentOrganization`.
  One location publishes exactly as before.

### B. Business control panel

- **The panel: done** ([`control-panel`](../openspec/changes/archive/2026-10-07-control-panel/)). A project opens on
  **Overview**: its live state and Publish, the saved site's problems (each a link to where
  it's fixed, the editor opening at the problem), and a card per section. **Business** and
  **Website** (with Pages and menu, Languages and Domain) replace the Settings, Pages and
  Languages tabs; **Publish** (with Versions) replaces Publishing and History. Design stays in
  the editor until templates; the Website section shows it at a glance with "Change design". Old
  tab addresses redirect.
- **What you offer and About you: done** ([`offer-and-about`](../openspec/changes/archive/2026-10-07-offer-and-about/)).
  Services and questions, people and testimonials each have a list form in their section, on the
  editor's own Svedit session: bold, italic and links, add, move, duplicate and delete, portraits
  and photos from the media library, Save and Undo. Each list says which pages show it. Problems
  about items lead to their field; other languages translate the texts only.

- **Deleting a website: done** ([`project-deletion`](../openspec/changes/archive/2026-10-07-project-deletion/)): workspace owners only (members can't),
  from a "Delete website" area at the bottom of the Website section, confirmed by typing the
  website's name. A published website is taken offline (its Netlify site deleted; our own
  hosting later), and the confirmation says so. Owners see "Deleted websites" in the project
  list, with Restore (back as it was, unpublished) and Delete now (the project, its versions,
  publishes and images removed for good). Automatic removal after 30 days comes with
  `scheduled-jobs`.
- **Cleanup before the examples: done** (2026-10-07):
  - **The old projects go:** Atelier Aniděti, RV Finance, cumpl.cz, Kubuv huliweb and test are
    deleted with the new feature. Atelier Aniděti's Netlify site goes with it.
  - **The migrations are flattened:** the seven migrations become one, generated from the
    schema. A fresh database built from it must have exactly the schema of the existing one.
    The existing database keeps its data: its migration record is rewritten to the new
    migration, so accounts, the workspace and its Netlify connection stay. The database is
    copied before anything changes.
- **Example sites: done** (`example-sites`; Scénografie and Punk Film added 2026-10-08). What they taught is in [`layouts.md`](layouts.md) (page recipes and the blocks we lack) and [`import-mapping.md`](import-mapping.md) (rules for `site-import`). Details: `pnpm admin load-site <folder>` creates a project from a
  site document and a folder of images (later also the templates' fixture sites). The launch
  examples are migrated with it into our own database:
  - **Aniděti** (Czech, Education): the courses and prices as services, the two teachers as
    people, the two places as locations, contact details and photos.
  - **Mareš Partners** (Czech and English, Law): the eight practice areas as services, the
    awards, contact details.
  - **Mortgage Specialist** (English as the primary language, Financial advisory): services,
    the key figures, reviews as testimonials, a free-consultation call to action.
  - **Fond 10X** (Czech and English, Investment management): how they invest, the team, the
    FAQs, the key figures, portfolio logos, contact.
  - **Roubenka Svitávka** (Czech, Short-term rentals): the cottage and the garden chalets,
    amenities, photo gallery, booking through their existing booking service, contact.
  - **Scénografie** (Czech, Exhibitions): the four project categories (TV and film, events,
    exhibitions, interiors) with their projects, one project page (PETROF 160), the workshops,
    capabilities and awards, the people by department.
  - **Punk Film** (English, Creative production): commercials, film and TV, and other work, one
    project page (The Last Race) with credits, trailer link and stills, services for
    international productions, the people with portraits, client logos.

  Built with today's blocks and theme presets, close to the originals in spirit rather than
  copies. Their pages are written as page recipes, the first layouts. The content (documents
  and images) lives in `apps/admin/data/examples/`, which git ignores: the repository is
  public, and the texts, people and photos belong to the businesses.

- The website's home in the admin follows the customer's mental model: **Overview** (name,
  ● Live, address), then **Business** (company, hours, locations, contact), **What you offer**
  (services, pricing, FAQs), **About you** (team, photos, testimonials), **Website** (design,
  navigation, domain, SEO) and **Publish**.
- Forms for each object, with a live preview of where it appears on the site. Most of the
  Settings tab (business, site, SEO) moves here unchanged.
- The guided setup and the panel are the owner's start; the **block editor** stays one click
  away for adding pages and arranging blocks afterwards.
- **Image cropping** and focal points in the media library (open since milestone 3).
- **Guided setup:** a step-by-step "Tell us about your business" wizard that ends in a
  previewable site.
- **Import from your current website** (`site-import`, decided 2026-10-07): the guided setup's
  second way in, "Start from your current website". The owner pastes an address and confirms
  the site is theirs or that they may use its content; the import takes texts and photos, never
  the design. Version 1 has no AI:
  - **Pages and menu** from the site's navigation and `sitemap.xml`, same domain only, around 20
    pages at most, following `robots.txt`.
  - **Old addresses** recorded per page, so "Redirects from earlier addresses" keeps search
    engine links working after the switch.
  - **Business details** from schema.org data, `tel:` and `mailto:` links, addresses and social
    profile links; FAQs from `<details>` and FAQPage data.
  - **Images** into the media library with their alt texts, de-duplicated; logo and favicon.
  - **A guessed theme** (colours and fonts from the site's CSS) as a starting point.
  - **Texts as plain blocks** (headings, paragraphs, lists) on pages built from layouts.
  - **A review** before anything is published: what was imported, and what to check.

  It runs as a background job with progress, and fetches pages safely: no internal addresses,
  size limits, timeouts; sites that build their content with JavaScript (Wix, Squarespace) need
  a headless browser. It produces what `load-site` reads (a site document and images), and the
  example sites are its test cases, kept locally like the examples.
- Replaces the planned projects dashboard; an account with several websites lists them as cards.

### C. Templates as website systems

- **A template contract:** the pages it generates, its sections and which collections they read,
  navigation, typography and spacing, SEO and schema.org defaults, homepage sections that can be
  switched on or off, and variants (single- or multi-page, image or video hero vs. classic
  header).
- **Template, design, layout** (strategy, "Templates, designs and layouts"): the template is the
  website system and owns the spacing tokens; the design is the owner's brand and survives a
  switch; a layout is a page recipe, an ordered list of blocks with no styling. A template's page
  architecture is a set of layouts, mostly shared ones (Contact, About, Services, FAQ) plus its
  own. The guided setup and "Add page" create pages from layouts; after that a page is the
  owner's.
- **Seven launch templates:** Education (after-school activities, courses, tutors), Law,
  Financial advisory, Investment management, Short-term rentals, Exhibitions and Creative
  production, each checked
  against its migrated example site by hand and against fixture sites with invented content in
  CI. Local Services, Hospitality (hotels, cafés, restaurants) and Personal Professional follow
  after launch.
- **Blocks and settings the example sites showed we lack** (decided 2026-10-08; details and how
  many examples need each in [`layouts.md`](layouts.md)). Before the templates, because they
  render them:
  - `figures-and-steps`: key figures and steps;
  - `block-variants`: the full-photo hero, a compact team list, services as a list or accordion,
    a gallery that shows whole images;
  - `collection-pages`: a page per service or project, a projects collection and a projects
    block filtered by category;
  - `cards`: image, title, text and link;
  - `video` (moved from the beta) and `hero-slideshow`, for Creative production;
  - `documents`: PDFs to download;
  - `business-details`: business types for structured data, company and regulatory details,
    check-in and check-out times.

  During the beta: `reviews` (a rating with its source), `timetable`, `booking` (the owner's
  booking service), `newsletter`, `menu-groups`, `jobs` and `design-touches`. The contact form is `contact-form`
  (milestone E).
- **Template switching:** choose → preview with your own content → publish; nothing rewritten.
  Pages and blocks the owner made in the editor are kept and restyled. Collections a template
  doesn't show stay stored, and the preview says what won't be visible.
- **Versioned templates:** a site records the template version it uses; template updates are
  checked against every fixture site before release.
- **Lighthouse 100** (performance, accessibility, best practices, SEO) for every template and
  variant, as a CI gate on fixture sites; `html-validate` stays.
- Brand stays as built: logo, colours with enforced contrast, fonts from the catalogue.

### D. Safe publishing on our own hosting

Was milestone 6.

- **S3 + CloudFront as our own Netlify:** one bucket and one multi-tenant distribution; each site
  a tenant with its own domains and an automatically issued certificate. Free address
  `<site>.webmio.site`; previews there too.
- **Atomic deploys and instant rollback:** each publish in its own folder, uploading only changed
  files; a CloudFront Function with a key-value store points each domain at its live publish.
- **The publish pipeline** from the strategy: validate required fields, check links, generate
  metadata and structured data, optimise images, build, deploy, **verify the live deployment**,
  keep the previous version. On failure the previous version stays live and the owner sees
  *Try again*.
- Another `PublishTarget` next to Netlify; existing sites move over, then the Netlify adapter goes.

### E. Domains and website health

Was milestone 7, plus health.

- **Connecting an existing domain:** for the beta, step-by-step DNS guides for the registrars our
  customers use (WEDOS, Forpsi, Active24, Websupport, Subreg, GoDaddy, Namecheap) with a live
  check of the records. Then the seamless version: nameservers to a Route 53 hosted zone we
  create, existing records imported (email keeps working), bare domain, `www` and certificate
  set up automatically.
- **Scheduled jobs** (`scheduled-jobs`): one place for the server's recurring work, with each
  job's last run and outcome visible to operators, safe to run twice and resumed after a restart
  (on the AWS server, one instance runs them). The jobs it will carry:
  - **removing deleted websites** 30 days after deletion (until then, owners restore them or
    remove them with Delete now);
  - **website health** checks, daily;
  - **custom domain checks** until the certificate is issued, instead of on page load;
  - **media cleanup** (images no version uses), today the `media-cleanup` command;
  - **expired sign-in links, sessions and invitations** removed;
  - **reminder emails:** renewals, and nudges such as opening hours not updated in a year;
  - later, **backups** checked (Litestream) and **renewals** with billing.
- **Website health:** a daily check (SSL, domain, pages published, no broken links, images
  optimised, contact form working, required business information present, sitemap, valid
  structured data) shown as *Website healthy* or a list of what to fix, and emailed when
  something breaks.
- **Contact form** (a strategy "included" item): submissions to a small endpoint, emailed to the
  owner, spam-protected without third-party scripts.
- Later: registering domains from the admin (generic endings through Route 53 Domains, `.cz`
  through a Czech registrar's API), other DNS records editable in the admin.

### F. Private beta

Invite-only, small and cheap, for friends: it validates the data model, templates and publishing
before anyone pays.

- **Admin on AWS** (was milestone 8): one small EU server at `app.webmio.eu`, deploy pipeline,
  monitoring and alerts; media in S3; SQLite with Litestream to S3.
- **Presentation website** on `webmio.cz` (Czech) and `webmio.eu` (English), built and published
  with Webmio itself: what you get, €79 / 1 899 Kč a year excl. VAT (free until the first publish), FAQ, *Request access* form.
- **Legal:** terms of service, privacy policy, data processing agreement (we process the
  customer's form submissions), cookie statement (sites set no cookies), complaints procedure.
- **Operator console (minimum):** customers, websites, plan status and renewal dates, manual
  invoices.
- **Emails:** renewal reminders, publish failures, health alerts.

### G. After the beta

- **Billing and open sign-up:** card payments, €79 / 1 899 Kč a year excl. VAT from the first
  publish, renewals, invoices with VAT.
- **Google sign-in** next to magic links.
- **Owner statistics:** simple, privacy-friendly visit counts from CDN logs, in the panel and in a
  monthly email with the health summary. No advanced analytics.
- **Operator console:** cash flow, trends, renewal forecasts.
- **Agencies:** an agency account sets up client websites, and clients get the simple panel.
- **AI** (was milestone 9), building on health and the data model: suggested alt text and SEO
  text, filling in the business from a few answers, "change the opening hours to 8–17",
  nudges ("a service has no description"), translation. **Import version 2** (`site-import`):
  sorting imported texts into services with prices, team, testimonials and FAQs, and choosing
  layouts, checked by our validation before the owner reviews it. Runs on our key within fair use; no
  bring-your-own-key.
