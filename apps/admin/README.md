# @static-cms/admin

The Static CMS app: SvelteKit (Svelte 5) with `adapter-node`, so the UI and the server routes
ship as one Node app. For now it is a shell around the demo site from `@static-cms/site`. Editing
arrives with Svedit in the next milestone.

## Run

```sh
pnpm install
pnpm dev             # from the repo root: builds @static-cms/site, then starts vite dev
```

Open the URL Vite prints (usually http://localhost:5173).

| Route                  | What it does                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| `/`                    | Validates the demo site, lists its pages, and has a **Download ZIP** button. |
| `/preview/…`           | Serves the exported demo site, rendered with base path `/preview/`.          |
| `/demo/demo-site.json` | The raw fixture document; `/demo/media/<name>` serves its images.            |

**Download ZIP** builds the archive in the browser with `exportSite` and `zipFiles`. It is
byte-identical to `pnpm build-demo`'s `packages/site/out/website.zip`.

## Other scripts

```sh
pnpm --filter @static-cms/admin typecheck   # svelte-kit sync + svelte-check
pnpm --filter @static-cms/admin test        # vitest: load function and endpoints
pnpm --filter @static-cms/admin build       # production build in dist/
pnpm --filter @static-cms/admin start       # run the build: node dist
```

The app uses TypeScript 6 (the `typescript6` catalog in `pnpm-workspace.yaml`), because
`svelte-check` needs TypeScript's JavaScript API, which TypeScript 7 no longer provides.
