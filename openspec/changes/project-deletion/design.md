# Design

## Context

See proposal.md for the motivation. The current state:

- **`projects`** (`db/schema.ts`): everything a project owns cascades from it: `site_documents` →
  `versions`, `media`, `project_hosting` (with its unique custom domain), `publishes` →
  `publish_documents`. Image files live in `mediaRoot()/<project>/` (`projectFolder` in
  `media.ts`), outside the database.
- **Access:** every project page and API goes through `projectAccess` (`members.ts`) via
  `requireMember`; a missing project means "not found". Owners are checked with `roleIn` /
  `requireOwner`.
- **Publishing:** `PublishTarget` (`publishing/target.ts`) has `createSite`, `deploy`, `restore`,
  `connectDomain`, `disconnectDomain`, `certificateIssued`; `netlifyTarget` implements it, and
  `fake-netlify.ts` stands in for Netlify in e2e tests.
- **Website section:** `(panel)/website/+page.svelte` renders `SectionScreen` with the Design card
  and subpage links as its `children`, outside what Save saves. `SectionScreen` owns the
  unsaved-changes guard (`useUnsavedGuard`), which `editor.leaving` switches off.
- **Project list** (`routes/+page.svelte`): per workspace, its projects, and for owners Members,
  Netlify and New project.

## Goals / Non-Goals

**Goals:**
- Nothing of a deleted website stays behind: rows, files, or a live Netlify site.
- Nothing is deleted while the website would stay online unnoticed.

**Non-Goals:**
- Restoring deleted websites. It comes with scheduled jobs, which would remove deleted websites
  for good after the restore window; the roadmap plans those jobs anyway.
- Deleting a workspace or an account.

## Decisions

### 1. A hard delete through the cascade

`deleteProject(db, projectId, target?)` in `site-documents.ts`, next to `createProject`:
1. When the project has a `project_hosting` row and its workspace a hosting connection, it calls
   `target.deleteSite(siteId)` and stops on a `PublishError`, deleting nothing.
2. It deletes the `projects` row; the foreign keys' cascade removes documents, versions, media
   rows, hosting (freeing the domain) and publishes.
3. After the commit, it removes the media folder (a missing folder is fine), so a failed delete
   never leaves a project without its images.

No migration: nothing new is stored.

*Alternative considered:* a soft delete (`deleted_at`) with a restore window. Postponed, see
Non-Goals; when it comes, `deleteProject` becomes the final removal step.

### 2. Netlify: `deleteSite`

`PublishTarget.deleteSite(siteId)` calls `DELETE /api/v1/sites/{site_id}`; a 404 counts as done
(already gone). Errors map like the other calls: unreachable, unauthorized ("reconnect Netlify"),
failed. The fake Netlify gains the same endpoint and drops the site from its list, so e2e tests
can check that it is gone.

When `project_hosting` exists but the workspace has no connection, `deleteProject` skips Netlify;
the confirmation has warned the owner (spec, "Delete website").

### 3. The route

`DELETE /api/projects/<project>` with `{ name }`:
- members who aren't owners get 403, others 404 (as for publishing);
- the origin check for changing requests applies;
- 422 when the name doesn't match: trimmed, then exact (case and diacritics count);
- 502 with the provider's message when Netlify fails, as a failed publish answers;
- 204 when deleted.

### 4. Admin pages

- **Website section:** `(panel)/website/+page.svelte` gets a `DeleteWebsite.svelte` card after
  `SectionScreen`, for owners (the panel layout's data gains the member's `role`). Its dialog
  shows the address and domain from the publishing status, the not-connected note and the name
  field. Before deleting, a callback from `SectionScreen` sets `editor.leaving`, so the guard
  doesn't ask; after deleting, the page goes to `/?deleted=<name>`.
- **Project list:** `?deleted=` shows a notice that the website was deleted.

## Risks / Trade-offs

- **[Deleting by mistake can't be undone]** → typing the name, the dialog saying so in words,
  owners only. The restore window comes later.
- **[Netlify site deleted, database delete fails]** → the site is gone while the project still
  shows as published. The delete is one statement that rarely fails; if it does, the owner
  retries, and `deleteSite` treats the missing site as done.
- **[Open editors in other windows]** lose their unsaved changes: their next save gets "not
  found". → Acceptable: an owner chose to delete the website.

## Migration Plan

Code only. Existing projects are untouched until an owner deletes one.
