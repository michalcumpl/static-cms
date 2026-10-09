# Roadmap

**Goal:** Webmio, a managed website service for small businesses. The owner maintains the facts
about their business, and we keep a fast, valid, always-working website live. Why, and for whom:
[`strategy.md`](strategy.md).

**How to read this file.** Work happens in OpenSpec changes, and a change's name (such as
`image-cropping`) is its only identifier. Each phase below lists its changes with a status:

| Status | Meaning |
| --- | --- |
| **Done** | merged; the link goes to the change's archive (proposal, design, specs, tasks) |
| **Next** | the change being worked on, or the next one to start |
| **Planned** | before the private beta, in the order listed |
| **During the beta** | may land while the beta runs |
| **After the beta** | after launch |

Questions and loose ends that have no change yet are in [`tasks.md`](tasks.md); what the example
sites taught us about pages and blocks is in [`layouts.md`](layouts.md).

## Where we are (2026-10-08)

- **Built:** the site document, validation, rendering and export; on-page editing with Svedit;
  pages and menus, media, SEO, theme, version history, languages; publishing to Netlify;
  business data as collections with locations; the business control panel; 18 block types with
  their looks, from key figures to the hero slideshow; the seven example sites, loaded locally;
  cropping and turning images, and a focal point for each use of an image; templates (the
  Standard template, layouts for new pages, blocks hidden from the website).
- **Next:** `guided-setup` and the rest of phase 4 (templates).
  `own-hosting` (phase 5) doesn't depend on phases 3–4 and can start any time; it is the longest
  pole before the beta.
- **Private beta** (phase 7) when phases 3–6 work with at least two launch templates.

## Phases

### 1. Editor and publishing foundation · Done

| Change | What | Status |
| --- | --- | --- |
| [`site-render-pipeline`](../openspec/changes/archive/2026-09-29-site-render-pipeline/) | the site document, validation, HTML rendering, deterministic ZIP export; the admin shell with a preview | Done |
| [`inline-editing`](../openspec/changes/archive/2026-09-29-inline-editing/) | editing on the page with Svedit: text, marks, links, blocks, undo, problems panel, saving with conflict protection | Done |
| [`workspace-storage`](../openspec/changes/archive/2026-09-29-workspace-storage/) | workspaces and members, SQLite, project → site documents → versions, magic-link sign-in | Done |
| [`page-management`](../openspec/changes/archive/2026-09-29-page-management/) | pages, home page, menu with external links, page settings | Done |
| [`media-library`](../openspec/changes/archive/2026-09-30-media-library/) | uploads processed with sharp, WebP width ladder, `srcset`, media cleanup | Done |
| [`heic-upload`](../openspec/changes/archive/2026-09-30-heic-upload/) | iPhone photos converted to JPEG in the browser | Done |
| [`editor-polish`](../openspec/changes/archive/2026-09-30-editor-polish/) | select-all per field, readable problem messages | Done |
| [`image-blocks`](../openspec/changes/archive/2026-09-30-image-blocks/) | text with image, gallery, team, partner logos | Done |
| [`netlify-publishing`](../openspec/changes/archive/2026-09-30-netlify-publishing/) | publishing to the workspace's Netlify team, custom domains, redirects from old addresses | Done |
| [`seo-and-metadata`](../openspec/changes/archive/2026-10-01-seo-and-metadata/) | site settings, Open Graph, favicon, JSON-LD, `robots.txt` with AI switches, `404.html` | Done |
| [`business-info`](../openspec/changes/archive/2026-10-01-business-info/) | business details, contact and opening hours blocks, `LocalBusiness` data | Done |
| [`cta-and-testimonials`](../openspec/changes/archive/2026-10-01-cta-and-testimonials/) | call to action and testimonials blocks, the button panel | Done |
| [`theme-and-branding`](../openspec/changes/archive/2026-10-01-theme-and-branding/) | presets, colours with enforced contrast, self-hosted fonts, logo | Done |
| [`version-history`](../openspec/changes/archive/2026-10-01-version-history/) | every saved version kept, previewed and restorable | Done |
| [`languages`](../openspec/changes/archive/2026-10-01-languages/) | a document per language, shared business data, `hreflang`, language switcher | Done |
| [`language-tools`](../openspec/changes/archive/2026-10-01-language-tools/) | copy or link pages across languages, untranslated pages listed | Done |
| [`canvas-structure`](../openspec/changes/archive/2026-10-02-canvas-structure/) | block and item handles, the block picker with drawings | Done |
| [`admin-foundation`](../openspec/changes/archive/2026-10-05-admin-foundation/) | the admin's design system ("Glacier"), app shell, Czech and English interface | Done |
| [`project-tabs`](../openspec/changes/archive/2026-10-05-project-tabs/) | project pages with their own addresses, settings out of the editor, page actions menu | Done |

