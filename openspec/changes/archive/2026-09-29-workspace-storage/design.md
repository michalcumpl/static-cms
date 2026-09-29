# Design

## Context

- `apps/admin` (SvelteKit, `adapter-node`, TypeScript 6) serves one site. The Milestone 2 structure:
  - `$lib/server/site-store.ts` keeps `data/site.json` = `{ version, document }`. `readSite()` and `saveSite(document, baseVersion)` use temp-file-plus-rename writes and an in-process queue.
  - The routes are `/` (overview and ZIP), `/edit/[[slug]]` (Svedit editor, browser-only), `/preview/[...path]`, `/api/site` and `/api/media/[name]`. Media comes from the demo fixture.
- The editor depends only on the `/api/site` contract (GET returns `{ document, version, problems }`; PUT returns 200, 409, 422 or 400) and on `/api/media/<name>` for images.
- Decisions from the exploration:
  - workspaces with owner/editor members, where a workspace is a business;
  - single VPS; SQLite; media on local disk;
  - magic links over plain SMTP;
  - invite-only accounts with an admin command;
  - documents keyed by language for Milestone 5.

## Goals / Non-Goals

**Goals:**
- Every request to a project is tied to a signed-in member; nothing is reachable anonymously except the sign-in flow.
- The editor keeps working unchanged apart from its URLs.
- Existing installations upgrade with no manual data work.

**Non-Goals:**
- Horizontal scaling, open signup, billing, a history UI, project deletion, renaming workspaces.

## Decisions

### 1. Schema

```
users(id, email UNIQUE, created_at)
sessions(id = sha256(token), user_id, expires_at, created_at)
login_tokens(id = sha256(token), user_id, expires_at, used_at)
workspaces(id, name, created_at)
memberships(workspace_id, user_id, role: owner|editor, created_at)   PK(workspace_id, user_id)
invitations(id = sha256(token), workspace_id, email, role, invited_by, expires_at, used_at, cancelled_at)
projects(id, workspace_id, name, created_at)
site_documents(id, project_id, lang, version, current_version_id)    UNIQUE(project_id, lang)
versions(id, document_id, version, document JSON, created_at, created_by)
```

- **IDs:** short random strings with a type prefix (`u_`, `w_`, `p_`, …), so they are safe in URLs and never guessable in sequence.
- **Tokens:** sign-in links, invitations and session cookies are 32 random bytes, and only their SHA-256 is stored. A leaked database therefore holds no working links or sessions.
- **Versions:** `site_documents.version` duplicates the current version string, so the save check is one indexed `UPDATE`. Every accepted save inserts a `versions` row with the whole document; they are a few KB each, and all are kept (no pruning yet).
- **`lang`:** always `cs` until Milestone 5. The unique key `(project_id, lang)` is the hook for more languages.

### 2. SQLite access: better-sqlite3 + Drizzle

- **`better-sqlite3`:** synchronous and fast. WAL mode and `foreign_keys = ON` are set at open. Pinned to 12.x: 13.0.3's prebuilt binary crashes with a segmentation fault when opening a database on Node 22.13, while 12.11.1 works.
- **Drizzle:** typed schema in TypeScript; `drizzle-kit generate` creates SQL migrations committed to `apps/admin/drizzle/`, and the server applies them with Drizzle's migrator at startup.
- **Location:** `DATABASE_PATH` (default `data/app.db`); `:memory:` for unit tests.
- **Alternatives:** `node:sqlite` is still experimental in Node 22; raw SQL without an ORM gives no typed schema and no migration tooling.

### 3. Saving in one transaction

`saveSite(projectId, document, baseVersion)`:
1. validate: structural errors return `invalid` without touching the database;
2. in a transaction: `UPDATE site_documents SET version = :new, current_version_id = :vid WHERE project_id = ? AND lang = 'cs' AND version = :base`, where zero changed rows means `conflict` (roll back); then `INSERT` the version.

SQLite serializes write transactions, so two saves on the same base can't both pass the `WHERE`. The Milestone 2 in-process queue and temp-file writes go away. The return shape is unchanged, so the API contract stays.

### 4. Magic links and sessions

- **Request:**
  - `POST /signin` with an email creates a `login_tokens` row (15 minutes) and emails `ORIGIN/signin/<token>?next=…` if the user exists.
  - It always answers "check your email".
  - The `next` value must be a same-origin path, so it can't redirect elsewhere.
- **Follow the link:**
  - `GET /signin/<token>` shows a "Continue" button that POSTs the token.
  - It deliberately doesn't sign in on GET: mail scanners pre-fetch links, which would burn single-use tokens.
  - The POST marks the token used, creates a session, sets the cookie and redirects to `next`.
- **Session cookie:** `session`, HTTP-only, `SameSite=Lax`, `Secure` when `ORIGIN` is https. Expiry slides to 30 days on use, updated at most once a day.
- **`hooks.server.ts`:** resolves the cookie to `locals.user` for every request.
- **Rate limits:** in-memory, per email and per client IP, 5 requests per 15 minutes each. The app is a single process; limits reset on restart, which is acceptable here.

### 5. Access control

