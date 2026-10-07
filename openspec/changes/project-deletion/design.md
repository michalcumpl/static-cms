# Design

## Context

See proposal.md for the motivation. The current state:

- **`projects`** (`db/schema.ts`): `id`, `workspace_id`, `name`, `primary_lang`, `created_at`.
  Everything a project owns cascades from it: `site_documents` → `versions`, `media`,
  `project_hosting`, `publishes` → `publish_documents`. Image files live in
  `mediaRoot()/<project>/` (`projectFolder` in `media.ts`), outside the database.
- **Access:** `projectAccess` (`members.ts`) joins project, workspace and membership; every
  project page and API goes through it (`requireMember`), and `null` means "not found".
  `listWorkspaces` lists each workspace's projects. Owners are checked with `roleIn`.
- **Publishing:** `PublishTarget` (`publishing/target.ts`) has `createSite`, `deploy`, `restore`,
  `connectDomain`, `disconnectDomain`, `certificateIssued`; `netlifyTarget` implements it, and
  `fake-netlify.ts` stands in for Netlify in e2e tests. `project_hosting` holds the project's
  Netlify site and its unique custom domain.
- **No background jobs:** the only startup work is `upgradeProjects` in `getDb()` (`app.ts`).
- **Website section:** `(panel)/website/+page.svelte` renders `SectionScreen` with the Design card
  and subpage links as its `children`, outside what Save saves. `SectionScreen` owns the
  unsaved-changes guard (`useUnsavedGuard`), which `editor.leaving` switches off.
- **Project list** (`routes/+page.svelte`): per workspace, its projects, and for owners Members,
  Netlify and New project.

## Goals / Non-Goals

**Goals:**
- One meaning of "deleted" everywhere: a single column, checked where projects are read.
- Nothing published survives a deletion unnoticed.

**Non-Goals:**
- Deleting a workspace or an account.
- Republishing a restored website automatically.
- Removing deleted projects automatically after 30 days. It comes with `scheduled-jobs`, which
  runs the server's recurring work together; it will call `purgeProject` for each project
  deleted long enough ago. Until then deleted projects stay until Delete now.
- A grace period for media removed from the library (it has its own cleanup command).

## Decisions

### 1. A soft delete: `deleted_at` and `deleted_by`

`projects` gains `deleted_at` (timestamp, null while the project lives) and `deleted_by` (user,
`set null` on delete), in a new migration. Deleting sets them; restoring clears them; nothing
else moves, so a restore brings back exactly what was there.

`projectAccess` and `listWorkspaces` add `deleted_at IS NULL`, which makes every project page and
API answer "not found" through the existing checks. The other direct project queries
(`publishing/publish.ts`, `publishing/domains.ts`, `site-documents.ts`, `media.ts`) are reviewed
one by one: those reached through a route are already guarded by `projectAccess`; those that run
on their own (upgrades at start, domain checks) skip deleted projects.

*Alternative considered:* moving deleted projects to a trash table. Rejected: every owned table
would need its copy, or foreign keys would break.

### 2. Server operations next to `createProject`

In `site-documents.ts`:
- `deleteProject(db, projectId, userId, target?)`: when the project has `project_hosting` and the
  workspace a hosting connection, calls `target.deleteSite(siteId)` first and stops on a
  `PublishError`; then, in one transaction, deletes the `project_hosting` row (freeing the
  domain) and sets `deleted_at`/`deleted_by`.
- `restoreProject(db, projectId)`: clears both columns, only while `deleted_at` is set.
- `purgeProject(db, projectId)`: deletes the project row (the cascade takes the rest), then the
  media folder. Files go after the commit, so a failed transaction never leaves a project without
  images.
- `deletedProjects(db, workspaceId)`: the workspace's deleted projects with when and by whom they
  were deleted, for the project list.

### 3. Netlify: `deleteSite`

`PublishTarget.deleteSite(siteId)` calls `DELETE /api/v1/sites/{site_id}`; a 404 counts as done
(already gone). Errors map like the other calls: unreachable, unauthorized ("reconnect
Netlify"), failed. The fake Netlify gains the same endpoint and drops the site from its list, so
e2e tests can check that the site is gone.

When `project_hosting` exists but the workspace has no connection, `deleteProject` skips Netlify
and deletes the row; the confirmation has warned the owner (spec, "Delete website").

### 4. Routes

| Request | Who | Does |
| --- | --- | --- |
| `DELETE /api/projects/<project>` with `{ name }` | owner | `deleteProject`; 422 when the name doesn't match, 502 with the message when Netlify fails |
| `POST /api/workspaces/<ws>/deleted/<project>/restore` | owner | `restoreProject` |
| `DELETE /api/workspaces/<ws>/deleted/<project>` | owner | `purgeProject` (Delete now) |

Restore and Delete now live under the workspace because the project's own routes answer "not
found" once it is deleted. Both check that the project belongs to the workspace and is deleted.
All three go through the origin check for changing requests, and editors get 403.

The name compares trimmed and exact (case and diacritics count), as typed in the dialog.

### 5. Admin pages

- **Website section:** `(panel)/website/+page.svelte` gets a `DeleteWebsite.svelte` card after
  `SectionScreen`, for owners (the panel layout's data gains the member's `role`). Its dialog
  shows the address and domain from the publishing status the page can load, the not-connected
  note, and the name field. Deleting sets `editor.leaving` through a callback from
  `SectionScreen` so the guard doesn't ask, then goes to `/?deleted=<name>`.
- **Project list:** `+page.server.ts` adds each owned workspace's deleted projects. Under the
  projects, a "Deleted websites" list shows each with "Deleted on <date>", **Restore**
  and **Delete now** (with its own confirmation dialog). `?deleted=` shows a notice that the
  website was deleted and can be restored below.

### 6. Changes made while building

- **The operations have their own module,** `server/project-deletion.ts`, not
  `site-documents.ts`: `deleteProject` needs the publishing code, which already imports
  `site-documents.ts`.
- **The migration's reference was fixed by hand:** drizzle-kit wrote `deleted_by` without
  `ON DELETE set null`, so removing an account that deleted a project would have failed.
- **The other direct `projects` queries stay as they are.** Each is reached through a route that
  checks `projectAccess` first, or runs at start (format upgrades, legacy media registration),
  where also upgrading a deleted project keeps it restorable.

## Risks / Trade-offs

- **[A query that forgets `deleted_at`]** would let a deleted project leak. → Access goes through
  `projectAccess` and `listWorkspaces`; unit tests check that a deleted project's pages, APIs and
  list entry answer "not found"; task 1 lists every direct query.
- **[Netlify site deleted, database write fails]** → the site is gone while the project still
  shows as published. The transaction only removes rows and sets columns, so it rarely fails; if
  it does, the owner retries, and `deleteSite` treats the missing site as done.
- **[Open editors in other windows]** keep their unsaved changes until they save, then get "not
  found". → Acceptable: the owner chose to delete; restoring brings the last saved state back.
- **[Deleted projects pile up]** until `scheduled-jobs` removes them, they keep their versions
  and images on disk. → Few projects exist before the beta; owners can Delete now.

## Migration Plan

One additive migration (two nullable columns). No data changes; existing projects are not
deleted. The migrations are flattened later, during the cleanup before `example-sites`.