### 2. Business data as the source of truth · Done

| Change | What | Status |
| --- | --- | --- |
| [`business-collections`](../openspec/changes/archive/2026-10-05-business-collections/) | services, team, testimonials and FAQs held once per site; blocks show all or chosen items; questions block; social profiles | Done |
| [`package-split`](../openspec/changes/archive/2026-10-05-package-split/) | renamed to Webmio; `@webmio/model`, `@webmio/render`, `@webmio/export` | Done |
| [`business-locations`](../openspec/changes/archive/2026-10-06-business-locations/) | several locations, each with address, hours and contact | Done |

### 3. Business control panel · In progress

| Change | What | Status |
| --- | --- | --- |
| [`control-panel`](../openspec/changes/archive/2026-10-07-control-panel/) | Overview, Business, Website and Publish sections replacing the project tabs | Done |
| [`offer-and-about`](../openspec/changes/archive/2026-10-07-offer-and-about/) | What you offer and About you: list forms for services, questions, people, testimonials | Done |
| [`project-deletion`](../openspec/changes/archive/2026-10-07-project-deletion/) | deleting a website (offline at once), restoring it, removing it for good | Done |
| [`example-sites`](../openspec/changes/archive/2026-10-08-example-sites/) | `pnpm admin load-site`; the seven launch examples loaded locally | Done |
| [`image-cropping`](../openspec/changes/archive/2026-10-08-image-cropping/) | crop, focal point and rotation in the media library | Done |
| `guided-setup` | the "Tell us about your business" wizard | Planned |
| [`site-import`](../openspec/changes/archive/2026-10-09-site-import/) | import a public website by its address (version 1, no AI), reviewed before publishing; see [`import-mapping.md`](import-mapping.md) | Done |
| [`import-review-actions`](../openspec/changes/archive/2026-10-09-import-review-actions/) | the import review's retry (failed pages and images, the next pages) and fixes (images marked decorative, subheading levels); the same problem grouped ("13 pages have no description", leading to the site's description); and import fixes found on marespartners.cz (a logo and photo drawn by CSS, a black-and-white theme for a site without colours, the site description from the first paragraph) | Done |
| `import-languages` | "Import the Czech version": another language version of the old site as a project language, pages paired through the language switcher's links; and choosing which language is primary before importing | Planned |
| `import-existing-blocks` | the import fills blocks Webmio already has: grids of repeated cards (image, title, text, link) as a `cards` block instead of one gallery per card (found on vroomagazine, a stress test, not a target site), key figures, numbered steps, map embeds, booking buttons, opening hours, and award or partner logos in the footer as a logos block (Mareš's awards) | Planned |
| `banner-block` | a full-width image with a heading, text and a button anywhere on a page (the hero is first only); the import maps mid-page "hero" bands to it | Planned |
### 4. Templates as website systems · In progress

Blocks the example sites need come first, because the templates render them
([`layouts.md`](layouts.md) says which examples need each).

| Change | What | Status |
| --- | --- | --- |
| [`figures-and-steps`](../openspec/changes/archive/2026-10-08-figures-and-steps/) | key figures and steps blocks | Done |
| [`block-variants`](../openspec/changes/archive/2026-10-08-block-variants/) | full-photo hero, team list, services as a list or accordion, gallery of whole images | Done |
| [`collection-pages`](../openspec/changes/archive/2026-10-08-collection-pages/) | a page per service or project; the projects collection and block | Done |
| [`cards`](../openspec/changes/archive/2026-10-08-cards/) | cards: image, title, text and a link | Done |
| [`video`](../openspec/changes/archive/2026-10-08-video/) | YouTube and Vimeo videos, loaded only when clicked; project trailers | Done |
| [`hero-slideshow`](../openspec/changes/archive/2026-10-08-hero-slideshow/) | a hero of slides (stills or muted Vimeo clips), accessible, one small script | Done |
| [`menu-groups`](../openspec/changes/archive/2026-10-08-menu-groups/) | menu links grouped under a label, as a dropdown | Done |
| [`jobs`](../openspec/changes/archive/2026-10-08-jobs/) | job openings with a folded description and a contact | Done |
| `documents` | PDFs in the media library, a documents block, links to documents from texts | Planned |
| `business-details` | business types, company and regulatory details, billing address and bank details, check-in and check-out times | Planned |
| [`template-system`](../openspec/changes/archive/2026-10-09-template-system/) | the template contract and the Standard template, layouts (also offered by "Add page"), homepage sections on or off, template releases; see [`templates.md`](templates.md) | Done |
| `lighthouse-gate` | Lighthouse 100 in CI for every template and variant | Planned |
| `template-creative`, `template-education`, `template-law`, `template-finance`, `template-investment`, `template-rentals`, `template-exhibitions` | the seven launch templates, each checked against its example site; two before the beta | Planned |
| `template-switching` | choose another template, preview it with your own content, publish | Planned |
| `reviews` | reviews with a rating and its source ("4.9 on Google"), shown with the testimonials | During the beta |
| `timetable` | a table block for timetables and seasonal prices | During the beta |
| `booking` | the owner's booking service: a booking button, and its calendar where embedding is allowed | During the beta |
| `newsletter` | a signup form passing addresses to the owner's email service | During the beta |
| `design-touches` | a heavy display font for headings; a darker shade offered when a brand colour fails contrast | During the beta |

### 5. Our own hosting · Planned

| Change | What | Status |
| --- | --- | --- |
| `own-hosting` | S3 and CloudFront, `<site>.webmio.site`, atomic deploys, rollback | Planned |
| `safe-publishing` | the publish pipeline: link check, deploy verification, previous version kept on failure | Planned |

### 6. Domains and website health · Planned

| Change | What | Status |
| --- | --- | --- |
| `domain-guides` | DNS guides per registrar with a live record check | Planned |
| `contact-form` | a form endpoint, email to the owner, spam protection | Planned |
| `scheduled-jobs` | recurring server jobs in one place; the first removes deleted websites after 30 days | Planned |
| `website-health` | daily checks, *Website healthy*, alerts | Planned |

### 7. Private beta · Planned

| Change | What | Status |
| --- | --- | --- |
| `admin-on-aws` | the admin on one small EU server at `app.webmio.eu`, media in S3, Litestream backups | Planned |
| `presentation-site` | `webmio.cz` and `webmio.eu`, built and published with Webmio | Planned |
| `operator-console` | customers, websites, plan status, renewal dates, manual invoices | Planned |
| `legal-documents` | terms, privacy policy, data processing agreement, cookie statement, complaints procedure | Planned |

### 8. After the beta

| Change | What | Status |
| --- | --- | --- |
| `billing` | card payments from the first publish, renewals, invoices with VAT, open sign-up | After the beta |
| `google-sign-in` | Google sign-in next to magic links | After the beta |
| `owner-statistics` | privacy-friendly visit counts from CDN logs, in the panel and a monthly email | After the beta |
| `agencies` | an agency account sets up client websites; clients get the simple panel | After the beta |
| `ai-assist` | suggested alt and SEO texts, filling in the business, edits in plain words, translation | After the beta |
| `site-import` version 2 | AI sorts imported texts into services, team, testimonials and FAQs | After the beta |
| `import-insights` | each import records what it couldn't map (embeds, forms, section patterns, layouts) with a snapshot; the operator console groups them across imports as candidates for new blocks, looks and templates | After the beta |
| `template-local-services`, `template-hospitality`, `template-personal-professional` | the templates after launch | After the beta |

## Decisions

Architecture:

- **One document per site and language.** The whole site is one Svedit-compatible JSON
  document; the editor edits it directly, and every save is a snapshot. A project holds one
  document per language; theme, media and domain belong to the project.
- **The renderer is separate from the editor.** `@webmio/render` turns the document into HTML
  without Svelte or Svedit, in Node and in the browser.
- **Business blocks, not layout primitives:** "Services", not rows, columns and spacers.
- **Accessibility and standards are enforced** by validation, `html-validate` and the e2e tests.
- **The admin is SvelteKit full-stack** (`apps/admin`, `adapter-node`) on SQLite.
- **AI will edit the document** through the editor's operations, never raw HTML.

Product (2026-10, from the strategy refresh):

- **Business data is the source of truth; pages are views of it.** Blocks are the sections
  templates are built from.
- **No free-form page builder, as a hard rule.** The block editor stays for owners (business
  blocks only: no columns, nesting or CSS).
- **One hosting, ours.** Customers never choose a publishing target; Netlify stays until
  `own-hosting` replaces it. The ZIP download stays, so the content stays the owner's.
- **Multilingual is kept and frozen:** not extended or marketed in the MVP.
- **Invite-only beta for friends first:** it validates the data model, templates and publishing
  before anyone pays.
- **Images are WebP, lazy below the first screen;** the hero image isn't lazy (it would hurt LCP).
- **Example sites stay local:** their content belongs to the businesses, and the repository is
  public. Templates are checked automatically on fixture sites with invented content.

## Plans for the open phases

### 3. Business control panel

- **`guided-setup`:** a step-by-step "Tell us about your business" wizard (type of business →
  template suggestion → name, contact, hours → services → photos → preview) that ends in a
  previewable site built from layouts. The control panel and the block editor take over after it.
- **`site-import`** (version 1, no AI), the guided setup's second way in, "Start from your current
  website". The owner pastes an address and confirms they may use its content; the import takes
  texts and photos, never the design:
  - **pages and menu** from the navigation and `sitemap.xml`, same domain only, around 20 pages,
    following `robots.txt`;
  - **old addresses** per page, for redirects after the switch;
  - **business details** from schema.org data, `tel:`/`mailto:` links, addresses and social
    links; FAQs from `<details>` and FAQPage data;
  - **images** into the media library with their alt texts, de-duplicated; logo and favicon;
  - **a guessed theme** (colours and fonts) as a starting point;
  - **texts as plain blocks** on pages built from layouts;
  - **a review** before anything is published.

  It runs as a background job with progress and fetches safely (no internal addresses, size
  limits, timeouts; JavaScript-built sites need a headless browser). It produces what
  `load-site` reads, and the example sites are its test cases. The mapping rules are in
  [`import-mapping.md`](import-mapping.md).

### 4. Templates as website systems

- **A template contract:** the pages it generates, its sections and the collections they read,
  navigation, typography and spacing, SEO and schema.org defaults, homepage sections that can be
  switched on or off, and variants (single- or multi-page, image or video hero or a classic
  header).
- **Template, design, layout** (strategy, "Templates, designs and layouts"): the template is the
  website system and owns the spacing tokens; the design is the owner's brand and survives a
  switch; a layout is a page recipe, an ordered list of blocks with no styling. The guided setup
  and "Add page" create pages from layouts; after that a page is the owner's.
- **Versions:** a site records the template version it uses; a template declares the document
  formats and collections it supports, and its releases are tested against every fixture site.
- **Template switching** keeps the owner's pages and blocks and restyles them; collections a
  template doesn't show stay stored, and the preview says what won't be visible.
- **Lighthouse 100** (performance, accessibility, best practices, SEO, mobile settings) for every
  template and variant on fixture sites, as a CI gate; `html-validate` stays.
- **A developer guide**, `docs/templates.md`: the template contract, fixture sites, the gates, and
  how to add a block (node type and validation in `@webmio/model`, renderer and styles in
  `@webmio/render`, canvas component and picker drawing in the admin).

### 5. Our own hosting

- **S3 and CloudFront as our own Netlify:** one bucket and one multi-tenant distribution; each
  site a tenant with its own domains and an automatically issued certificate. Free address
  `<site>.webmio.site`; previews there too.
- **Atomic deploys and instant rollback:** each publish in its own folder, uploading only changed
  files; a CloudFront Function with a key-value store points each domain at its live publish.
- **The publish pipeline:** validate, check links, generate metadata and structured data, build,
  deploy, **verify the live deployment**, keep the previous version. On failure the previous
  version stays live and the owner sees *Try again*.
- Another `PublishTarget` next to Netlify; existing sites move over, then the Netlify adapter goes.

### 6. Domains and website health

- **`domain-guides`:** step-by-step DNS guides for the registrars our customers use (WEDOS,
  Forpsi, Active24, Websupport, Subreg, GoDaddy, Namecheap) with a live record check. Later the
  seamless version: nameservers to a Route 53 zone we create, existing records imported (email
  keeps working), bare domain, `www` and certificate set up automatically.
- **`scheduled-jobs`:** one place for the server's recurring work, each job's last run visible to
  operators, safe to run twice, resumed after a restart. Jobs: removing deleted websites 30 days
  after deletion, website health, custom domain checks, media cleanup (today
  `pnpm admin media-cleanup`), expired sign-in links and sessions, reminder emails; later backup
  checks and renewals.
- **`website-health`:** a daily check (SSL, domain, pages published, broken links, images,
  contact form, required business information, sitemap, structured data) shown as *Website
  healthy* or a list of what to fix, and emailed when something breaks.
- **`contact-form`:** submissions to a small endpoint, emailed to the owner, spam-protected
  without third-party scripts.
- Later: registering domains from the admin (Route 53 Domains; a Czech registrar's API for
  `.cz`), other DNS records editable in the admin.

### 7. Private beta

Invite-only, small and cheap, for friends.

- **`admin-on-aws`:** one small EU server, deploy pipeline, monitoring and alerts; media in S3;
  SQLite with Litestream to S3.
- **`presentation-site`:** what you get, €79 / 1 899 Kč a year excl. VAT (free until the first
  publish), FAQ, *Request access* form; Czech on `webmio.cz`, English on `webmio.eu`.
- **`legal-documents`:** Czech and English, reviewed by a lawyer before taking money.
- **`operator-console`** (minimum) and **emails:** renewal reminders, publish failures, health
  alerts.

### 8. After the beta

- **`ai-assist`** runs on our account within fair use, inside the yearly price (customers won't
  have API keys). Providers and models chosen then, comparing hosted APIs with open-weight models
  hosted in the EU on cost, quality and data handling.
- **`owner-statistics`:** visit counts from CDN logs, no cookies, no third-party scripts; not
  advanced analytics. The monthly email carries the health summary too.
- **`google-sign-in`:** Facebook isn't planned (little use for business owners, app-review
  overhead).
- **`operator-console`** grows: cash flow, trends, renewal forecasts.

## Known limits and later ideas from done work

- **Editing:** bold, italic and links can't overlap (Svedit marks are exclusive); no drag and
  drop on the canvas; page actions (add, delete) only in the editor, not on the Pages page;
  validation (problem) messages are in English in both interface languages.
- **Media:** no AVIF; no SVG logos; no straightening or flipping; share files are still cut
  from the centre, ignoring the focal point (cropping the share image to 1200:630 does it).
- **Theme:** no custom font uploads; four colour roles.
- **SEO:** later `llms.txt`, noindex per page, a focal point for share images.
- **Business data:** no dated exceptions to opening hours (holidays); restoring an old version of
  a non-primary language loses items only it had.
- **Languages:** the primary language can't be changed; no domain per language.
- **Hero slideshow:** clips come from Vimeo MP4 links, so visitors contact Vimeo when the page
  opens; clips uploaded to the media library would avoid that.
- **Deployment:** adapter-node needs `BODY_SIZE_LIMIT=25M` for photo uploads.
