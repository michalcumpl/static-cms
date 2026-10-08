# Webmio

> **Your business has a website. You shouldn't have to manage a website.**

Webmio is a managed website service for small businesses. The owner keeps the facts about their
business up to date (services and prices, team, opening hours, locations, testimonials), and
Webmio turns them into a fast, accessible, standards-valid static website and keeps it live.
There's no page builder to fight with and no hosting to choose.

**Status:** in development, before a private beta. The editor, rendering, publishing and the
business control panel work; templates, our own hosting and the beta are next. See the
[roadmap](docs/roadmap.md).

## What it does

**For business owners**

- **A business control panel:** Business (company, locations, opening hours, contact, social
  profiles), What you offer (services, questions), About you (team, testimonials), Website
  (pages and menu, languages, domain) and Publish.
- **Business data as the single source of truth:** a service is written once and shows up
  everywhere it belongs: home page highlights, the services page, its own page, the structured
  data.
- **Editing on the page itself:** text, links and images are edited where they appear, and
  business blocks are added, moved and duplicated with handles. Every change can be undone,
  and every save is a version you can preview and restore.
- **18 business blocks** with their looks: hero (beside, full photo or slideshow), text, text
  with image, services (cards, list or accordion), projects and project pages, team, gallery,
  partner logos, cards, videos, key figures, steps, testimonials, questions, call to action,
  contact, opening hours and job openings.
- **Design within guard rails:** theme presets, brand colours with enforced contrast,
  self-hosted fonts, a logo. No columns, nesting or CSS, by design.
- **Several languages per site:** one document per language, shared business data, `hreflang`
  alternates and a language switcher.
- **Publishing:** one click from preview to live, atomic deploys, custom domains, redirects from
  old addresses, and a ZIP download of the whole site.

**For the people who visit those sites**

- Static HTML and CSS, with JavaScript only for videos, the hero slideshow and menu dropdowns,
  and everything works without it.
- Accessibility checked by the site's validation (heading order, image descriptions, colour
  contrast) and by `html-validate` in the tests.
- Responsive WebP images with `srcset`, lazy-loaded below the first screen.
- SEO built in: metadata, Open Graph, sitemap, `robots.txt` (with switches for AI crawlers),
  JSON-LD for the business, its locations and services.
- Privacy by default: no cookies and no third-party scripts. Videos load from YouTube or Vimeo
  only after a click; the one exception is a hero slideshow's optional clips, which stream from
  Vimeo when the page opens.

## Technology

| Area | What we use |
| --- | --- |
| Language and tooling | TypeScript throughout; a pnpm workspace with Turborepo; Biome for linting and formatting |
| Admin | SvelteKit (Svelte 5) full-stack with `adapter-node`; [Svedit](https://github.com/michael/svedit) for editing on the page |
| Data | SQLite (better-sqlite3) with Drizzle ORM; one JSON site document per language, versioned on every save; Litestream for backups |
| Images | sharp on the server (type checks, metadata stripped, a WebP width ladder); HEIC converted in the browser |
| Sign-in and email | magic links sent over SMTP (Nodemailer); invite-only |
| Publishing | static export to a file tree or ZIP (fflate); Netlify's API today, our own S3 and CloudFront hosting planned |
| Quality | Vitest unit tests, Playwright end-to-end tests, `html-validate` on rendered pages, GitHub Actions CI |
| Process | spec-driven changes with [OpenSpec](https://github.com/Fission-AI/OpenSpec): every feature has a proposal, design, specs and tasks |

### Repository layout

| Path | What it is |
| --- | --- |
| [`packages/model`](packages/model) | `@webmio/model`: the site document's schema and types, validation, format upgrades, the site builder, test fixtures |
| [`packages/render`](packages/render) | `@webmio/render`: the document to HTML, CSS, metadata and structured data, with no UI framework; runs in Node and the browser |
| [`packages/export`](packages/export) | `@webmio/export`: the published file tree and ZIP, icons, `robots.txt`, sitemap |
| [`apps/admin`](apps/admin) | the admin: control panel, editor, media library, publishing, accounts |
| [`openspec`](openspec) | the specs (`openspec/specs`) and every change, done ones archived with their proposal and design |
| [`docs`](docs) | strategy, roadmap and design notes (below) |

The packages import one way only, model ← render ← export, and a test checks it.

## Getting started

Requires Node.js 22 or later and pnpm.

```sh
pnpm install
pnpm --filter @webmio/admin admin create-user you@example.com "My business"   # prints a sign-in link
pnpm dev                                                                      # http://localhost:5173
```

In development the admin keeps its database, media and outgoing emails under `apps/admin/data/`
(emails are written to `data/outbox/` unless `SMTP_URL` and `MAIL_FROM` are set), and generates
its own `SECRET_KEY` for encrypting publishing tokens. In production set `SECRET_KEY`, `ORIGIN`,
`DATABASE_PATH`, `MEDIA_DIR`, `SMTP_URL`, `MAIL_FROM` and `BODY_SIZE_LIMIT=25M`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | builds the packages and runs the admin |
| `pnpm test` | unit tests of every package |
| `pnpm --filter @webmio/admin test:e2e` | Playwright end-to-end tests |
| `pnpm typecheck` · `pnpm lint` | types, and Biome's checks |
| `pnpm build-demo` | renders the demo site into `packages/export/out/website.zip` |
| `pnpm --filter @webmio/admin admin <command>` | server administration: `create-user`, `media-cleanup`, `load-site` |

## Documentation

- [Strategy](docs/strategy.md): what Webmio is, for whom, principles, templates, pricing, MVP
  scope.
- [Roadmap](docs/roadmap.md): the phases, every change with its status, and decisions.
- [Tasks](docs/tasks.md): open questions and loose ends without a change yet.
- [Layouts](docs/layouts.md): page recipes and the blocks the example sites need.
- [Import mapping](docs/import-mapping.md): how an existing website maps onto Webmio's data,
  for the planned importer.
- [Specs](openspec/specs): what the system does today, capability by capability.
