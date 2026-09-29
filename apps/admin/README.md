# @static-cms/admin

The Static CMS app: SvelteKit (Svelte 5) with `adapter-node`, so the UI and the server routes
ship as one Node app. People sign in with an emailed link and edit the websites (projects) of the
workspaces they belong to. Sites are stored in SQLite, previewed, and exported with
`@static-cms/site`.

## First run (development)

```sh
pnpm install
pnpm --filter @static-cms/admin admin create-user you@example.com "My studio"
pnpm dev             # from the repo root: builds @static-cms/site, then starts vite dev
```

`create-user` prints a sign-in link. Open it (the default link targets http://localhost:5173) and
press **Continue**. Without `SMTP_URL`, emails aren't sent: they are written to `data/outbox/` and
logged by the server, so later sign-in links and invitations appear in the dev server's output.

An installation that still has a Milestone 2 `data/site.json` imports it on first start into a
workspace named "Default". The first user created with `create-user` becomes its owner.

## Routes

| Route                                  | What it does                                                       |
| -------------------------------------- | ------------------------------------------------------------------ |
| `/`                                    | Your workspaces and projects (the workspace isn't shown if you have only one). |
| `/signin`, `/signin/<token>`           | Email a sign-in link; the link page has a **Continue** button.     |
| `/invite/<token>`                      | Accept an invitation (creates the account if needed).              |
| `/w/<workspace>/members`               | Members, roles and invitations (owners change them).               |
| `/w/<workspace>/new`                   | Owners: create a project from the starter site.                    |
| `/p/<project>/`                        | Validation, pages, **Download ZIP**.                               |
| `/p/<project>/edit/`, `…/edit/<slug>/` | The editor (Svedit). Cmd/Ctrl+S saves the whole site.              |
| `/p/<project>/preview/…`               | The saved site as it would be published, or its problems.          |
| `GET/PUT /api/projects/<project>/site` | The document: 200, 409 (outdated version), 422 (broken document).  |
| `/api/projects/<project>/media/<name>` | The project's images.                                              |

Everything except sign-in and invitations needs a session. Project pages and APIs answer
"not found" to people who aren't members of the project's workspace.

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

## Configuration

| Variable         | Default          | Meaning                                                        |
| ---------------- | ---------------- | -------------------------------------------------------------- |
| `ORIGIN`         | –                | Public URL, e.g. `https://admin.example.cz`. **Required in production**: adapter-node uses it for request URLs, cross-site checks and the links in emails. The admin command uses it for printed links (default `http://localhost:5173`). |
| `DATABASE_PATH`  | `data/app.db`    | SQLite database.                                               |
| `MEDIA_DIR`      | `data/media`     | Project images, one folder per project.                        |
| `SMTP_URL`       | –                | e.g. `smtps://user:password@smtp.example.cz:465`. Without it, email goes to the outbox. |
| `MAIL_FROM`      | –                | Sender, e.g. `Static CMS <web@example.cz>`. Required with `SMTP_URL`. |
| `OUTBOX_DIR`     | `data/outbox`    | Where emails go without SMTP.                                  |
| `SITE_DATA_DIR`  | `data`           | Where a Milestone 2 `site.json` is looked for (imported once). |
| `MIGRATIONS_DIR` | `drizzle`        | Database migrations, applied at startup.                       |

Relative defaults are resolved from the working directory, so run the app and the admin command
from `apps/admin`.

## Production on a VPS

```sh
pnpm install --frozen-lockfile
pnpm turbo run build --filter @static-cms/admin...
cd apps/admin
ORIGIN=https://admin.example.cz SMTP_URL=… MAIL_FROM=… node dist
```

- Run one process (the database handles concurrent saves; sign-in rate limits are in memory).
  Put a reverse proxy with HTTPS in front, and keep `ORIGIN` equal to the public URL.
- Deploy the `drizzle/` folder with the app; migrations run when the server starts.
- `better-sqlite3` is a native module. Prebuilt binaries cover Linux x64/arm64 on Node 22; on
  other platforms install a C++ toolchain (`build-essential`, `python3`) before `pnpm install`.
  It is pinned to 12.x because 13.0.3 crashes on Node 22.13.
- For email that arrives, set up SPF and DKIM for `MAIL_FROM`'s domain with your SMTP provider.
  If a sign-in email goes missing, `pnpm admin create-user` refuses existing accounts, but the
  person can request a new link at `/signin`.

### Backups

Back up `app.db` and the `media/` folder together.

- **Continuous (recommended):** [Litestream](https://litestream.io) streams the database to
  S3-compatible storage, e.g. `litestream replicate data/app.db s3://bucket/app.db`, running
  next to the app. Copy `data/media/` to the same storage on a schedule (e.g. `rclone sync`).
- **Nightly:** `sqlite3 data/app.db ".backup data/backup.db"` (safe while the app runs), then copy
  the backup and `data/media/` off the server.

## Scripts

```sh
pnpm --filter @static-cms/admin admin create-user <email> "<workspace>"   # prints a sign-in link
pnpm --filter @static-cms/admin db:generate  # new migration after a schema change
pnpm --filter @static-cms/admin typecheck    # svelte-check, e2e and scripts
pnpm --filter @static-cms/admin test         # vitest (in-memory databases)
pnpm --filter @static-cms/admin test:e2e     # Playwright, on a temporary database
pnpm --filter @static-cms/admin build        # production build in dist/
pnpm --filter @static-cms/admin start        # run the build: node dist
```

The app uses TypeScript 6 (the `typescript6` catalog in `pnpm-workspace.yaml`), because
`svelte-check` needs TypeScript's JavaScript API, which TypeScript 7 no longer provides.
