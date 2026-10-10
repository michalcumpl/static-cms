# Proposal

## Why

A small business's website exists to bring customers, and the easiest way for a visitor to become
one is to leave a message or ask to be called back. Webmio sites can only show an email address
and a phone number; owners running a campaign ("Ask for a free consultation", "Let us call you
back") have nowhere to send people to collect their contacts. Forms are also what the import
leaves out most often: most of the example sites have one. The roadmap marks the contact form v1,
before the beta.

## What Changes

- **A `contact_form` block** in two kinds, chosen per block:
  - *Contact us:* name, email or phone (one of them), and a message;
  - *Let us call you back:* name, phone, and when to call (morning, afternoon, any time), with an
    optional note.

  Each block has a heading, a short text above the form, its button's label, and the address
  messages go to: the main location's email by default, or another address the owner confirms
  first. It renders as a plain HTML form that works without JavaScript, with the site's styles, a
  line saying what the details are used for, and a confirmation shown after sending.
- **A public endpoint on the admin** (`/forms/<project>/<block>`, at `app.webmio.eu` in
  production) that published sites post to: it checks the form (required fields, an email or a
  phone, lengths), stops spam without third-party scripts (a hidden honeypot field, a limit of
  messages per sender and per site each hour, too many links), stores the message, emails it to
  the block's address with the visitor's email as Reply-To, and sends the visitor back to the
  page, which shows the confirmation. The same endpoint serves sites on Webmio hosting, on Netlify
  and from a downloaded ZIP.
- **Messages in the panel:** a new *Messages* section lists each website's messages, newest
  first, with the form and page they came from; the owner can mark them handled, delete them, and
  export them as CSV for a campaign. Messages are deleted after 12 months.
- **Cross-site requests:** the admin's origin check, which SvelteKit does for every form, moves
  into the admin's own hooks so that it keeps protecting the admin's forms while the public
  endpoint accepts posts from the websites.
- **Ways in:** the Contact layout gains a *Contact us* form (so guided setups and new Contact pages
  have one), and the import maps an old site's contact form to the block instead of leaving it
  out.

## Capabilities

### New Capabilities

- `contact-messages`: the public endpoint, its checks and spam protection, delivery by email,
  confirming another recipient address, the Messages section, export and retention.

### Modified Capabilities

- `site-document`: the `contact_form` block, its fields and validation.
- `site-rendering`: the form's HTML, its confirmation, and the endpoint the site is rendered with.
- `site-editing`: inserting and editing the block on the canvas.
- `project-page`: the Messages section in the panel's section bar.
- `templates`: the Contact layout's form.
- `site-import`: an old site's contact form becoming a contact form block.

## Impact

- `@webmio/model`: the `contact_form` node, its validation, builder input; a schema version step.
- `@webmio/render`: the form block, its styles and site strings; a `formEndpoint` render option.
- `@webmio/templates`, `@webmio/import`: the Contact layout and the form mapping.
- Admin: `contact_messages` and `form_recipients` tables with a migration; the endpoint; mail
  through the existing mailer (SES in production via `admin-on-aws`); the Messages section;
  publishing, preview and the ZIP passing the endpoint; the origin check in `hooks.server.ts`;
  Czech and English strings.
- Depends on the admin being reachable from the internet for published sites to post to it,
  which `admin-on-aws` provides; locally the endpoint is the dev server.
- Non-goals: custom fields and form builders, file uploads, newsletter sign-up (`newsletter`),
  CAPTCHAs, autoresponders to the visitor, and forwarding to CRMs.
