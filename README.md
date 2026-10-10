<h1 align="center"><img src="docs/assets/webmio-logo.svg" alt="Webmio" width="420"></h1>

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
  business blocks are added, moved and duplicated with handles. Photos are cropped and turned
  in the editor, and framed on a focal point. Every change can be undone, and every save is a
  version you can preview and restore.
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
- Responsive WebP images with `srcset`, lazy-loaded below the first screen, and framed on the
  focal point the owner chose wherever a block cuts them to a shape.
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
| Images | sharp on the server (type checks, metadata stripped, a WebP width ladder, crops and turns as new images); HEIC converted in the browser |
| Sign-in and email | magic links sent over SMTP (Nodemailer); invite-only |
| Publishing | static export to a file tree or ZIP (fflate); Webmio hosting on S3 and a CloudFront multi-tenant distribution (Pulumi), with Netlify's API for websites already there |
| Quality | Vitest unit tests, Playwright end-to-end tests, `html-validate` on rendered pages, GitHub Actions CI |
| Process | spec-driven changes with [OpenSpec](https://github.com/Fission-AI/OpenSpec): every feature has a proposal, design, specs and tasks |

### Repository layout

| Path | What it is |
| --- | --- |
| [`packages/model`](packages/model) | `@webmio/model`: the site document's schema and types, validation, format upgrades, the site builder, test fixtures |
| [`packages/templates`](packages/templates) | `@webmio/templates`: the templates (design tokens, styles, default looks, layouts), making pages from layouts, template upgrades; see [`docs/templates.md`](docs/templates.md) |
| [`packages/import`](packages/import) | `@webmio/import`: reading a public website's pages into a site document, its images and a report, for "Start from your current website"; see [`docs/import-mapping.md`](docs/import-mapping.md) |
| [`packages/render`](packages/render) | `@webmio/render`: the document to HTML, CSS, metadata and structured data, with no UI framework; runs in Node and the browser |
| [`packages/export`](packages/export) | `@webmio/export`: the published file tree and ZIP, icons, `robots.txt`, sitemap |
| [`packages/edge`](packages/edge) | `@webmio/edge`: Webmio hosting's edge code, the CloudFront Function's router and the Lambda@Edge not-found handler, in plain JavaScript |
| [`apps/admin`](apps/admin) | the admin: control panel, editor, media library, publishing, accounts |
| [`infra`](infra) | Webmio hosting's infrastructure as a Pulumi program, with `dev` and `prod` stacks ([`infra/README.md`](infra/README.md)) |
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
its own `SECRET_KEY` for encrypting publishing tokens.

### Production

Production runs on AWS: one server with the admin's Docker image (`apps/admin/Dockerfile`),
media in S3, the database replicated to S3 by Litestream, and mail through Amazon SES. Every
push to `main` that passes CI is deployed. [`infra/README.md`](infra/README.md) is the operator
guide, covering setting up, deploys, restoring and alarms.

The server sets the admin's environment from Parameter Store:

| Variable | What it is |
| --- | --- |
| `ORIGIN` | the admin's address, such as `https://app.webmio.eu` |
| `SECRET_KEY` | encrypts hosting tokens at rest |
| `DATABASE_PATH`, `MIGRATIONS_DIR` | set by the image: `/data/app.db`, `/app/drizzle` |
| `MEDIA_BUCKET` | images go to this S3 bucket; without it, to the folder `MEDIA_DIR` |
| `MAIL_TRANSPORT=ses`, `MAIL_FROM` | mail through SES; `SMTP_URL` with `MAIL_FROM` sends through SMTP instead |
| `ADDRESS_HEADER=X-Forwarded-For`, `XFF_DEPTH=1` | the visitor's address behind Caddy |
| `WEBMIO_*`, `AWS_REGION` | Webmio hosting, below; the server's role supplies AWS credentials |

`GET /healthz` answers 200 once the database is open and migrated, and 503 otherwise.

### Webmio hosting

With Webmio hosting configured, websites that were never published go to our own hosting, at
`<name>.webmio.site` and their custom domains; nothing has to be connected first. Websites
already on Netlify keep publishing there. Without it (development, tests), publishing goes to
the workspace's Netlify team as before. Deploy the infrastructure as
[`infra/README.md`](infra/README.md) describes, then set the stack's outputs in the admin's
environment:

| Variable | What it is |
| --- | --- |
| `WEBMIO_HOSTING_BUCKET` | the S3 bucket websites are uploaded to |
| `WEBMIO_HOSTING_KVS_ARN` | the CloudFront key-value store the edge routes hostnames by |
| `WEBMIO_HOSTING_DISTRIBUTION_ID` | the multi-tenant distribution that serves every website |
| `WEBMIO_HOSTING_CONNECTION_GROUP_ID` | the connection group custom domains' tenants join |
| `WEBMIO_SITES_DOMAIN` | the free addresses' domain (default `webmio.site`) |
| `WEBMIO_CNAME_DOMAIN` | where websites' CNAME targets live, `<name>.<this>` (default `sites.webmio.net`) |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | a local admin's AWS access, from the stack's IAM user; the server uses its role instead |

Webmio hosting counts as configured when the first four are set. The end-to-end tests use
`WEBMIO_HOSTING_FAKE_DIR`, a folder that stands in for AWS; it is ignored in production.

Every publish checks the website's own links before uploading, verifies the live website after
the switch, and puts the previous version back when that fails. On Webmio hosting and on Netlify
alike, it also asks the links to other websites, and lists those that don't answer as warnings.
`PUBLISH_CHECK_OUTSIDE_LINKS=false` turns that off, for servers without internet access such as
the end-to-end runs. `PUBLISH_VERIFY_DEADLINE_MS` shortens verification's two-minute deadline;
the end-to-end runs use it, since their fake hosting answers at once.

| Command | What it does |
| --- | --- |
| `pnpm dev` | builds the packages and runs the admin |
| `pnpm test` | unit tests of every package |
| `pnpm --filter @webmio/admin test:e2e` | Playwright end-to-end tests |
| `pnpm typecheck` · `pnpm lint` | types, and Biome's checks |
| `pnpm build-demo` | renders the demo site into `packages/export/out/website.zip` |
| `pnpm --filter @webmio/admin admin <command>` | server administration: `create-user`, `media-cleanup`, `load-site`, `import-site`, `media-upload`; on the server `docker exec webmio-admin node dist/cli/admin.js <command>` |

## Documentation

- [Strategy](docs/strategy.md): what Webmio is, for whom, principles, templates, pricing, MVP
  scope.
- [Roadmap](docs/roadmap.md): the phases, every change with its status, and decisions.
- [Tasks](docs/tasks.md): open questions and loose ends without a change yet.
- [Layouts](docs/layouts.md): page recipes and the blocks the example sites need.
- [Import mapping](docs/import-mapping.md): how an existing website maps onto Webmio's data,
  for the planned importer.
- [Specs](openspec/specs): what the system does today, capability by capability.
