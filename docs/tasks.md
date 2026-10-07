# Tasks

Open work and questions, triaged against [`strategy.md`](strategy.md). The letters refer to
milestones in [`roadmap.md`](roadmap.md). Implementation goes through OpenSpec changes.

## Decided

- [x] **Name:** Webmio, not Cumplify. Domains `webmio.cz`, `.eu`, `.net`, `.site`, `.me` are
  registered; their uses are in the strategy.
- [x] **Where sites are deployed:** our own hosting only (D). Customers don't choose between
  Netlify, Cloudflare, GitHub Pages or a repository, because publishing is invisible. "Cumplify,
  our own simple Netlify" *is* milestone D. Netlify stays until sites move over. For "your content
  is yours", the ZIP download stays, and a later full export can add the data as JSON.
- [x] **Start invite-only for friends:** milestone F. It validates the data model and templates
  rather than the block editor, which leaves the owner's path.
- [x] **Images as WebP, lazy-loaded:** done since the media library. Uploads become a WebP width
  ladder with `srcset`, and images below the first screen get `loading="lazy"`. The hero
  doesn't, on purpose: lazy-loading it would hurt LCP. Still open: AVIF.

- [x] **Multilingual:** kept and frozen; not extended or marketed in the MVP.
- [x] **Block editor:** stays for owners after the guided setup (pages and business blocks).
- [x] **Price:** €79 / 1 899 Kč a year excluding VAT. Building is free until the first publish.
  Domain registration is not included.

## Confirm

- [ ] **Slogan:** "Small business web. Solved!" as the lead; Czech versions.

## A. Business data

- [ ] **Data, template and theme versioning.** The document format is versioned with upgrades
  already (format 6). Add: a template version per site; a template declares which document
  formats and collections it supports; template releases are tested against all fixture sites.
  Themes stay part of the document (brand), not versioned separately.
- [x] **Split the site package** (`package-split`): `@webmio/model` (schema, types, validation,
  upgrades), `@webmio/render` (HTML, CSS, metadata, structured data) and `@webmio/export` (file
  tree, ZIP, robots, icons), pure TypeScript without filesystem access. `@webmio/templates`
  comes with `template-system`.
- [x] **Business data as collections** (`business-collections`): services, team, testimonials
  and FAQs held once per site, social profiles, document format 7.
- [ ] **Several locations** (`business-locations`), each with address, hours and contact.
- [x] Rename `static-cms` → `webmio` in packages, the admin and docs (`package-split`, step 1).

## B. Business control panel

- [ ] **Website creation guide, step by step:** the "Tell us about your business" wizard (type
  of business → template suggestion → name, contact, hours → services → photos → preview).
- [ ] **Import from your current website** (`site-import`): paste a public website's address;
  v1 without AI imports pages, menu, old-address redirects, business details, images, a guessed
  theme and plain-text blocks, with a review before publishing. v2 adds AI for services, team,
  testimonials and FAQs (after the beta).
- [ ] **Deleting a website:** owners only, confirmed by typing its name, offline at once;
  restorable from "Deleted websites", or removed for good with Delete now (`project-deletion`).
  Automatic removal after 30 days comes with scheduled jobs.
- [x] **Clean up the database:** delete the old projects with `project-deletion` (Atelier
  Aniděti's Netlify site included), then flatten the migrations into one, keeping accounts and
  the workspace (copy the database first; check the schema matches).
- [ ] **Example sites:** load the three launch examples into our database (`example-sites`):
  content in `apps/admin/data/examples/`, not committed; their pages as the first layouts.
- [ ] **Cropping and light editing of uploaded images:** crop to the shape a section needs,
  focal point, rotate. Done in the browser; the server keeps the original and derives variants.

## C. Templates

- [ ] **How to add a template:** a developer guide, `docs/templates.md`. It covers the template
  contract (pages, sections, the collections each reads, navigation, variants, SEO and schema.org
  defaults), fixture sites, and the Lighthouse and validation gates.
- [ ] **How a block looks technically, and how to add one:** the same guide. Today a block is a
  node type in `schema.ts` with its TypeScript type, validation rules, a renderer in
  `render/blocks.ts`, styles in the stylesheet, and an editor card. After A, a section is a
  renderer that reads collections plus template-scoped options. Owners place blocks in the
  editor; custom blocks made by customers are out (no free-form page builder).
- [ ] **Launch templates:** *Education* (after-school activities, courses, tutors), *Law* and
  *Financial advisory*, each with a migrated example site (Aniděti, Mareš Partners, Mortgage
  Specialist). Local Services, Hospitality and Personal Professional after launch. Single- vs.
  multi-page and image/video hero vs. classic header are template variants, not extra templates.
- [ ] **Layouts:** page recipes (ordered blocks, no styling) that make up a template's pages and
  are offered by "Add page" and the guided setup.
- [ ] **Lighthouse 100** for generated sites: Lighthouse CI on every template and variant, with
  mobile settings, failing the build below 100.

## E. Domains and health

- [ ] **Scheduled jobs** (`scheduled-jobs`): recurring server work in one place, safe to run
  twice. First jobs: removing deleted websites 30 days after deletion, website health, domain
  checks, media cleanup, expired sign-in links and sessions, reminder emails.
- [ ] **Domains and DNS:** for the beta, guides per registrar for pointing an existing domain,
  with a live record check. Registration comes later (Route 53 Domains, a Czech registrar API for
  `.cz`).

## F. Private beta

- [ ] **Legal documents:** terms of service, privacy policy (GDPR), data processing agreement,
  cookie statement, complaints procedure. Czech and English; have a lawyer review them before
  taking money.
- [ ] **Operator admin panel:** customers, websites, plan status, renewals and invoices for the
  beta. Cash flow, trends and predictions after it (G).
- [ ] **Mailing:** renewal reminders, publish failures and health alerts for the beta. The
  monthly stats email comes with owner statistics (G).

## G. After the beta

- [ ] **Site statistics for owners:** visit counts from CDN logs, no cookies, no third-party
  scripts. Not advanced analytics.
- [ ] **Sign-in with Google** next to email magic links. Facebook is not planned: it adds little
  for business owners and comes with app-review overhead.
- [ ] **AI integration:** out of the MVP. When it comes, it runs on our account within fair use,
  inside the yearly price, because customers won't have API keys. Choose providers and models then,
  comparing hosted APIs with open-weight models hosted in the EU on cost, quality and data
  handling.

## Research

- [ ] **ChatGPT sites:** look at how OpenAI's website creation works. Note where it overlaps the
  "Tell us about your business" setup and the AI plans, and what it can't do (hosting, domains,
  health, keeping the site maintained).
- [ ] Check our competitor notes from the strategy (Publii themes, Decap Turbo, CloudCannon
  pricing) again before the beta.
