# Roadmap

**Goal:** a non-technical small-business owner goes from an empty project to a published,
standards-compliant static website without touching code.

This is a *website compiler with an editor*, not a general-purpose CMS. Out of scope for the MVP:
blogging, e-commerce, memberships, complex forms, multilingual sites, plugins, a block marketplace.

## Decisions so far

- **One document per site.** The whole site is one Svedit-compatible JSON document. The
  editor edits it directly (no second model), and every save is a snapshot of it.
- **Renderer separate from the editor.** `@static-cms/site` turns the document into HTML without
  Svelte or Svedit, in Node and in the browser.
- **Business blocks, not layout primitives:** "Services", not rows, columns and spacers.
- **Accessibility and standards are enforced** by validation and checked with `html-validate`.
- **Hosted backend:** SvelteKit full-stack (`apps/admin`, `adapter-node`).
- **AI edits the document** through the same operations as the editor, never raw HTML.

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

### 2. In-place editing with Svedit: next

- Edit text directly on the page, including bold, italic and links.
- Select, insert, delete and reorder blocks and their items.
- Undo and redo.
- Desktop/mobile preview toggle.

Open decisions:
- **Where edits are saved:** a JSON file on the server (a database replaces it in M3), the
  browser only, or a database now.
- **How much is editable:** text only, text plus blocks, or also pages, navigation, theme and
  images.
- **Spike first:** can a Svedit session edit one page inside the site document? If not, split per
  page at load time. See the M1 design.

### 3. A real website

- Database storage with version snapshots, and auth.
- Pages: add, rename, reorder, delete. Navigation editing.
- Media library and image upload.
- SEO settings, favicon, site metadata.
- More blocks: opening hours, contact, gallery, call to action, testimonials, maybe a map (mind
  GDPR with third-party embeds).

Open decisions: database (Postgres or SQLite), auth, and whether one account owns one site or an
agency manages many.

### 4. Publishing

- FTP/SFTP publishing from the server.
- Deployment status.
- Published version and rollback (re-publish an older snapshot).
- Managed hosting later.

### 5. AI

- Generate an initial site.
- Rewrite text, create sections.
- Change business details on request (for example "change the opening hours to 8–17").
- Suggest alt text and SEO text.