- **Project routes:** a single helper, `requireMember(locals, projectId)`, used by `/p/[project]/+layout.server.ts` and by every project API handler.
  - No session: pages redirect to `/signin?next=…`; APIs answer 401.
  - Signed in but not a member of the workspace: 404.
  - Otherwise it returns `{ user, workspace, project, role }`.
- **Owner-only actions** (invite, remove, change role, create project) use `requireOwner`.
- **Cross-site requests:** SvelteKit's built-in check covers form posts. For JSON APIs, `hooks.server.ts` also refuses non-GET `/api/…` requests whose `Origin` header isn't `ORIGIN`. Together with `SameSite=Lax`, this blocks forged saves.

### 6. Routes

```
/                          signed in: workspaces and projects (workspace hidden when only one)
/signin, /signin/<token>   sign-in
/signout (POST)
/invite/<token>            accept an invitation
/w/<workspace>/members     owners: members, roles, invitations
/w/<workspace>/new         owners: new project
/p/<project>/              overview: validation, pages, Download ZIP  (today's `/`)
/p/<project>/edit/[[slug]] the editor (unchanged apart from its base URL)
/p/<project>/preview/...   preview, base path /p/<project>/preview/
/api/projects/<project>/site          GET / PUT, same contract as /api/site
/api/projects/<project>/media/<name>  images
```

The editor's `EditorState` gets the project's API URL instead of hard-coded `/api/site`. The preview's base path becomes `/p/<project>/preview/`; the renderer already supports any base path.

### 7. Media per project

Files live at `MEDIA_DIR/<projectId>/<name>` (default `data/media`), served through the project media route after `requireMember`. New projects and the import copy the starter's or old site's images there. Names keep the existing media-key rule, so paths can't escape the folder. Uploads come later in Milestone 3.

### 8. Mail: SMTP or outbox

- A `Mailer` interface with `send({ to, subject, text, html })`.
- **SMTP:** with `SMTP_URL` set (for example `smtps://user:pass@smtp.example.cz:465`), nodemailer sends from `MAIL_FROM`.
- **Outbox:** without it, each message is written as a JSON file to `data/outbox/` and the link is logged. That's how development and the Playwright tests sign in.
- **Messages:** plain Czech-and-English text for now; the product has no language setting yet.

### 9. Admin command and startup import

- **Admin command:** `pnpm --filter @static-cms/admin admin create-user <email> "<workspace name>"` runs `scripts/admin.ts` with `tsx`. `tsx` is a runtime dependency, so the command works on the VPS. It uses the same `$lib/server` modules through relative imports: the data layer must not use SvelteKit-only imports (`$env`, `$app`). It prints a sign-in link.
- **Startup, via `hooks.server.ts` `init`:** apply migrations. Then, if there are no projects and `SITE_DATA_DIR/site.json` exists, import it and its referenced media into workspace "Default", project "Default". The first user created by the admin command becomes that workspace's owner, handled by the command: when the "Default" workspace has no members, the new user joins it instead of getting a new workspace.

### 10. Starter site

`@static-cms/site` gets `fixtures/starter-site.json`. It's a valid one-page Czech site with a hero, one rich-text block, a nav with the home page, and a neutral theme, and it references no images. New projects copy it with the project name as the site name. A test keeps it valid.

### 11. Testing

- **Unit tests (vitest, in-memory SQLite per test):**
  - store: read, save, conflict, structural refusal, simultaneous saves, versions;
  - tokens: single use, expiry, hashing;
  - sessions: sliding expiry, sign-out;
  - rate limits;
  - membership rules, including the last owner;
  - invitations, the import, and the CLI function;
  - access helpers: 401, 404.
- **Playwright:** a global setup runs the admin command against the test database, and a fixture signs in through the outbox link and stores the session. The existing 8 editor tests run under `/p/<project>/…`. New tests cover: not signed in (redirect), a non-member (404), and inviting an editor who then signs in.

## Risks / Trade-offs

- **[better-sqlite3 is a native module]** → Prebuilt binaries exist for Linux x64/arm64 and Node 22. The README tells a VPS without them to install build tools. CI already builds it on Ubuntu.
- **[Email deliverability]** → Magic links in spam lock people out. The README covers SPF/DKIM for `MAIL_FROM`'s domain, and the admin command can always print a fresh link.
- **[In-memory rate limits reset on restart]** → Acceptable for one process; the limit is abuse damping, not security-critical.
- **[`tsx` as a runtime dependency]** → Small and pure JS. The alternative (a separate build for the CLI) costs more than it saves.
- **[Full-document versions grow the database]** → A few KB per save; thousands of saves are still only megabytes. Pruning can come with the history UI.
- **[Backups]** → Documented with Litestream (streams the database to S3-compatible storage) plus copying `data/media`. Not bundled.

## Migration Plan

1. Deploy. The first start creates `data/app.db` and imports `data/site.json` and its media into "Default".
2. Run `admin create-user` for yourself: you become the owner of "Default" and get a sign-in link.
3. Invite clients from the members page.

**Rollback:** the old `data/site.json` is left in place (it is only read), so the previous version still runs against it. Saves made after the upgrade exist only in the database.
