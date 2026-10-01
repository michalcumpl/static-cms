# Roadmap

**Goal:** a non-technical small-business owner goes from an empty project to a published,
standards-compliant static website without touching code.

This is a *website compiler with an editor*, not a general-purpose CMS. Out of scope for the MVP:
blogging, e-commerce, memberships, complex forms, plugins, a block marketplace. Multi-language
sites come after publishing (Milestone 5).

## Decisions so far

- **One document per site.** The whole site is one Svedit-compatible JSON document. The
  editor edits it directly (no second model), and every save is a snapshot of it.
- **Renderer separate from the editor.** `@static-cms/site` turns the document into HTML without
  Svelte or Svedit, in Node and in the browser.
- **Business blocks, not layout primitives:** "Services", not rows, columns and spacers.
- **Accessibility and standards are enforced** by validation and checked with `html-validate`.
- **Hosted backend:** SvelteKit full-stack (`apps/admin`, `adapter-node`).
- **AI edits the document** through the same operations as the editor, never raw HTML.
- **A project holds one site document per language.** Theme, media and domain belong to the
  project. Languages may have different pages and structure.

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
upload are all out of M2 on purpose. Storage, pages and media are done; the rest follows.

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
  - **Facts once, as data:** a Business tab edits the name, address, phone (stored in
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
  - Later: dated exceptions to the hours (holidays), several locations.
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

Still open: open sign-up (a switch, when billing exists), Google sign-in, and a version history
UI (versions are already stored).

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
- Later: changing the primary language, a domain per language, machine translation (Milestone 6).

### 6. AI

- Generate an initial site.
- Rewrite text, create sections.
- Change business details on request (for example "change the opening hours to 8–17").
- Suggest alt text and SEO text.
- Translate a language version into another, and keep translations in sync.
