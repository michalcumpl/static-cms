# Design

## Context

Published sites are static files: on Webmio hosting (S3 and CloudFront, routed by `packages/edge`),
on Netlify, or downloaded as a ZIP. They are rendered by `@webmio/render` through `@webmio/export`
in three places: publishing (`lib/server/publishing/publish.ts`), the preview
(`lib/server/preview.ts`) and the ZIP download, which exports in the browser
(`lib/DownloadZip.svelte`). Nothing on the sites runs code on a server, so a form needs an
endpoint elsewhere: the admin, which `admin-on-aws` puts on the internet at `app.webmio.eu`. The
admin sends mail through a `Mailer` (SES in production, an outbox in development and tests) and
builds absolute links from the request's origin (`adapter-node`'s `ORIGIN`). SvelteKit refuses
cross-site form posts with its built-in origin check, which can only be turned off for the whole
app. The session cookie is `SameSite=Lax`. A project's addresses are in `project_hosting`
(Webmio hosting) and the Netlify hosting row (`default_url`, `domain`).

## Goals / Non-Goals

**Goals:**
- A form that works without JavaScript on every published copy of a site, and fails closed: no
  message is stored or sent unless it passes every check.
- The admin's own forms as protected against cross-site posts as today.

**Non-Goals:**
- A general form builder, file uploads, autoresponders, CRMs, a JavaScript-enhanced form.

## Decisions

### 1. The block: `contact_form` with a kind, not two block types

`contact_form`: `kind` (`contact` | `callback`), `heading`, `text`, `button`, `recipient` (an email,
`""` for the main location's). One type keeps the picker, validation and rendering in one place;
the kind decides the fields. The kind is stored as `form_kind` (a node's `kind` would read like
the schema's own). No schema version step: like `jobs`, a new block type changes no existing
document.

### 2. Rendering with `formEndpoint`

`RenderOptions.formEndpoint` (e.g. `https://app.webmio.eu/forms/p_3kTq9xW1bZcA`) is passed by
publishing, the preview and the ZIP export (the admin's origin and the project's ID). The form
posts to `<formEndpoint>/<block id>` with the fields, a hidden `_page` (the page's path from the
site's root) and a honeypot `website` field (`hidden` attribute, `tabindex="-1"`,
`autocomplete="off"`, outside the accessibility tree). The confirmation is in the page, after the
fields, shown by CSS when the form's fragment is targeted: the endpoint redirects to
`<page>#<form-id>-sent` and `:target` swaps fields for the message, which has `role="status"`.
A refused message redirects to `#<form-id>-error-<code>`, which shows that reason above the
fields, and the visitor's text comes back through the browser's history (Back), since a static
page can't refill a form; the error says so. Without `formEndpoint`, the block shows the business's
email and phone.

*Alternative:* posting to the site's own domain through CloudFront to the admin. Rejected for now:
it needs another origin and behaviour in the edge stack for Webmio hosting only, and Netlify and
ZIP copies would still need the admin's address.

### 3. The endpoint `/forms/[project]/[block]`

A `+server.ts` `POST` that never needs a session:
1. Honeypot filled → 303 to the confirmation, nothing else.
2. The project exists and isn't deleted, and its saved primary document (or any language's) has
   the block; else 404.
3. Rate limits from an in-memory sliding window keyed by the client's address (from
   `X-Forwarded-For` behind Caddy, the socket otherwise) and by project: 5 and 50 an hour.
4. Field checks per kind (the model's email and phone rules; lengths; at most 3 links).
5. Store in `contact_messages`, then email (decision 4), then 303 to `Origin` + `_page` +
   `#…-sent` when `Origin` is one of the project's addresses (its Webmio host, custom domain,
   Netlify `default_url` and domain, and the admin itself for the preview), else to the admin's
   `/forms/sent` page.

### 4. Delivery and recipients

The recipient is the block's address when confirmed for the project, else the main location's
email, else none (stored only). `form_recipients` (project, email, confirmed_at, token hash,
created_at) holds addresses the owner named; saving a document with a new address sends it a
confirmation email (`/forms/confirm/<token>`, the token's SHA-256 stored, as login tokens are).
The message email: subject "Nová zpráva z webu {site}: {heading}", a plain-text body with the
fields, the page and a link to the Messages section, Reply-To the visitor's email. A failed send
sets `delivered = false`; the message stays.

### 5. Storage and the Messages section

```
contact_messages: id, project_id (→ projects, cascade), block_id, kind, heading, page, name,
                  email, phone, when, message, delivered, handled_at, created_at
form_recipients:  project_id (→ projects, cascade), email, token_hash, confirmed_at, created_at
```

`/p/[project]/messages` (members): the list with filters (form, unhandled), Handled and Delete as
form actions, and `/p/[project]/messages.csv` for the export. The section bar shows the unhandled
count; the Overview a card. Messages older than 12 months are deleted at start-up and after each
new message (`scheduled-jobs` takes this over later).

### 6. The origin check moves into the hooks

`svelte.config.js` sets `csrf: { trustedOrigins: ["*"] }`; `hooks.server.ts` refuses a
`POST`/`PUT`/`PATCH`/`DELETE` with a form content type (`application/x-www-form-urlencoded`,
`multipart/form-data`, `text/plain`) whose `Origin` isn't the admin's, except under `/forms/`,
answering 403 as SvelteKit did. The `SameSite=Lax` session cookie stays a second guard. A test
posts cross-site to an action and to the endpoint.

### 7. Ways in

The shared Contact layout gains `contact_form` (kind `contact`, "Napište nám" / "Write to us",
"Odeslat" / "Send", recipient `""`) after opening hours, so pages made from it and guided setups get
a form. The import's walk recognises a `<form>` whose inputs include a name-like field and an
email or tel field and a `<textarea>` (or a phone without a message for a callback), and makes a
contact form segment; other forms stay left out.

## Risks / Trade-offs

- [The admin is down, so forms fail] → the visitor's browser shows an error page from the
  admin's host; the block's text can name the email too. `admin-on-aws` monitors the admin.
- [Spam getting through honeypot and limits] → the Messages section lets the owner delete it; a
  later change can add a proof-of-work or a delay check if needed.
- [Personal data stored] → only what the visitor sent, deleted after 12 months or with the
  project; the form says what the details are for. The `legal-documents` change covers the
  processing agreement.
- [The in-memory rate limit resets on restart] → acceptable on one server; it limits bursts, not
  totals.

## Migration Plan

A Drizzle migration adds the two tables, numbered after the latest on `main` when implementing.
The block type needs no schema version step. Sites published
before this change keep working; their next publish includes the endpoint.
