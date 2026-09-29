# Proposal

## Why

The product goal is a site builder where a non-technical small-business owner goes from an empty project to a published, standards-compliant static website. Everything later (the Svedit editor, the SvelteKit backend, publishing, AI edits) produces or consumes one thing: a site document that compiles to static HTML. Building and proving that document → HTML → ZIP pipeline first fixes the core contract before any editor code depends on it. Proving it in the real app stack (SvelteKit, browser and server) at the same time removes the placeholder React app before anything gets built on it.

This is Milestone 1 of the MVP.

## What Changes

- **BREAKING (internal):** rename the workspace package `@static-cms/core` (`packages/core`) to `@static-cms/site` (`packages/site`). The name describes what it holds: the site model and the build from that model to a static site.
- Define the **site document**: a single Svedit-compatible document (flat `nodes` map, `node_array` / `text` value shapes) holding site settings, theme, pages, navigation and content blocks. It is the canonical model that the Milestone 2 editor will edit directly. No second model and no mapping layer.
- Add three content blocks, chosen for small-business sites: `hero`, `rich_text`, `services`. Also add `page`, `nav`, and `image`, with alt text required unless the image is explicitly marked decorative.
- Add a **validator** that reports structural and accessibility errors (such as unreachable nodes, missing alt text, heading-order problems and duplicate slugs) and warnings, before anything is rendered.
- Add a **renderer** in pure TypeScript: document → one semantic HTML file per page, plus a stylesheet generated from theme tokens, with an optional base path for sites served below the web root. It is independent of Svelte and Svedit.
- Add a **static export**: document plus media → deterministic file tree (`index.html`, `<slug>/index.html`, `assets/`, optional `sitemap.xml`) → ZIP.
- Add a hand-written demo site fixture and a `build-demo` script that produces `website.zip`, plus snapshot tests of the rendered HTML.
- **BREAKING (internal):** replace the React `apps/admin` stub with a **SvelteKit (Svelte 5) app shell**. It shows the demo site's validation result, previews the rendered pages, and downloads the site as a ZIP built in the browser. The unused `Entry` / `createEntry` exports and the React dependencies are removed.

### Non-goals (this change)

- No editing: Svedit, the block editor UI, and saving changes are Milestone 2.
- No persistence, auth, media library, FTP/SFTP publishing or versioning (Milestones 3–4).
- No blocks beyond the three listed, and no forms, maps, multilingual sites or AI.

## Capabilities

### New Capabilities

- `site-document`: the shape of the site document (node types, properties, IDs, references) and the validation rules it must pass, including accessibility rules.
- `site-rendering`: how a valid document renders to semantic HTML pages and a theme stylesheet.
- `site-export`: how a rendered site becomes a deterministic static file tree and ZIP archive.

### Modified Capabilities

(none — no existing specs)

The admin shell in this change is a demonstration surface with no user-facing requirements of its own yet. Its behaviour gets a capability in Milestone 2, when editing arrives.

## Impact

- `packages/core` → `packages/site` (`@static-cms/site`): new modules for the document schema/types, validation, rendering and export. `slugify` is kept, and `Entry` / `createEntry` are removed. The package also exposes its demo fixture through a `fixtures/*` subpath export for the admin app.
- New runtime dependency in `@static-cms/site`: `fflate` (ZIP, works in browser and Node). New devDependency: `html-validate`.
- `apps/admin`: rewritten as a SvelteKit app (Svelte 5, `adapter-node`). The pnpm catalog drops `react`, `react-dom`, `@types/react*` and `@vitejs/plugin-react`, and adds the SvelteKit/Svelte packages.
- New fixture and script in `packages/site` and a root `build-demo` script. Build output goes to a git-ignored directory.
- CI: no workflow change. The new tests and the SvelteKit build run under the existing `turbo run typecheck test build`.
