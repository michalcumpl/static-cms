# @static-cms/admin

The Static CMS app: SvelteKit (Svelte 5) with `adapter-node`, so the UI and the server routes
ship as one Node app. It stores one site as a JSON working copy, previews it, and exports it
with `@static-cms/site`.

## Run

```sh
pnpm install
pnpm dev             # from the repo root: builds @static-cms/site, then starts vite dev
```

Open the URL Vite prints (usually http://localhost:5173).

| Route                | What it does                                                                         |
| -------------------- | ------------------------------------------------------------------------------------ |
| `/edit/`, `/edit/<slug>/` | Edits the site in place (Svedit). Cmd/Ctrl+S saves the whole site. |
| `/`                  | Validates the saved site, lists its pages, and has a **Download ZIP** button.        |
| `/preview/…`         | The saved site, exported with base path `/preview/`. Lists the problems if invalid.  |
| `GET /api/site`      | `{ document, version, problems }` for the working copy.                              |
| `PUT /api/site`      | Saves `{ document, baseVersion }`: 200, 409 (outdated version), 422 (broken document). |
| `/api/media/<name>`  | Image files the site uses (for now, the demo fixture's media).                       |

**Download ZIP** builds the archive in the browser with `exportSite` and `zipFiles`. For the
unedited demo site it is byte-identical to `pnpm build-demo`'s `packages/site/out/website.zip`.

## The working copy

The site lives in `$SITE_DATA_DIR/site.json` (default: `data/site.json` in this app's directory,
git-ignored). It is created from `@static-cms/site/fixtures/demo-site.json` the first time the
site is read. Delete it to start over from the fixture.

- Saves are written atomically (temp file, then rename) and one at a time.
- Each save names the version it was based on. A save based on an outdated version is refused
  with 409 instead of overwriting newer changes.
- A save is refused (422) only when the document is structurally broken. Unfinished content,
  such as an empty heading, is saved; `/preview/` and the ZIP wait until it is fixed.

**No authentication yet.** Anyone who can reach the server can change the site. Run it locally or
on a trusted network until accounts arrive (Milestone 3).

## Other scripts

```sh
pnpm --filter @static-cms/admin typecheck   # svelte-kit sync + svelte-check
pnpm --filter @static-cms/admin test        # vitest: store, API and routes
pnpm --filter @static-cms/admin build       # production build in dist/
pnpm --filter @static-cms/admin start       # run the build: node dist
```

The app uses TypeScript 6 (the `typescript6` catalog in `pnpm-workspace.yaml`), because
`svelte-check` needs TypeScript's JavaScript API, which TypeScript 7 no longer provides.
