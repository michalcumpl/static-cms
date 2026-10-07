# Proposal

## Why

Owners can create websites but not delete them: today only someone with the database can remove a
project. A paying customer must be able to end a website themselves. The strategy decided this on
2026-10-07 (`docs/strategy.md`, "Owners can delete a website"), and the cleanup before the example
sites (`docs/roadmap.md`, milestone B) uses it to remove the old projects.

A 30-day restore window was considered and postponed: it needs a scheduled job to remove deleted
websites for good, and it will come with the scheduled jobs the roadmap plans anyway (website
health, reminders).

## What Changes

- **"Delete website"** at the bottom of the Website section, for workspace owners only. The owner
  types the website's name to confirm; the confirmation says this can't be undone. Editors see no
  such area, and their requests are refused.
- **Deleting is for good:** the project, its languages, versions, publishes and images, files
  included. Its pages and API routes answer "not found" from then on.
- **A published website goes offline:** its Netlify site is deleted first, which also frees its
  custom domain. The confirmation says so. When Netlify can't be reached or refuses, nothing is
  deleted and the owner is told why. When the workspace isn't connected to Netlify any more, the
  confirmation says the old site stays on Netlify until it is removed there.
- After deleting, the owner sees the project list with a note that the website was deleted.

Not in this change: restoring a deleted website (comes with scheduled jobs), deleting a workspace
or an account.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accounts`: owners delete projects of their workspace.
- `project-page`: the Website section ends with the "Delete website" area for owners.
- `publishing`: deleting a published website deletes its Netlify site.

## Impact

- **Server:** `deleteProject` next to `createProject` (the database cascade removes what the
  project owns; the media folder is removed after it); `PublishTarget.deleteSite` in the Netlify
  adapter and the fake Netlify used by tests; a `DELETE /api/projects/<project>` route.
- **Admin:** the Website section's delete area and dialog, the project list's note.
- **No database migration.**
- **Tests:** unit tests for `deleteProject`, the route and `deleteSite`; e2e tests for the
  scenarios.
