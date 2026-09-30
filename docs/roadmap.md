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
- **Media library and image upload: done (hero image).**
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
  - Known limits: only the hero image so far; no HEIC decoding on the server; no AVIF;
    no cropping.
- Image display options, chosen in the Image panel rather than by dragging (a free pixel size
  doesn't survive responsive layouts):
  - size presets per image (small / medium / full width; for the hero: beside the text, wider,
    or as the background);
  - cropping to a shape (4:3, 16:9, square) and a focal point that stays visible when cut.
- SEO settings, favicon, site metadata.
- More blocks: opening hours, contact, gallery, call to action, testimonials, maybe a map (mind
  GDPR with third-party embeds).
- From the M2 walk-through:
  - Problem messages readable for owners (no internal IDs); page problems are done.
  - Reconsider Cmd+A → Backspace emptying a whole section.

Still open: open sign-up (a switch, when billing exists), Google sign-in, and a version history
UI (versions are already stored).

### 4. Publishing

- FTP/SFTP publishing from the server.
- Deployment status.
- Published version and rollback (re-publish an older snapshot).
- Redirect pages at old URLs when a published page's slug changes (FTP hosting has no server
  redirects), using a meta refresh and a canonical link.
- Managed hosting later.

### 5. Multi-language

Model A: the project holds **one Svedit document per language**. Pages may differ between
languages.

- Default language at `/`, others at `/en/`, `/de/`. The renderer's `basePath` option already
  supports this, and export merges the per-language file trees.
- Pages match across languages through a shared `translation_key`, which drives the `hreflang`
  alternates, the language switcher in the header, and one sitemap with alternates.
- `lang` per document, and validation per document as today.
- The editor gets a language switcher; each language is its own Svedit session.
- Known cost: facts that don't depend on language (prices, opening hours, phone) are edited per
  language. Possible fixes later: a shared business-info record that blocks reference, or AI
  translation sync (Milestone 6).

### 6. AI

- Generate an initial site.
- Rewrite text, create sections.
- Change business details on request (for example "change the opening hours to 8–17").
- Suggest alt text and SEO text.
- Translate a language version into another, and keep translations in sync.
