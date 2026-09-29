# Proposal

## Why

Milestone 1 can render and export a site, but content can only be changed by hand-editing JSON, which rules out the product's target user: a non-technical small-business owner. Milestone 2 makes the site editable directly on the page, so the owner edits what they see and the result is still the same validated document that publishes to static HTML.

## What Changes

- Add an **editor** at `/edit/<page-slug>` (`/edit/` for the home page). It uses Svedit to edit the site document in place, with the same block class names and the same stylesheet as the published site, so the edit view looks like the result.
- **Text editing in place** for all visible text: hero heading, text and call-to-action label; rich-text paragraphs, subheadings and list items; services heading and service name, description and price; navigation labels. Bold, italic and links (external, and to a page of the site), with unsafe URLs rejected in the link dialog.
- **Structure editing:** insert, delete and reorder blocks, list items and service items. The hero is only offered at the top of a page. New blocks start with sensible placeholder content.
- **Image accessibility:** edit the hero image's alt text and decorative flag. No image upload.
- **Undo/redo**, a **desktop/mobile preview toggle**, a **page switcher** for the existing pages, and a warning before leaving with unsaved changes.
- **Saving:** the editor saves the whole site document to a JSON working copy on the server, seeded from the demo fixture on first use. Saves are rejected only for structural errors. Site-rule problems (for example an empty heading) are saved and listed in a problems panel, where clicking one selects the node. A version check rejects saves based on an outdated copy instead of overwriting it.
- **Preview and ZIP use the saved document.** `/preview/` and Download ZIP read the working copy, and still require a fully valid document.
- **Validation problems get a category** (`structure` or `site`) in `@static-cms/site`, so the server can tell broken documents from unfinished content.
- **End-to-end tests** with Playwright for the key editing flows. This adds a dev dependency and installs browser binaries locally and in CI.

### Non-goals (this change)

- Adding, renaming, reordering or deleting pages; editing slugs or navigation targets; theme editing; image upload (Milestone 3).
- A database, auth, multiple sites or users, and real-time collaboration (Milestone 3 and later).
- Publishing (Milestone 4) and AI (Milestone 5).

## Capabilities

### New Capabilities

- `site-editing`: editing the site in place in the browser: which content is editable and how, structure changes, links, image alt text, undo/redo, page switching, preview modes, unsaved-changes handling, and the problems panel.
- `site-storage`: how the site document is stored and saved on the server: the working copy, which saves are accepted, conflict detection, and which consumers read the saved document.

### Modified Capabilities

- `site-document`: the *Validation result* requirement gains a problem category (`structure` or `site`).

## Impact

- `@static-cms/site`: a `category` on every validation problem; small, backwards-compatible type addition.
- `apps/admin`: new dependency on `svedit` (pinned exactly, since it is pre-1.0); new `/edit` routes with Svelte edit components for every node type, a toolbar and panels; a site API (`/api/site` to read and save, `/api/media/<name>` for images) that replaces the `/demo/` routes; a server-side store for the working copy (git-ignored `data/` directory); `/` and `/preview/` switch from the fixture to the working copy.
- New dev dependency `@playwright/test` in `apps/admin`, with a `test:e2e` script. CI installs a Playwright browser and runs it.
- `docs/roadmap.md`: Milestone 2 decisions recorded when the change is done.
