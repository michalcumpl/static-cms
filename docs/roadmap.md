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

## Where we are (2026-10-10)

- **Built:** the site document, validation, rendering and export; on-page editing with Svedit;
  pages and menus, media, SEO, theme, version history, languages; publishing to our own
  hosting (S3 and CloudFront, `<site>.webmio.site`, custom domains), with Netlify for websites
  already there; business data as collections with locations; the business control panel; 20
  block types with their looks, from key figures to the hero slideshow, banners and contact
  forms that email the owner; the seven example
  sites, loaded locally; cropping and turning images, and a focal point for each use of an
  image; templates (the Standard template, layouts for new pages, blocks hidden from the
  website); importing a website from its address; the guided setup, which builds a first site
  from the owner's answers.
- **Next:** the rest of phase 3 (`import-languages`) and phase 4 (templates).
  Phase 5 is done: every publish
  checks links, verifies the live website and keeps the previous version on failure. Our
  hosting runs in the `dev` stack; `prod` is deployed before the beta.
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
| [`guided-setup`](../openspec/changes/archive/2026-10-10-guided-setup/) | the "Tell us about your business" wizard: type, design, contact and hours, services, photos and pages, previewed, building the first site from the layouts | Done |
| [`site-import`](../openspec/changes/archive/2026-10-09-site-import/) | import a public website by its address (version 1, no AI), reviewed before publishing; see [`import-mapping.md`](import-mapping.md) | Done |
| [`import-review-actions`](../openspec/changes/archive/2026-10-09-import-review-actions/) | the import review's retry (failed pages and images, the next pages) and fixes (images marked decorative, subheading levels); the same problem grouped ("13 pages have no description", leading to the site's description); and import fixes found on marespartners.cz (a logo and photo drawn by CSS, a black-and-white theme for a site without colours, the site description from the first paragraph) | Done |
| `import-languages` | "Import the Czech version": another language version of the old site as a project language, pages paired through the language switcher's links; and choosing which language is primary before importing | Planned |
| [`import-existing-blocks`](../openspec/changes/archive/2026-10-09-import-existing-blocks/) | the import fills blocks Webmio already has: grids of repeated cards (image, title, text, link) as a `cards` block instead of one gallery per card (found on vroomagazine, a stress test, not a target site), key figures, numbered steps, map embeds, booking buttons, opening hours, and award or partner logos in the footer as a logos block (Mareš's awards) | Done |
| [`banner-block`](../openspec/changes/archive/2026-10-10-banner-block/) | a full-width photo band with a heading, text and a button anywhere on a page (the hero is first only), a primary-colour band without a photo; the import maps mid-page photo bands to it | Done |
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

### 5. Our own hosting · Done

| Change | What | Status |
| --- | --- | --- |
| [`own-hosting`](../openspec/changes/archive/2026-10-09-own-hosting/) | S3 and CloudFront, `<site>.webmio.site`, atomic deploys, rollback; new websites only, Netlify ones stay | Done |
| [`safe-publishing`](../openspec/changes/archive/2026-10-09-safe-publishing/) | the publish pipeline: link check, outside links as warnings, verifying the live website, previous version kept on failure, *Try again* | Done |

### 6. Domains and website health · In progress

| Change | What | Status |
| --- | --- | --- |
| `domain-guides` | DNS guides per registrar with a live record check | Planned |
| [`contact-form`](../openspec/changes/archive/2026-10-10-contact-form/) | **v1:** an interactive contact form block that emails each message to the owner: "Contact us" and "Let us call you back" (name, phone or email, a message), which owners use in campaigns to collect contacts; spam protection without third-party scripts; the import maps old sites' forms to it; messages in the panel's Messages section | Done |
| `scheduled-jobs` | recurring server jobs in one place; the first removes deleted websites after 30 days | Planned |
| `website-health` | daily checks, *Website healthy*, alerts | Planned |

### 7. Private beta · Planned

| Change | What | Status |
| --- | --- | --- |
| [`admin-on-aws`](../openspec/changes/archive/2026-10-10-admin-on-aws/) | the admin on one small EU server at `app.webmio.eu`, media in S3, Litestream backups, deploys from `main`, alarms; running on `dev`, `prod` set up before the beta | Done |
| `bare-domain-redirect` | `https://<domain>` redirects to `https://www.<domain>` with a valid certificate and the same path, from a tiny redirect server of its own; customers set `@ A` to its address instead of their registrar's forwarding; running on `dev` | Next |
| `presentation-site` | `webmio.cz` and `webmio.eu`, built and published with Webmio | Planned |
| `operator-console` | the operator's own part of the admin: an overview and stats, customers and their websites, inviting users, deleting websites and accounts, plan status, renewal dates, manual invoices | Planned |
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
  custom domain a tenant with an automatically issued certificate, pointed at its website's own
  `<name>.sites.webmio.net`. Free address `<site>.webmio.site`; previews there later.
- **Atomic deploys and instant rollback:** each publish in its own folder, uploading only changed
  files; a CloudFront Function with a key-value store points each domain at its live publish, and
  a Lambda@Edge function answers missing addresses with the publish's redirects and 404 page.
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
- **`contact-form`** (v1, before the beta): a contact form block in two kinds, "Contact us" (name,
  email or phone, a message) and "Let us call you back" (name and phone, a good time to call),
  that owners place on pages and link from campaigns to collect contacts. Submissions go to a
  small endpoint on our hosting, are emailed to the owner (and listed in the panel), and are
  spam-protected without third-party scripts (a honeypot field, a time check, rate limits). The
  guided setup can add it to the Contact page, and the import maps an old site's contact form to
  it instead of leaving it out.
- Later: registering domains from the admin (Route 53 Domains; a Czech registrar's API for
  `.cz`), other DNS records editable in the admin.

### 7. Private beta

Invite-only, small and cheap, for friends.

- **`admin-on-aws`:** one small EU server, deploy pipeline, monitoring and alerts; media in S3;
  SQLite with Litestream to S3.
- **`prod` before the beta, not before:** `dev` proved every part (deploys and rollback,
  restores, alarms, mail, publishing), so `prod` waits until the first invited users need a
  stable `app.webmio.eu`; [`infra/README.md`](../infra/README.md)'s first deploy lists the steps.
  SES production access applies to the whole account, so it is requested early: until then
  `dev` mails only verified addresses.
- **`bare-domain-redirect`:** CloudFront serves only `www.<domain>`, and registrars' forwarding
  (Webglobe's, for one) can't do HTTPS. So a tiny server of its own (a `t4g.nano` with an
  Elastic IP, ≈ €7 a month) answers bare domains with Caddy:
  - It gets a certificate on demand, after asking the admin whether the domain belongs to a
    connected website. It asks only when it issues or renews one, so admin deploys and outages
    don't affect redirects. HTTP redirects never ask.
  - It redirects 301 to `https://www.<domain>`, keeping the path and query, cached for a day.
  - The Domain page shows `@ A <address>` and asks to remove the registrar's forwarding. The
    domain check verifies that the bare domain has only that address and that it redirects; the
    website's readiness still depends on `www.` alone.
  - **Later, CloudFront's Anycast static IPs:** 3 IPs for every customer's bare domain, but a
    fixed fee reported as $3,000 a month per list. Worth it only at several hundred websites
    with bare domains. The website moves to a connection group with static IPs, and customers
    change their `@ A` record once.
- **`presentation-site`:** what you get, €79 / 1 899 Kč a year excl. VAT (free until the first
  publish), FAQ, *Request access* form; Czech on `webmio.cz`, English on `webmio.eu`.
- **`legal-documents`:** Czech and English, reviewed by a lawyer before taking money.
- **`operator-console`** (minimum) and **emails:** renewal reminders, publish failures, health
  alerts.
  - **What the console covers:** an overview with stats, every customer and website, inviting
    users, and deleting websites and accounts. It replaces the server commands (`create-user`
    and the others) for everyday work.
  - **Where it lives:** the same app on the same server, but behind its own address (such as
    `ops.webmio.eu`), its own route group and an operator role with a second sign-in factor.
    It is not a separate app, for three reasons:
    - It needs the admin's own logic. Deleting a website or account is the same purge of
      media, hosting and tenants; invitations are the same tokens and mail.
    - SQLite has one writer, on one server.
    - One image means one deploy.
  - **When a separate app would be worth it:** only if the console ever has to run where the
    admin doesn't.

### 8. After the beta

- **`ai-assist`** runs on our account within fair use, inside the yearly price (customers won't
  have API keys). Providers and models chosen then, comparing hosted APIs with open-weight models
  hosted in the EU on cost, quality and data handling.
- **`owner-statistics`:** visit counts from CDN logs, no cookies, no third-party scripts; not
  advanced analytics. The monthly email carries the health summary too.
- **`google-sign-in`:** Facebook isn't planned (little use for business owners, app-review
  overhead).
- **`operator-console`** grows: billing (with `billing`), cash flow, trends, renewal forecasts.

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
