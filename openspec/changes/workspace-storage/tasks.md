# Tasks

## 1. Database foundation

- [x] 1.1 Add `better-sqlite3`, `drizzle-orm`, `nodemailer` and `tsx` (dependencies) and `drizzle-kit`, `@types/better-sqlite3`, `@types/nodemailer` (dev) to `apps/admin` via the pnpm catalog; verify `pnpm install` and `pnpm --filter @static-cms/admin typecheck` pass
- [x] 1.2 Define the Drizzle schema from design.md decision 1 in `$lib/server/db/schema.ts`, generate the first migration into `apps/admin/drizzle/`, and add `openDatabase(path)` (WAL, foreign keys, migrations applied); verify with a vitest test that an in-memory database migrates and every table exists
- [x] 1.3 Add ID and token helpers (prefixed random IDs, 32-byte tokens, SHA-256 hashing); verify with unit tests for format, uniqueness and that only hashes are stored

## 2. Starter site and project documents

- [x] 2.1 Add `fixtures/starter-site.json` to `@static-cms/site` (one Czech page: hero, rich text, nav with home, neutral theme, no images); verify with a site-package test that it validates with no problems
- [x] 2.2 Reimplement `site-store` on SQLite as `readSite(db, projectId)` / `saveSite(db, projectId, userId, document, baseVersion)`, with the transactional version check and version rows from design.md decision 3, plus `createProject(db, workspaceId, name)` from the starter site; verify with unit tests for every `site-storage` scenario except import, media and preview, including simultaneous saves
- [x] 2.3 Implement the startup import (migrations, then `site.json` and its media into "Default" when there are no projects); verify with unit tests: upgrade imports once, a second start doesn't import again, and an empty data folder imports nothing

## 3. Mail and sign-in

- [x] 3.1 Add the `Mailer` with SMTP (`SMTP_URL`, `MAIL_FROM`) and outbox implementations; verify the outbox writes a readable message file in a unit test, and SMTP is covered by a test against a stub transport
- [x] 3.2 Implement login tokens, sessions with sliding expiry, sign-out, and in-memory rate limits; verify with unit tests for the `Magic-link sign-in`, `Sign-in rate limits` and `Sessions` scenarios in `specs/accounts/spec.md`
- [x] 3.3 Add `hooks.server.ts` (session to `locals.user`, the Origin check for non-GET `/api/`, and the startup `init`) and the `/signin`, `/signin/<token>` (Continue button, POST) and `/signout` routes with safe `next` redirects; verify with handler tests: unknown email gives the same response and sends nothing, the GET page doesn't use the token, and a foreign `Origin` PUT is refused

## 4. Workspaces, members and the admin command

- [x] 4.1 Implement membership rules (list a user's workspaces and projects, roles, owner-only actions, keep at least one owner) and `requireMember`/`requireOwner`; verify with unit tests for the `Workspaces and roles` and `Access to projects` scenarios
- [x] 4.2 Implement invitations (create, email, accept creating the account if needed, cancel, 7-day expiry, single use); verify with unit tests for the `Invitations` scenarios
- [x] 4.3 Add `scripts/admin.ts` with `create-user <email> <workspace>` (joins "Default" when it has no members), and the `admin` package script using `tsx`; verify with a unit test of its function and by running it against a temp database, which prints a working sign-in link

## 5. Project-scoped routes

- [x] 5.1 Move the overview, editor and preview under `/p/[project]/` behind `requireMember` in `+layout.server.ts`, point `EditorState` at the project's API URL and the preview at base path `/p/<project>/preview/`, and remove `/edit`, `/preview`, `/api/site` and `/api/media`; verify with route tests (401 or redirect, 404 for non-members) and the existing editor unit tests
- [x] 5.2 Add `/api/projects/[project]/site` (same contract as before) and `/api/projects/[project]/media/[name]` with per-project media under `MEDIA_DIR`; verify with handler tests for 200, 409, 422, 400, 401 and 404
- [x] 5.3 Replace `/` with the signed-in member's workspaces and projects (workspace heading hidden when there is only one), and add `/w/[workspace]/new` (owners: create a project); verify with load and action tests, and by creating a project in `pnpm dev` and opening its editor

## 6. Members page

- [x] 6.1 Add `/w/[workspace]/members` (list members and pending invitations; owners invite by email with a role, change roles, remove members, cancel invitations) and `/invite/[token]`; verify with action tests and by inviting an address in `pnpm dev` and accepting through the outbox

## 7. End-to-end tests

- [x] 7.1 Add Playwright global setup (admin command against a temp database) and a sign-in fixture that follows the outbox link; move the 8 editor tests to `/p/<project>/…`; verify `test:e2e` passes
- [x] 7.2 Add e2e tests: anonymous visit redirects to sign-in and back, non-member gets not-found, an owner invites an editor who signs in and edits; verify `test:e2e` passes three times in a row

## 8. Documentation and wrap-up

- [x] 8.1 Update `apps/admin/README.md` (environment variables, first run with `admin create-user`, SMTP and SPF/DKIM notes, Litestream backups of `app.db` plus `data/media`, VPS notes for better-sqlite3) and `docs/roadmap.md` (storage done, decisions); verify commands in the README run as written against a temp data folder
- [ ] 8.2 Run `pnpm lint`, `pnpm turbo run typecheck test build` and `test:e2e`, then walk through an upgrade: start with an old `data/site.json`, create the admin, sign in, find the imported site, edit and save, invite a second user, check the preview and ZIP; verify everything works and CI passes on push
