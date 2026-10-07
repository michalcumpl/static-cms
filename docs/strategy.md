# Product strategy

*Refreshed 2026-10-03; launch templates and layouts decided 2026-10-07. The roadmap that follows from it is in [`roadmap.md`](roadmap.md), open work
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
3. **Templates are complete website systems:** page architecture (a set of layouts),
   typography, spacing, components, SEO defaults, schema.org markup, responsive behaviour,
   supported content types and navigation. We ship a few excellent ones, never a catalogue.
4. **Your content is yours; your design is replaceable.** Template switching is a first-class
   feature: choose another template, preview it, publish it, and nothing gets rewritten.
5. **Static publishing is invisible.** The customer sees *Save → Preview → Publish → ✓ Live*.
   Underneath: structured data → template renderer → static build → validation → CDN.
6. **Nothing can break.** Every publish validates required fields, checks links, generates
   metadata and structured data, optimises images, builds, deploys, verifies the deployment and
   keeps the previous version. If anything fails: *"Publishing failed. We kept your previous
   version online. Try again."*
7. **No page builder, as a hard rule.** No arbitrary columns, nested blocks, pixel positioning,
   per-page typography or CSS editor. Customisation is controlled: **brand** (the design: logo,
   colours, fonts), **structure** (template, layouts, navigation, homepage sections on or off)
   and **content** (the business objects). After the guided setup, owners can use the **block editor** to add pages
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

Six at launch, each proven on a real website migrated to Webmio as a presentation example (the
designs needn't match the originals):

| Template | For | Example |
| --- | --- | --- |
| **Education** | after-school activities, clubs, courses, small schools, tutors | [Aniděti](https://www.anideti.cz/), an after-school animation club for primary school children |
| **Law** | law firms, attorneys, notaries | [Mareš Partners](https://www.marespartners.cz/), a law firm |
| **Financial advisory** | mortgage brokers, independent advisers, accountants | [Mortgage Specialist](https://www.mortgagespecialist.cz/), an independent mortgage broker |
| **Investment management** | investment funds, asset and wealth managers | [Fond 10X](https://fond10x.cz/en/), a private equity fund for qualified investors |
| **Short-term rentals** | holiday cottages, chalets, apartments, guesthouses | [Roubenka Svitávka](https://roubenkasvitavka.cz/), a log cottage with garden chalets for groups |
| **Exhibitions** | exhibitions, galleries, fairs | example to be chosen |

After launch: **Local Services** (plumbers, electricians, cleaners, repairs), **Hospitality**
(hotels, cafés, restaurants) and **Personal Professional** (therapists, coaches,
photographers, freelancers).

The examples are built in our own database, not committed: their texts, people and photos belong
to their owners. The templates' automated checks run on fixture sites with invented content.

Because the platform owns the data model, any template produces a coherent business website.
Single-page vs. multi-page, and a full-screen image or video hero vs. a classic header, are
choices *inside* a template (a variant or a homepage-section option), not separate templates.

### Templates, designs and layouts

Three layers, each with one job:

| Layer | What it decides | Owned by | On a template switch |
| --- | --- | --- | --- |
| **Template** | the website system: which pages exist, how every block is rendered (typography scale, spacing tokens, block variants), navigation, SEO and schema.org defaults | us | replaced |
| **Design** | the owner's brand: colours, fonts, logo, corner radius | the owner | kept |
| **Layout** | a page recipe: an ordered list of blocks with their settings, such as "Services page = hero, services (all), questions, call to action" | us; the owner picks one | kept, restyled |

- **Layouts carry no styling.** No spacing, widths or alignment: those are the template's tokens.
  A layout that styled itself would overlap the template and break switching.
- **A template's page architecture is a set of layouts.** "Homepage sections on or off" is a
  layout with optional blocks. Layouts are data, like the rest of the template.
- **Owners meet layouts when a page is made:** the guided setup builds the first pages from them,
  and "Add page" offers them ("About us", "Services", "Pricing", "Contact"), already filled from
  the collections, instead of an empty page.
- **Most layouts are shared** across templates (Contact, About, Services, FAQ); a template adds
  its own where its trade needs one (Education: "Courses" with prices and the next term).
- **The examples show which layouts a template needs.** Aniděti's "Jak pracujeme", "Nabídka
  kroužků" and "Lektorky" are the Education template's How we work, Courses and Teachers
  layouts.
- **After a page is made it's the owner's:** the block editor changes it freely within the
  rules, and nothing links it back to the layout.

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
| Admin | Business, Services, Team, Testimonials, FAQs, Media, Website settings; deleting and restoring a website |
| Templates | 6 (Education, Law, Financial advisory, Investment management, Short-term rentals, Exhibitions), mobile-first, layouts, template switching |
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
  work. Template switching keeps the owner's pages and blocks and restyles them. New pages start
  from a layout.
- **Owners can delete a website** (decided 2026-10-07). Workspace owners only, confirmed by
  typing its name; a published website goes offline. Deleted websites can be restored with their
  versions and images, or removed for good at once. Removing them automatically 30 days after
  deletion comes later with scheduled jobs.
- **Import from your current website** (decided 2026-10-07): the guided setup can start from
  an existing public website's address. Version 1 has no AI: pages, menu, redirects from the
  old addresses, business details, images, a guessed theme and texts as plain blocks, reviewed
  before publishing. Version 2 adds AI to sort texts into services, team, testimonials and
  FAQs. Only content the owner may use is imported, never the design.
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

The code is renamed to Webmio (`@webmio/*` packages, the admin's product name); only the
repository's folder keeps its old name.
