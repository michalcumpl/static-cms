# Proposal

## Why

Every save of a site has been stored as a complete version since the first admin change, with its time and who saved it. Owners can't see or use any of it. With real sites published and several languages edited by several people, a deleted page or a bad edit can't be undone once the editor is closed. The roadmap has listed a "version history UI" as open since Milestone 3.

## What Changes

- **History page** for each project and language (`/p/<project>/history/`, `?lang=en` for other languages). It's linked from the editor's left column and the project page. It lists the language's versions, newest first, 50 at a time with "Show older". Each version shows:
  - when it was saved, and who saved it;
  - **Current** for the version being edited;
  - **Live** for the version the live site shows;
  - **Published** for a version included in an earlier publish;
  - **Restored from …** for a version made by restoring.
- **Previewing a version.** A read-only rendering of any version, with all its pages, links between them, images and styles, at `/p/<project>/history/<version>/`. Old formats are upgraded, and a non-primary language gets the primary's current shared fields, as everywhere else. A version with errors shows its problems instead of the pages, as the preview does.
- **Restoring a version** of the language, after confirming:
  - the old document is saved as a **new** version, marked with where it came from, so a restore can itself be undone from the history;
  - the editor and preview show it at once, and the live site at the next publish;
  - restoring the primary language also brings back its shared fields (theme, favicon, business details), which every language uses. The confirmation says so.
- **Editing elsewhere:** an editor open on that language while someone restores gets the existing "changed elsewhere, reload" on its next save. Restoring from the editor's own History link asks to save unsaved changes first.

### Non-goals (this change)

- Restoring a single page.
- Showing differences between versions.
- Naming or pinning versions.
- Pruning old versions: every version is kept.

## Capabilities

### New Capabilities

- `version-history`: listing a language's versions with their marks, previewing a version, restoring it as a new version, and who may do so.

### Modified Capabilities

- `site-editing`: the editor links to the History of the language being edited.

## Impact

- **`apps/admin`:**
  - database: `versions.restored_from` (nullable, the version a restore copied), with a migration;
  - `site-documents.ts`: `listVersions`, `readVersion` and `restoreVersion`;
  - routes:
    - `GET /api/projects/<p>/versions?lang=&before=`;
    - `POST /api/projects/<p>/versions/<version>/restore`;
    - the History page;
    - the version preview `/p/<p>/history/<version>/[...path]`, which shares the preview's export code;
  - links from the editor and the project page;
  - unit, route and e2e tests.
- **`packages/site`:** no change; the renderer already renders any stored document.
- **No new dependencies.**
- **Docs:** README (history and restore) and the roadmap.
