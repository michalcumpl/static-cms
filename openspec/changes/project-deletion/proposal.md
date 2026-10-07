# Proposal

## Why

Owners can create websites but not delete them: today only someone with the database can remove a
project. A paying customer must be able to end a website themselves, and someone who deletes one
by mistake must get it back, as our promise of backups and version history implies. The strategy
decided this on 2026-10-07 (`docs/strategy.md`, "Owners can delete a website"), and the cleanup
before the example sites (`docs/roadmap.md`, milestone B) uses it to remove the old projects.

## What Changes

- **"Delete website"** at the bottom of the Website section, for workspace owners only. The owner
  types the website's name to confirm. Editors see no such area, and their requests are refused.
- **A deleted website disappears at once:** from the project list, and every page and API of the
  project answers "not found", as for someone else's project.
- **A published website goes offline:** its Netlify site is deleted, which also frees its custom
  domain. The confirmation says so. When Netlify can't be reached or refuses, nothing is deleted
  and the owner is told why. When the workspace isn't connected to Netlify any more, the
  confirmation says the old site stays on Netlify until it is removed there.
- **Restorable:** owners see "Deleted websites" under their workspace in the project list, each
  with when it was deleted, **Restore**, and **Delete now**. A restored website comes back as it
  was, with its versions and images, but unpublished.
- **Removed for good with Delete now:** the project, its languages, versions, publishes and
  images, files included.

Not in this change: removing deleted websites automatically after 30 days. It comes with
`scheduled-jobs` (roadmap, milestone E), which runs the server's recurring work together; until
then a deleted website stays restorable until an owner chooses Delete now.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accounts`: owners delete, restore and remove projects; deleted projects are out of the list
  and answer "not found".
- `project-page`: the Website section ends with the "Delete website" area for owners.
- `publishing`: deleting a published website deletes its Netlify site.

## Impact

- **Database:** `projects` gains `deleted_at` and `deleted_by` (a new migration). Project queries
  (`projectAccess`, `listWorkspaces`, publishing, domains) leave deleted projects out.
- **Server:** `deleteProject`, `restoreProject` and `purgeProject` next to `createProject`;
  `PublishTarget.deleteSite` in the Netlify adapter and the fake Netlify used by tests; media
  folders removed on purge.
- **Admin:** the Website section's delete area and dialog, the project list's deleted websites,
  routes for delete, restore and delete now.
- **Tests:** unit tests for the three operations and access; e2e tests for the
  scenarios.
