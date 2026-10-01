# Design

## Context

See proposal.md. These decisions were made while exploring:
- restore a whole language only, as a new version;
- a History page per language;
- marks for current, live, published and restored versions;
- a read-only preview of a version;
- members may restore;
- keep every version.

The current state that shapes the approach:
- **`versions`** holds `(id, document_id, version, document JSON, created_at, created_by)`. Every accepted save inserts one, and `site_documents.current_version_id` points at the current one.
- **`saveSite(db, p, user, document, baseVersion, lang)`** validates and refuses structurally broken documents, checks the version, and inserts a version, all in one transaction.
- **`publish_documents(publish_id, lang, version_id)`** records each publish's versions. `project_hosting.live_publish_id` names the live publish.
- **The preview route** (`/p/[project]/preview/[...path]`) builds an export with `exportSiteLanguages`, serves files from it, and shows problems when export fails.
- **`readSite`** upgrades old formats on read and applies the primary's shared fields for other languages (`applySharedFields`).
- **Media cleanup** keeps the files of every image any stored version references, so restoring an old version never refers to deleted images.

## Goals / Non-Goals

**Goals:**
- No save is ever lost, a restore included: restoring only ever adds a version.
- Reuse the save path, so restores get the same validation, conflict check and atomicity as edits.

**Non-Goals:**
- Diffs, page-level restore, version names, and pruning.

## Decisions

### 1. Storage

- **Migration:** `versions.restored_from` is added as text, nullable, referencing `versions(id)`. It records the version a restore copied.
- **`saveSite`** gains an optional `{ restoredFrom }` and writes it with the new version.
- **`listVersions(db, projectId, lang, { before?, limit = 50 })`** returns `{ id, savedAt, savedBy, current, live, published, restoredFrom? }` per version:
  - newest first; `before` is a version ID, and the next page starts below its `created_at` (with `rowid` breaking ties);
  - `savedBy` is the member's email, or null for a removed account;
  - `published` comes from `publish_documents` joined with ready publishes for that language;
  - `live` is the version of that language in the publish named by `project_hosting.live_publish_id`;
  - `restoredFrom` gives the source version's ID and time.
- **`readVersion(db, projectId, versionId)`** returns `{ lang, document, savedAt }` for a version of one of the project's documents, or undefined, including for versions of other projects:
  - the document is upgraded;
  - for a non-primary language, the primary's **current** shared fields are applied (a preview shows what the language would look like if restored now).
- **`restoreVersion(db, projectId, versionId, userId)`:**
  - reads the version's upgraded document (without shared fields; the stored document is what's restored);
  - saves it with `saveSite` based on the language's current version, with `restoredFrom`;
  - answers `{ ok, version }`, or `{ ok: false, reason: "not-found" | "invalid" | "conflict" }`.

  Shared fields need no special handling: restoring the primary changes them for every language through `readSite`, and restoring another language never touches them.

### 2. Routes

- **`GET /api/projects/<p>/versions?lang=en&before=<id>`** returns `{ versions, more }`.
- **`POST /api/projects/<p>/versions/<version>/restore`** answers:
  - 200 `{ lang }`;
  - 404 for an unknown version or one of another project;
  - 409 for a conflict;
  - 422 `{ problems }` for a broken document.
- **`/p/<p>/history/`** (`+page.server.ts`, `+page.svelte`):
  - loads the first page of versions for `?lang`, and the project's languages;
  - has a language selector when there are several;
  - each entry has **Preview** (opens in a new tab) and **Restore** (a confirmation dialog whose text adds the shared-fields sentence for the primary language);
  - after a restore, it reloads the list and offers "Open the editor".
- **`/p/<p>/history/<version>/[...path]`:**
  - `readVersion`, then the same export-and-serve code as the preview, moved into `$lib/server/preview.ts` as `servePreview(sites, basePath, path, editHref)`;
  - with base path `/p/<p>/history/<version>/`, one language only, so no switcher;
  - HTML responses get a small banner inserted after `<body>`: "Version of 2 Oct 14:02 · Back to history".

### 3. Links

- **Editor:** the left column gets a "History" link under the language selector (`paths.history(lang)`), which the editor's existing unsaved-changes guard covers because it leaves the editor.
- **Project page:** a "History" link next to "Open the editor" and "Preview".

### 4. Tests

- **Unit:**
  - `listVersions`: order, paging with `before`, and the marks (current, live, published, restored from), plus a removed member;
  - `readVersion`: another project's version is undefined, old formats are upgraded, and shared fields are applied for a non-primary language;
  - `restoreVersion`: a new version with `restored_from`; restoring a restore; a conflict when the base moved; a broken document refused; other languages untouched.
- **Routes:**
  - the versions API (paging, access);
  - restore (200, 404, 409, 422, cross-project);
  - the version preview (pages, assets, links within the version, the banner, and another project's version as 404).
- **e2e:**
  - edit and save twice, open History from the editor, preview the first version, restore it, and the editor shows it;
  - restore Czech, and English shows the restored phone number;
  - Live and Published marks after publishing to the fake Netlify.

## Real publish (task 3.3, 2026-10-01)

On a real project, the owner made a few edits, previewed an older version from History, restored it, restored the newer version again, and published, then checked the Live and Published marks. They confirmed it all works.

## Risks / Trade-offs

- **[Restoring loses later edits]** Edits made after the restored version are no longer current. → They're still versions in the history, one restore away, and the confirmation says so.
- **[An old version links to pages or images that no longer exist]** Pages: the document is self-contained, so a restored document has its own pages. Images: cleanup keeps every image referenced by any version, so they're still on disk.
- **[History grows without bound]** → Versions are small JSON (about 20–200 KB). Pruning (keeping published versions and daily snapshots) is a later change.
- **[A preview of an English version uses today's shared fields]** It doesn't show the shared fields as they were when that English version was saved. → That's what restoring would produce, which is what the preview is for. The banner doesn't claim otherwise.

## Migration Plan

1. The migration adds `versions.restored_from`, null for every existing version.
2. No data is rewritten.
3. Rollback: older builds ignore the column.
