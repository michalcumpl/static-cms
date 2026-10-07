# @webmio/admin

The Webmio admin app: SvelteKit (Svelte 5) with `adapter-node`, so the UI and the server routes
ship as one Node app. People sign in with an emailed link and edit the websites (projects) of the
workspaces they belong to. Sites are stored in SQLite, validated with `@webmio/model`, previewed
with `@webmio/render`, and exported with `@webmio/export`.

## First run (development)

```sh
pnpm install
pnpm --filter @webmio/admin admin create-user you@example.com "My studio"
pnpm dev             # from the repo root: builds the @webmio packages, then starts vite dev
```

`create-user` prints a sign-in link. Open it (the default link targets http://localhost:5173) and
press **Continue**. Without `SMTP_URL`, emails aren't sent: they are written to `data/outbox/` and
logged by the server, so later sign-in links and invitations appear in the dev server's output.

An installation that still has a Milestone 2 `data/site.json` imports it on first start into a
workspace named "Default". The first user created with `create-user` becomes its owner.

## Routes

| Route                                  | What it does                                                       |
| -------------------------------------- | ------------------------------------------------------------------ |
| `/`                                    | Your workspaces and projects (the workspace isn't shown if you have only one). Owners also see **Deleted websites**, with **Restore** and **Delete now**. |
| `/signin`, `/signin/<token>`           | Email a sign-in link; the link page has a **Continue** button.     |
| `/invite/<token>`                      | Accept an invitation (creates the account if needed).              |
| `/w/<workspace>/members`               | Members, roles and invitations (owners change them).               |
| `/w/<workspace>/new`                   | Owners: create a project from the starter site.                    |
| `/p/<project>`                         | The project's panel. **Overview**: live state, Publish, problems (each a link to where it's fixed, items' problems to their list form), and a card per section. |
| `/p/<project>/business`                | **Business** of a language (`?lang=`): name, type, locations with hours, social profiles; Save, Undo. |
| `/p/<project>/offer`                   | **What you offer** of a language (`?lang=`): the services and the questions as list forms (formatting, add, move, duplicate, delete); the pages showing each list. |
| `/p/<project>/about`                   | **About you** (`?lang=`): the people and the testimonials as list forms, with portraits and photos from the media library. |
| `/p/<project>/website`                 | **Website** (`?lang=`): site name, description, favicon, share image, AI switches; the design card (**Change design** opens the editor); for owners, **Delete website** (typing its name; a published site goes offline). |
| `/p/<project>/website/pages`           | **Pages and menu** of a language (`?lang=`): home, menu, translation marks, Edit and Preview. |
| `/p/<project>/website/languages`       | **Languages**: add, publish, hide, remove; what is not translated yet. |
| `/p/<project>/website/domain`          | **Domain**: the address and the custom domain with its DNS records. |
| `/p/<project>/publish`                 | **Publish**: publish history, **Make live again**, **Download ZIP**. |
| `/p/<project>/publish/versions`        | **Versions** of a language (`?lang=`): preview and restore versions. |
| `/p/<project>/settings`, `/pages`, …   | The former tabs' addresses; they redirect (308) to their places in the panel. |
| `/p/<project>/edit/`, `…/edit/<page-id>/` | The editor (Svedit); `/edit/` opens the home page. Cmd/Ctrl+S saves the whole site. |
| `/p/<project>/preview/…`               | The saved site as it would be published, or its problems.          |
| `DELETE /api/projects/<project>`       | Owners: delete the website (`{ name }`); its Netlify site is deleted first. Restore and Delete now are under `/api/workspaces/<workspace>/deleted/<project>`. |
| `GET/PUT /api/projects/<project>/site` | The document: 200, 409 (outdated version), 422 (broken document).  |
| `/api/projects/<project>/media/<name>` | The project's images.                                              |

Everything except sign-in and invitations needs a session. Project pages and APIs answer
"not found" to people who aren't members of the project's workspace.

## Editing

- **Blocks and items have handles.** Pointing at a block, or putting the cursor in it, shows a
  handle at its left edge; items (services, photos, people, logos, testimonials, list items)
  get their own. A handle selects its block or item and opens Move up, Move down, Duplicate and
  Delete; a block's also has Add block above and below. The toolbar names what is selected.
- **Adding blocks happens on the canvas only.** "+ Add block" appears above and below the block
  under the pointer or the cursor (an empty page always shows one) and opens a picker: a card per
  block with a small drawing of it in the site's primary colour, its name and a description.
  Blocks that can't go there are greyed out with the reason. A new block is scrolled into view,
  briefly outlined, and gets the cursor. The left column has only the languages and pages.
- **Pages have a "⋯" menu** in the left column (and so do the menu's external links): Rename,
  Duplicate, Move up and down, Show in or Remove from menu, Set as home and Delete, with the
  reason shown when an action isn't possible. Dragging entries still works.
- **Site and business settings are in the panel,** not in the editor: the site name and
  description, favicon, share image and AI switches in the **Website** section, the business and
  its locations in the **Business** section. They are saved there, as in the editor (Save, Undo,
  a refusal if the site changed elsewhere). Problems about them, and "Edit business details" on a
  block, lead there; the editor's left column links back to **Overview**.
  The editor's right column has **Page** and **Design** (the theme); the problems panel is under
  the pages in the left column.
- **Services, questions, people and testimonials** are edited in **What you offer** and **About
  you** as list forms, as well as on the canvas: the forms use the editor's session, so formatting,
  Undo and the item actions behave the same. Which items a block shows is chosen in the editor.
- **Keyboard.** Esc selects the paragraph, item or block around the cursor, step by step; Alt+↑/↓
  moves it. Handles and their menus are buttons and menus (arrow keys, Enter, Esc).
- The handles are placed with CSS anchor positioning, as Svedit's selection outline is; without
  it they stay hidden and the keyboard and toolbar still work.

## Accounts

- **Invite-only.** The admin command creates users with their own workspace; owners invite
  others from the members page. There is no public sign-up.
- **Roles.** Owners manage members and create projects; editors edit and save. A workspace
  always keeps at least one owner.
- **Links.** Sign-in links work once, for 15 minutes; invitations once, for 7 days. Both open a
  page with a button, because mail scanners open links on their own. Requests for sign-in links
  are limited to 5 per 15 minutes per address and per client.
- **Sessions** last 30 days from last use, in an HTTP-only cookie. Only hashes of links and
  sessions are stored.

## Interface language

- **Czech and English.** The language is chosen in the account menu (top right), or with the
  "Čeština · English" links under the sign-in and invitation forms, and applies at once. Signed
  in, the choice is stored on the account and follows the person to other devices; signed out,
  a cookie remembers it. Without a choice, the browser's preferred languages decide, else
  English. Emails follow the same rule: sign-in links in the account's language (else the
  page's), invitations in the inviting owner's.
- **Only the admin's own text is translated.** The site's content stays in its language, and
  the site's validation (problem) messages are English for now.
- **Adding a message:** add the key to `src/lib/i18n/en.ts` and the same key to `cs.ts` (a
  missing one fails `pnpm typecheck`), then use `i18n.t("area.key", { name })` in components
  (`getI18n()`), `i18n(event.locals.locale).t(…)` on the server, or return `said("area.key")`
  from library code and `say()` it where the request's language is known. Counted words are
  `{ one, few, other }` objects chosen by `{count}`. `src/lib/i18n/guard.test.ts` fails on
  interface text written outside the catalogues; mark text that is the same in every language
  with `data-i18n-ignore`.

## Configuration

| Variable         | Default          | Meaning                                                        |
| ---------------- | ---------------- | -------------------------------------------------------------- |
| `ORIGIN`         | –                | Public URL, e.g. `https://admin.example.cz`. **Required in production**: adapter-node uses it for request URLs, cross-site checks and the links in emails. The admin command uses it for printed links (default `http://localhost:5173`). |
| `DATABASE_PATH`  | `data/app.db`    | SQLite database.                                               |
| `MEDIA_DIR`      | `data/media`     | Project images, one folder per project: WebP variants, and metadata-free originals in `originals/` (never served). |
| `SECRET_KEY`     | –                | At least 32 characters. Encrypts the workspaces' Netlify tokens. **Required for publishing in production; back it up with the database** (without it, owners must reconnect Netlify). The development server (`pnpm dev`) generates one in `SECRET_KEY_FILE` when it's unset. |
| `SECRET_KEY_FILE`| `data/secret.key`| Development only: where the generated key is kept (readable by its owner only, git-ignored). |
| `NETLIFY_API_URL`| `https://api.netlify.com` | Only for tests: points publishing at the fake Netlify (`e2e/fake-netlify-server.ts`). |
| `BODY_SIZE_LIMIT`| `512K`           | adapter-node's request size limit. **Set it to `25M` in production**, or image uploads over 512 KB are refused before they reach the app (the server warns at startup). |
| `SMTP_URL`       | –                | e.g. `smtps://user:password@smtp.example.cz:465`. Without it, email goes to the outbox. |
| `MAIL_FROM`      | –                | Sender, e.g. `Webmio <web@example.cz>`. Required with `SMTP_URL`. |
| `OUTBOX_DIR`     | `data/outbox`    | Where emails go without SMTP.                                  |
| `SITE_DATA_DIR`  | `data`           | Where a Milestone 2 `site.json` is looked for (imported once). |
| `MIGRATIONS_DIR` | `drizzle`        | Database migrations, applied at startup.                       |

Relative defaults are resolved from the working directory, so run the app and the admin command
from `apps/admin`.

## Production on a VPS

```sh
pnpm install --frozen-lockfile
pnpm turbo run build --filter @webmio/admin...
cd apps/admin
ORIGIN=https://admin.example.cz BODY_SIZE_LIMIT=25M SMTP_URL=… MAIL_FROM=… node dist
```

- Run one process (the database handles concurrent saves; sign-in rate limits are in memory).
  Put a reverse proxy with HTTPS in front, and keep `ORIGIN` equal to the public URL.
- Deploy the `drizzle/` folder with the app; migrations run when the server starts.
- The migrations were flattened into one (`0000_initial`) on 2026-10-07. A database created
  before then is upgraded by an earlier version first (commit `f28943a` has the last of the old
  migrations), and its `__drizzle_migrations` record replaced by the new migration's hash and
  timestamp, as was done for the development database.
- `better-sqlite3` is a native module. Prebuilt binaries cover Linux x64/arm64 on Node 22; on
  other platforms install a C++ toolchain (`build-essential`, `python3`) before `pnpm install`.
  It is pinned to 12.x because 13.0.3 crashes on Node 22.13.
- `sharp` (image processing) ships prebuilt binaries for Linux x64/arm64 with glibc; on Alpine
  (musl) or other platforms see sharp's installation docs.
- The site fonts are read at runtime from the `@fontsource-variable/*` packages in
  `node_modules`: they are runtime dependencies of the app (a `--prod` install keeps them), not
  bundled into `dist/`, so deploy `node_modules` with the build. The server serves them at
  `/fonts/<name>`; published sites get their own copies under
  `assets/fonts/`, with each font's licence (SIL Open Font Licence).
- For email that arrives, set up SPF and DKIM for `MAIL_FROM`'s domain with your SMTP provider.
  If a sign-in email goes missing, `pnpm admin create-user` refuses existing accounts, but the
  person can request a new link at `/signin`.

### Images

- Members upload **JPEG, PNG and WebP** images of up to **20 MB** and **40 megapixels**. SVG,
  HEIC, animated images and anything else are refused by the server.
- **HEIC/HEIF photos (iPhones) are converted to JPEG in the browser** before uploading, in the
  editor's media library: Safari decodes them itself; other browsers load
  [libheif](https://github.com/strukturag/libheif) (`libheif-js`, about 2 MB, LGPL-3.0) as a
  separate chunk the first time a HEIC photo needs it. Converted photos are at most 4096 px on
  their longer side (iOS Safari can't draw larger canvases; the widest published variant is
  2400 px). The server itself still refuses HEIC.
- Every upload is turned upright and stripped of all metadata (EXIF, GPS, XMP, IPTC). It is
  stored as a metadata-free original, which is never published, plus WebP variants 480, 960,
  1600 and 2400 px wide (never wider than the image). Pages use the variants through `srcset`.
- The site's logo (Theme tab) is shown in the header at most 3rem tall, through the same WebP
  variants; transparent PNG logos stay transparent.
- Images appear in the hero, text with image, gallery, team and partner logos blocks. Each block
  gives its images a fixed shape (gallery 4:3, round portraits, logos at most 4rem tall) and a
  fixed `sizes`; the library's multi-select adds several photos, people or logos at once.
- Uploads are processed one at a time; a 40-megapixel image needs about 160 MB of memory.
- "Remove from library" only hides an image: pages, older versions and undo may still use it.
  `pnpm admin media-cleanup` deletes the files of removed images that no stored version uses.
- Image files from before the library (such as an imported `hero.png`) are registered at
  startup under their file name and get their variants; the file itself stays in place.
- A site's favicon and share images get extra files, made from the original the first time a
  preview, download or publish needs them and kept next to the variants: square PNG icons of
  32, 180 and 512 px (the whole image fitted in, on transparent padding, white for the 180 px
  phone icon) and a 1200 × 630 JPEG cut from the middle of the image. Cleanup deletes them with
  the rest of an image's files.

### Publishing

- Each workspace publishes to **its own Netlify team**: an owner creates a personal access
  token in Netlify (User settings → Applications → Personal access tokens) and connects it
  under *Netlify* on the workspace. The token is stored encrypted with `SECRET_KEY` and never
  shown again. A Netlify token grants access to that Netlify account, so a Netlify user
  dedicated to publishing is a good idea where the plan allows it.
- Hosting one agency account's sites for many clients isn't allowed under Netlify's standard
  terms without a reseller agreement, which is why each client connects their own team.
- Netlify's pricing is credit-based: every publish (production deploy) uses 15 of the team's
  credits; the free plan has 300 a month (sites pause when they run out). Netlify allows at
  most 3 deploys a minute and 100 a day per account.
- The first publish creates a site named `sc-<project>` (`https://sc-<project>.netlify.app`).
  Publishes deploy only the files Netlify doesn't have yet, atomically; earlier addresses of
  renamed pages redirect (301) through `_redirects`; *Make live again* restores an earlier
  deploy instantly.
- Custom domains: the Publishing page shows the DNS records (bare domain: `A` to `75.2.60.5`
  and `CNAME www` to the site; subdomain: `CNAME` to the site). Netlify issues the certificate
  once DNS points at it.
- GDPR: published sites are served by Netlify (a US company, with a DPA and SCCs); tell your
  clients.
- A publish runs inside the server process; a restart interrupts it and marks it failed. The
  site keeps showing its previous publish.
- Every published site has a favicon (when set in the editor's Site settings), link previews
  (Open Graph and Twitter tags with the share image), structured data for search engines on the
  home page, its own "page not found" page (`404.html`, which Netlify serves automatically) and
  a `robots.txt` naming the sitemap. The ZIP download has no address, so it leaves out what needs
  one: the sitemap, page addresses in link previews, share images and structured data.
- **AI crawlers:** the Site settings' switches *AI search and answers* and *AI training* add
  `Disallow` groups for those crawlers to `robots.txt` (the lists are in
  `packages/export/src/robots.ts`, checked against the vendors' documentation on
  2026-09-30). `robots.txt` is a request, not a lock: well-known crawlers follow it, but some
  fetchers acting on a user's request say they may not (ChatGPT-User, Perplexity-User,
  Meta-ExternalFetcher), and nothing stops a crawler that ignores it. Search engines and
  link-preview fetchers are never blocked.

### Backups

Back up `app.db` and the `media/` folder together.

- **Continuous (recommended):** [Litestream](https://litestream.io) streams the database to
  S3-compatible storage, e.g. `litestream replicate data/app.db s3://bucket/app.db`, running
  next to the app. Copy `data/media/` to the same storage on a schedule (e.g. `rclone sync`).
- **Nightly:** `sqlite3 data/app.db ".backup data/backup.db"` (safe while the app runs), then copy
  the backup and `data/media/` off the server.

### Upgrading: site document format 2

Page management (explicit home page, a slug on every page) stores site documents in format 2.
Documents stored in format 1 are upgraded whenever the server reads them, and the upgrade is
saved with the project's next save. There is no database migration and nothing to run.

- **Before deploying**, take a backup (a Litestream snapshot or `sqlite3 … ".backup …"`).
- **Rolling back** to a build from before format 2: projects saved since the upgrade are in
  format 2, which the older build refuses, so their editor and preview show an unsupported-version
  problem. Restore the database from the pre-upgrade backup (losing saves made since), or
  redeploy the newer build.
- Editor addresses changed from `/p/<project>/edit/<slug>/` to `/p/<project>/edit/<page-id>/`;
  old bookmarks show "not found". `/p/<project>/edit/` still opens the home page.

### Upgrading: site document format 3

Site settings (description, favicon, share images, AI switches) store site documents in format
3. As with format 2, older documents are upgraded when the server reads them and saved in the
new format with the project's next save; take a backup before deploying, and a rollback to an
older build needs the pre-upgrade backup for projects saved since.

### Upgrading: site document format 4

Business details (address, phone, opening hours) store site documents in format 4. Older
documents are upgraded the same way, with empty details, every day closed and the footer switch
on, so sites look the same until an owner fills in the business settings. The same backup and rollback
notes apply.

The contact block's "Show on map" is a plain link (the business's own map listing, or a Google
Maps search for its address); published sites load nothing from Google until a visitor clicks it.

### Languages

A project's primary language is the one it was created in (Czech for every project from before
languages). Others are added on the project page as a copy of the primary, hidden until
published; the editor switches between them at the top of the left column (`?lang=en`). The
theme, logo, favicon, default share image, AI switches and business details are shared: edited in the
primary and applied to every other language whenever it is read, never stored in it. Removing a
language deletes its document and versions; hiding keeps them.

### History

Every save is kept as a version, per language, with who saved it. The History page
(`/p/<project>/history`, linked from the editor and the project page) lists them, previews any of
them read-only, and restores one: the old document is saved again as the newest version, so
nothing is lost and a restore can be undone. Restoring the primary language also brings back its
shared fields (theme, favicon, business details) for every language. Versions are never pruned;
each is the whole document as JSON, typically 20–200 KB.

### Upgrading: site document format 5

Pages gain a `translation_key` (their own ID for existing pages) in format 5, upgraded on read as
before. The database migration adds `projects.primary_lang`, `site_documents.published` and the
`publish_documents` table, and fills it in for earlier publishes so their redirects keep working.

### Upgrading: site document format 6

The theme stores fonts from a fixed list (`lora`, `system-sans`, …) instead of CSS font lists in
format 6, and the site gains a logo and the switch "show the site name in the header". Documents
are upgraded on read as before: a serif font list becomes `georgia` and anything else
`system-sans`, which render the same fonts as before; there is no logo and the name is shown. The
same backup and rollback notes apply.

## Scripts

```sh
pnpm --filter @webmio/admin admin create-user <email> "<workspace>"   # prints a sign-in link
pnpm --filter @webmio/admin admin media-cleanup [--dry-run]   # delete files of removed, unused images
pnpm --filter @webmio/admin db:generate  # new migration after a schema change
pnpm --filter @webmio/admin typecheck    # svelte-check, e2e and scripts
pnpm --filter @webmio/admin test         # vitest (in-memory databases)
pnpm --filter @webmio/admin test:e2e     # Playwright, on a temporary database
pnpm --filter @webmio/admin build        # production build in dist/
pnpm --filter @webmio/admin start        # run the build: node dist
```

The app uses TypeScript 6 (the `typescript6` catalog in `pnpm-workspace.yaml`), because
`svelte-check` needs TypeScript's JavaScript API, which TypeScript 7 no longer provides.
