# Product strategy

*Refreshed 2026-10-03. The roadmap that follows from it is in [`roadmap.md`](roadmap.md), open work
in [`tasks.md`](tasks.md).*

## Webmio

> **Your business has a website. You shouldn't have to manage a website.**

Webmio is **a managed website service for small businesses**. Internally we stop calling it a
CMS: the editor, the static build and the hosting are implementation details. The customer tells
us what their business is; we keep the website running.

Slogans to test:

- *Small business web. Solved!* (fits the thesis; the lead candidate)
- *Easy websites for AI age!* (catchy, but AI is out of the MVP, so it promises something we
  don't ship yet; keep it for when the AI features land)
- *Tell us what your business is, and we'll keep the website running.* (the thesis as a line)

Czech versions still to write; the Czech market comes first.

## Where we sit

| Product | What it says |
| --- | --- |
| WordPress | Build anything. |
| Wix, Squarespace | Design anything. |
| Sveltia, Decap | Manage your site's content in Git. |
| TinaCMS | Give developers powerful visual editing. |
| CloudCannon | Run your professional static-site infrastructure. |
| **Webmio** | **Tell us what your business is, and we'll keep the website running.** |

Hosting is turning into a commodity; the opportunity is in the product abstraction. Decap Turbo
(€19/month for hosted auth, database-backed content and roles around free Decap) shows people
will pay for managed infrastructure. It is also a warning: **we don't build "Decap Turbo for
SMBs"**, because that still sells the mental model of a CMS. We build the layer above it.

## Principles

1. **The customer maintains facts, not pages.** The admin is a *business control panel*:
   Business (company, hours, locations, contact), What you offer (services, pricing, FAQs), About
   you (team, photos, testimonials), Website (design, navigation, domain, SEO), Publish.
2. **One source of truth.** A `Business` with identity, contact, locations, hours and social
   profiles, plus the collections `Services[]`, `Team[]`, `Testimonials[]`, `FAQs[]` and
   `Media[]`. Pages are generated views of this data: one service shows up in the homepage
   highlights, the service index, its own page, the navigation, the metadata and the structured
   data. AI later edits `service.price`, not a visual page.
3. **Templates are complete website systems:** page architecture, typography, spacing,
   components, SEO defaults, schema.org markup, responsive behaviour, supported content types and
   navigation. We ship a few excellent ones, never a catalogue.
4. **Your content is yours; your design is replaceable.** Template switching is a first-class
   feature: choose another template, preview it, publish it, and nothing gets rewritten.
5. **Static publishing is invisible.** The customer sees *Save → Preview → Publish → ✓ Live*.
   Underneath: structured data → template renderer → static build → validation → CDN.
6. **Nothing can break.** Every publish validates required fields, checks links, generates
   metadata and structured data, optimises images, builds, deploys, verifies the deployment and
   keeps the previous version. If anything fails: *"Publishing failed. We kept your previous
   version online. Try again."*
7. **No page builder, as a hard rule.** No arbitrary columns, nested blocks, pixel positioning,
   per-page typography or CSS editor. Customisation is controlled: **brand** (logo, colours,
   fonts), **layout** (template, navigation, homepage sections on or off) and **content** (the
   business objects). After the guided setup, owners can use the **block editor** to add pages
   and arrange *business blocks* (services, team, contact, FAQ…) on them. Those blocks read the
   same data and are styled by the template, so the editor stays inside the rule.
8. **Website health over analytics or AI.** A daily check (SSL, domain, pages published, no
   broken links, images optimised, contact form working, required business information present,
   sitemap, valid structured data) ends in *"Website healthy"*. Later the same layer nudges the
   owner: "Your opening hours haven't been updated in 11 months." "A service has no
   description." That is worth more than a chatbot in the admin.
9. **Multi-site underneath, agencies later.** An account holds several websites (workspaces
   already do). Phase two: an agency sets up a client's site, and the client gets the simple
   admin. CloudCannon's partner-only plan ($10/month next to $49 Standard) shows agencies are a
   customer of their own.

## Templates

Four at launch:

| Template | For | Covers from our task list |
| --- | --- | --- |
| **Local Services** | plumbers, electricians, cleaners, repairs | |
| **Professional** | consultants, accountants, lawyers, agencies | financial advisory, law |
| **Hospitality** | hotels, B&Bs, cafés, restaurants | |
| **Personal Professional** | therapists, coaches, photographers, freelancers | one-person schools, tutors |

Because the platform owns the data model, any template produces a coherent business website.
Single-page vs. multi-page, and a full-screen image or video hero vs. a classic header, are
choices *inside* a template (a variant or a homepage-section option), not separate templates.

## Pricing

**€79 / 1 899 Kč a year, excluding VAT. One plan. Everything included:** website, managed admin,
connecting your own domain, SSL, CDN, templates, forms, image optimisation, backups, version
history, SEO basics, automatic publishing, support. **Building is free;** payment starts with the
first publish. **Domain registration is not included:** the owner brings their own domain or
registers one separately. No feature matrix, storage tiers, page limits, bandwidth calculator or "Pro SEO" upsell.

> **One website. One price. No maintenance.**

We don't sell "€10/month static hosting" (a commodity) and we don't compete with WordPress.com's
$4 plan: its real cost grows with plugins and upkeep. Our buyer asks *"Can I have a good website
without becoming responsible for a website?"* For reference, Squarespace starts around $16/month,
Wix around $17, GoDaddy around $10.


## MVP scope

| Area | In |
| --- | --- |
| Admin | Business, Services, Team, Testimonials, FAQs, Media, Website settings |
| Templates | 4, mobile-first, template switching |
| Publishing | preview, static build, validation, deploy, rollback, custom domain, SSL |
| Reliability | backups, version history, health checks |
| Pricing | €79 / 1 899 Kč a year excl. VAT, one plan, free until the first publish |

**Explicitly out:** e-commerce, appointments, memberships, blogging, plugins, marketplace,
AI agents, advanced analytics, free-form layout (columns, nesting, CSS).

### Where the MVP meets what's already built

Decided 2026-10-05:

- **Multilingual: kept, frozen.** It's built, tested, and Czech businesses often want an
  English version. We don't extend it or market it in the MVP. Shared business data across
  languages already fits the one-source-of-truth model.
- **The block editor stays for owners.** The guided setup and the template generate the first
  site; after that, owners edit it in the block editor: add pages, add, move and remove business
  blocks. Blocks that show collections (services, team, testimonials, FAQs) display the shared
  data rather than holding copies, so edits in the control panel and template switching still
  work. Template switching keeps the owner's pages and blocks and restyles them.
- **Netlify publishing: keep it until own hosting replaces it.** Customers never choose a
  publishing target.

## Brand and domains

Name: **Webmio**. Registered: `webmio.cz`, `webmio.eu`, `webmio.net`, `webmio.site`, `webmio.me`.

| Domain | Use |
| --- | --- |
| `webmio.cz` | Czech presentation website (first market) |
| `webmio.eu` | English presentation website; `app.webmio.eu` is the admin (one admin for all markets) |
| `webmio.site` | customers' free addresses and previews (`<site>.webmio.site`). It's separate from the admin's domain so customer content never shares cookies with it, like `github.io` or `netlify.app`; add it to the Public Suffix List later |
| `webmio.net` | infrastructure: the hostname customers point their DNS at (`www CNAME sites.webmio.net`), status page, mail-sending subdomain |
| `webmio.me` | held; redirects to `webmio.eu`. Possibly personal addresses for the Personal Professional template later |

The code still says `static-cms` (`@static-cms/site`, the repository); renaming it is a task.
