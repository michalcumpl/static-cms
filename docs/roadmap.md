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
upload are all out of M2 on purpose. Suggested order: storage first, then pages and navigation,
then the rest.

- **Storage:** a database with auth. The model is *project → site documents → version
  snapshots*, so languages can be added in Milestone 5 without a migration. A project has one
  language until then.
- **Pages** are managed in a sidebar panel; every action is a Svedit transaction, so undo covers it.
  - Add a page: the title becomes the slug via `slugify`, and the slug stays editable.
  - Rename a page, edit its slug and SEO text, duplicate it, delete it.
  - Reorder pages, with an explicit **"Set as home"** action (instead of "the first page is home").
  - Deleting a page removes its menu item; text links and calls to action pointing to it are
    reported as `missing-page` problems.
  - The site stays flat: no subpages.
- **Navigation** stays a curated `nav` node.
  - New pages join the menu automatically, with a "show in menu" toggle.
  - The menu can be reordered and can hold external links.
  - No dropdown menus yet.
- Media library and image upload.
- SEO settings, favicon, site metadata.
- More blocks: opening hours, contact, gallery, call to action, testimonials, maybe a map (mind
  GDPR with third-party embeds).
- From the M2 walk-through:
  - Problem messages readable for owners (no internal IDs).
  - Reconsider Cmd+A → Backspace emptying a whole section.

Open decisions: database (Postgres or SQLite), auth, and whether one account owns one site or an
agency manages many.

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
