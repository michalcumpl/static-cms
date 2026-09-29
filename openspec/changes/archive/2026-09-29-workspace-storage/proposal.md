# Proposal

## Why

The admin app keeps one site in a JSON file and lets anyone who can reach the server edit it. That was enough to prove editing (Milestone 2), but real customers need their own sites, their own logins, and history they can rely on. It must work both for owners who build their own site and for people who build and maintain sites for clients. This change is the first step of Milestone 3: storage and accounts. Pages and navigation management build on it next.

## What Changes

- **Workspaces, projects and members.** A workspace is a business. It has members with a role (`owner` or `editor`) and one or more projects, each a website. An agency person is simply a member of several workspaces. A lone owner's workspace isn't mentioned in the UI until a second member or project exists.
- **Database storage.** SQLite on the server holds users, sessions, workspaces, memberships, projects, and each project's site documents with every saved version.
  - A project has one site document now; the table is keyed by language for Milestone 5.
  - Saves keep today's rules: refuse only structurally broken documents (422), and refuse saves based on an outdated version (409), now checked in the database.
- **Media per project** on the server's disk, served only to members.
- **Magic-link sign-in.** A member enters their email address and gets a single-use link that expires. Sessions use an HTTP-only cookie. Email goes out over plain SMTP. Without SMTP configured (development and tests), messages are written to an outbox folder and logged.
- **Invite-only accounts.** An owner invites people by email; the link signs them in and adds them to the workspace. An admin command on the server creates the first user and workspace. Open signup stays off (a later switch).
- **Project-scoped routes.** **BREAKING** (internal): `/edit/…`, `/preview/…` and `/api/site` move under a project: `/p/<project>/edit/…`, `/p/<project>/preview/…`, `/api/projects/<project>/site`. `/` becomes the signed-in member's list of workspaces and projects, or the sign-in page.
- **Import of the existing working copy.** On first start, an existing `data/site.json` and its media are imported into a "Default" workspace and project. The first admin created by the command becomes its owner.

### Non-goals (this change)

- Pages and navigation management, media upload, theme editing (the rest of Milestone 3).
- Open signup, billing, Google sign-in, per-project permissions, a version history UI.
- Publishing (Milestone 4) and multiple languages (Milestone 5), beyond keying documents by language.
- Running more than one server process, and bundling a backup tool. Litestream is documented, not shipped.

## Capabilities

### New Capabilities

- `accounts`: sign-in by magic link, sessions, sign-out, workspaces, projects, roles, invitations, and the admin command that creates the first user.

### Modified Capabilities

- `site-storage`: the working copy becomes documents per project in a database, with version history, per-project media, and access limited to members. Saving, conflicts and the preview/export rules keep their behavior.
- `site-editing`: the editor is reached per project and requires a signed-in member of that project's workspace.

## Impact

- `apps/admin`:
  - new server modules for the database (schema, migrations), auth (magic links, sessions), mail (SMTP or outbox), and access checks;
  - `site-store` reimplemented on SQLite behind the same `readSite`/`saveSite` shape, now per project;
  - route moves as listed above, a sign-in page, a project list, a members page with invitations;
  - an admin CLI script.
- New dependencies in `apps/admin`: `better-sqlite3`, `drizzle-orm`, `drizzle-kit` (dev), `nodemailer`.
- Configuration: `DATABASE_PATH` (default `data/app.db`), `MEDIA_DIR` (default `data/media`), `SMTP_URL`, `MAIL_FROM`, `ORIGIN` (for links in emails), `SITE_DATA_DIR` (still read once, for the import).
- Tests: unit tests use an in-memory database. Playwright signs in through the outbox, and its setup creates a user with the admin command.
- `docs/roadmap.md` and `apps/admin/README.md` are updated (deployment, backups with Litestream, environment variables).
