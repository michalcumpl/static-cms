# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`), and every
site string to each site language. The type check and the untranslated-text test enforce this.

## 1. Model

- [x] 1.1 The `contact_form` node type with `...PAGE_BLOCK` (design decision 1; no schema version step, as for `jobs`: a new block type changes no existing document), its validation (`empty-heading`, `empty-label`, `invalid-email`, `no-recipient`) and `blocks.contactForm`; verify unit tests "A callback form for a campaign", "Nowhere to send", "Not an email", and the every-block site validating

## 2. Rendering

- [x] 2.1 `renderContactForm` for both kinds with `formEndpoint` (decision 2): labelled fields, the hidden `_page` and honeypot fields, the privacy line, the button, the `:target` confirmation and error messages, and the fallback without an endpoint; styles from the tokens; site strings in every site language; verify unit tests "A Contact us form", "After sending" (the confirmation's markup and CSS), "No endpoint", `html-validate`, and snapshots unchanged apart from the stylesheet

## 3. The endpoint and storage (admin)

- [x] 3.1 `contact_messages` and `form_recipients` with a Drizzle migration (numbered after the latest on `main`); verify `db.test.ts` lists both tables and that they go with their project
- [x] 3.2 Move the origin check into `hooks.server.ts` with `trustedOrigins: ["*"]` (decision 6); verify a test that a cross-site form post to an admin action gets 403, a same-origin one passes, and a cross-site post under `/forms/` passes the hook
- [x] 3.3 `POST /forms/[project]/[block]` (decision 3): honeypot, the block's existence, rate limits, field checks, storing, the redirect to the project's own address or `/forms/sent`; verify route tests "A message sent", "No way to answer", "A block that isn't there", "A bot fills every field", "Flooding", too many links, and a page on another site
- [x] 3.4 Delivery (decision 4): the recipient (confirmed address, else business email, else none), the message email with Reply-To, `delivered = false` on failure, confirmation emails for new addresses on save and `/forms/confirm/<token>`; verify tests "Answering from the inbox", "Another address", a failing mailer, and a confirmed address staying confirmed

## 4. Publishing and the editor

- [x] 4.1 Pass `formEndpoint` from publishing, the preview and the ZIP export (decision 2); verify that a published bakery page's form posts to the admin's `/forms/<project>/<block>` and the preview's to the dev server
- [x] 4.2 The editor: the picker entry and drawing, `insertContactForm`, the canvas component (heading and text in place, fields shown), and the Contact form panel (kind, button, address with "Waiting for confirmation", link to Messages); verify e2e "Insert a callback form" and "A campaign address"

## 5. Messages in the panel

- [x] 5.1 The Messages section (decision 5): the list, filters, Handled and Delete, the CSV export, the retention note and clean-up, the section bar's count and the Overview's card; verify route tests for each action, "A campaign's leads" (the CSV), "Handled", "A year later", members only, and e2e: a message sent from the preview of the bakery's Contact page appears in Messages and in the outbox

## 6. Ways in

- [x] 6.1 The Contact layout's form (decision 7); verify "A Contact page with a form", that a guided setup with the Contact page has a form, and that every layout's page validates
- [x] 6.2 The import's contact forms: the bakery fixture's form becomes a *Contact us* block, a sign-up form stays left out; verify "A contact form" and "A newsletter sign-up", and update the report snapshot

## 7. Documentation and integration

- [x] 7.1 `docs/layouts.md`, `docs/import-mapping.md` (forms) and the README's block list; run `pnpm turbo run typecheck test build`, Biome and the admin's end-to-end tests, and verify everything passes
