# Design

## Context

See proposal.md for the motivation. The code as it stands:

- **Storage.** Media lives on disk as `$MEDIA_DIR/<projectId>/<file name>`, with no database record (`project-media.ts`). `GET /api/projects/<p>/media/<name>` serves a file to members, with the content type taken from the extension.
- **Document.** `image { src, alt, decorative, width, height }`. `src` must match `MEDIA_KEY` (`/^[A-Za-z0-9][A-Za-z0-9._-]*$/`). Images occur only in `hero.image` (0..1), a list the editor keeps fixed (`isFixedList`).
- **Rendering.** `renderImage` emits one `<img src="{base}assets/images/{src}">`. `exportSite` copies `media.get(src)` for each used image.
- **Preview and ZIP.** The preview passes `projectMedia(projectId)` (every file). The overview's ZIP download fetches every name in `projectMediaNames`.
- **Hero layout.** The image column is `2fr` of `3fr 2fr` from a 48rem container width, and full width below that.
- **Demo image.** The demo `hero.png` is 320×180 and matches its node.
- **Hooks.** `hooks.server.ts` already refuses cross-site non-GET `/api/` requests. Startup `init` runs migrations and the working-copy import.
- **Deployment.** `adapter-node` limits request bodies to 512 KB by default (`BODY_SIZE_LIMIT`).

## Goals / Non-Goals

**Goals:**
- Anything published is metadata-free and sized for the web, with no action needed from the owner.
- The document stays the only input to rendering. Variants follow from `src` and `width`.
- Nothing a document, a version or undo can point to disappears while it is still referenced.

**Non-Goals:**
- Background jobs or queues beyond serialising uploads within one process.
- Reprocessing existing images when the ladder changes. The originals make it possible later.

## Decisions

### 1. sharp in `apps/admin`, one upload at a time

- **Dependency.** `sharp` goes into the catalog. Since 0.33 it ships prebuilt libvips binaries as optional `@img/sharp-<platform>` packages, with no install script. Check whether `allowBuilds` needs an entry (it shouldn't) and that CI installs `@img/sharp-linux-x64`.
- **Memory.** `sharp.cache(false)` and `sharp.concurrency(1)`. An in-process promise chain processes one upload at a time, because a 40-megapixel decode needs about 160 MB of RAM and the target is a small VPS.
- **Limits.** `limitInputPixels: 40_000_000` and `failOn: "error"`. After reading `metadata()`:
  - refuse when `format` is not one of `jpeg`, `png` or `webp`;
  - refuse when `pages > 1` (animated).
- **Alternatives.** `jimp` (pure JS) is slow and has no good WebP encoder. `squoosh` is abandoned. Calling the external `vips` CLI adds an operational dependency.

### 2. Processing pipeline and files

```
upload bytes --sha256--> hash (dedupe per project, key suffix)
     |
     v
sharp(bytes).rotate()           -- apply EXIF orientation to pixels
     |                             (output drops all metadata by default)
     +--> original  : originals/<key>.<jpg|png|webp>   JPEG q95 / PNG / WebP q95
     +--> variants  : <key>-<w>.webp  for w in imageVariants(width), WebP q80
```

- **Dimensions.** `width` and `height` are the image's upright dimensions (after `rotate()`).
- **Layout on disk.**
  ```
  $MEDIA_DIR/<projectId>/<key>-<w>.webp              published variants
  $MEDIA_DIR/<projectId>/originals/<key>.<ext>        never served
  ```
  The media GET route serves only names matching `^<MEDIA_KEY>-\d+\.webp$` from the project folder. `originals/` has a slash in its path, so a file name can never reach it.
- **Writes.** Files are written to temporary names and renamed into place, and the database row is inserted last. A crash never leaves a registered image without files.

### 3. Media keys and the `media` table

- **Key.** `key = (slugify(basename without extension) || "image") + "-" + sha256hex.slice(0, 8)`. If a different file in the project already has that key (an 8-hex collision), use 12 hex characters.
- **Table.**
  ```
  media(project_id, key, sha256, original_name, format, width, height, bytes,
        created_at, created_by, removed_at)
    PK(project_id, key), UNIQUE(project_id, sha256)
  ```
- **Duplicates.** Uploading a file whose `sha256` already exists returns that row and clears `removed_at`.
- **Where it lives.** `$lib/server/media.ts`: `uploadImage`, `listLibrary`, `removeFromLibrary`, `registerLegacyMedia` and `cleanupMedia`. It replaces `project-media.ts`; the read helpers become `mediaFile` and `usedMediaFiles`.

### 4. The width ladder lives in `packages/site`

- **`imageVariants(width)`:** returns the ladder widths `[480, 960, 1600, 2400]` below `width`, plus `min(width, 2400)`, deduplicated. The server's processing and the renderer both use it, so they can't drift apart.
- **`imageFile(key, w)`:** returns `` `${key}-${w}.webp` ``.
- **`renderImage`:**
  - `src` is the largest variant of at most 1600 px;
  - `srcset` lists every variant with its `w` descriptor;
  - `width` and `height` come from the node.
- **`sizes` per block, never from the theme,** so theme changes keep the HTML unchanged as the rendering spec requires. The hero uses `(min-width: 48rem) 40vw, 100vw`, matching its `3fr 2fr` layout.
- **`usedImageFiles(doc)`:** returns the variant files of the reachable images, each file once, sorted. `exportSite` uses it for `missing-media` and the file list, so the renderer and the export agree by construction.
- **Validation.** A new `missing-image-size` code (category `site`) for `width` or `height` ≤ 0. It is a site problem, not a structural one, so documents with it can still be saved.

### 5. HTTP API

| Route | Does |
|---|---|
| `POST /api/projects/<p>/media` | multipart `file`; 201 `{ key, width, height, originalName }`, 200 for a duplicate, 413 (too big), 415 (type) with `{ message }` |
| `GET /api/projects/<p>/media` | library: `[{ key, originalName, width, height, createdAt }]`, newest first |
| `GET /api/projects/<p>/media/<file>` | a variant file (as today, restricted to variant names) |
| `DELETE /api/projects/<p>/media/<key>` | remove from library (sets `removed_at`); 204 |

- **Access.** Every route checks membership with `requireMember(..., { api: true })`. The Origin check in the hooks already covers POST and DELETE.
- **Body size.** The 20 MB limit is enforced in the handler from `content-length` and the actual size. **`BODY_SIZE_LIMIT=25M` must be set in production**, or adapter-node refuses the request before the handler runs. The README and the startup log say this.

### 6. Editor

- **Showing images.** A `mediaUrl(key, width)` helper picks the canvas image (the largest variant up to 1600 px). `Image.svelte` and the library thumbnails use it (the 480 variant, or the smallest one).
- **`MediaLibrary.svelte` (a `<dialog>`).**
  - It loads the list on opening.
  - Uploads go through `XMLHttpRequest`, for progress events, one file at a time; each shows a progress bar or an error.
  - A drop zone and a file input use `accept="image/jpeg,image/png,image/webp"`, which also makes iOS Safari convert HEIC to JPEG.
  - "Use this image" resolves the dialog's promise with `{ key, width, height }`. "Remove from library" calls DELETE and refreshes the list.
- **Transforms in `transforms.ts`:**
  - `setHeroImage(tr, heroId, media)`: with no image, it creates an `image` node (alt empty, not decorative) and sets `hero.image`. With an image, it updates `src`, `width` and `height`, and clears `alt` and `decorative` unless the key is unchanged.
  - `removeHeroImage(tr, heroId)`: sets `hero.image` to empty, and Svedit cascades the image node away.
  - Both are single transactions.
- **Entry points.**
  - The Image panel gets "Replace…" and "Remove".
  - `Hero.svelte` shows an "Add image" button (`contenteditable=false`) in place of the image when `hero.image` is empty.
  - After choosing, the image is selected and the panel's alt field is focused.
- **Fixed list.** `hero.image` stays a fixed list on the canvas: Backspace doesn't delete it; the Remove button does.

### 7. Preview, ZIP and startup

- **Preview.** It passes `mediaFiles(projectId, usedImageFiles(doc))` to `renderSite`/`exportSite`.
- **ZIP.** The overview's load returns `imageFiles: usedImageFiles(doc)` in place of `mediaNames`, and the browser fetches only those.
- **Startup `init`.** After migrations and the import, `registerLegacyMedia()` runs for each project. Every top-level file in the folder that is not a variant and has no row is processed. It is copied to `originals/`, with its file name as the key, and its variants are generated. The top-level file stays where it is: the media route doesn't serve it, and an older build can still read it. The file name stays the key, so documents don't change.
- **The import of the Milestone 2 working copy** copies files as before; the same step then registers them.

### 8. Cleanup command

`pnpm --filter @static-cms/admin admin media-cleanup [--dry-run]`:
- For each project, it collects the `src` of every image node in every stored version: it parses each version's JSON and walks its nodes.
- It deletes the files and rows of removed media whose key is not in that set, and prints each deleted key.
- It never touches media that is not removed.

## Risks / Trade-offs

- **[Risk] `BODY_SIZE_LIMIT` is forgotten in production, so every real photo fails with 413.** → The README deployment section says to set it. On startup the server logs a warning when it is set below 25M, or unset when `NODE_ENV=production`. A Playwright test uploads a 5 MB file (the dev server has no limit), and a unit test covers the handler's own 20 MB check.
- **[Risk] Large uploads use a lot of memory and take seconds.** → One upload at a time, `limitInputPixels`, and no sharp cache. The dialog shows a progress bar during upload and a "Processing…" state afterwards.
- **[Risk] HEIC from a Mac is refused.** → Refused with a clear message (JPEG, PNG, WebP). Task 1 checks what iOS and macOS browsers actually send; if Mac uploads matter, browser-side conversion becomes a follow-up change.
- **[Trade-off] Removed images stay on disk until someone runs the cleanup command.** This is deliberate: undo, older versions and Milestone 4 rollback depend on it. It costs a few MB per photo.
- **[Trade-off] Legacy keys like `hero.png` give variant names like `hero.png-320.webp`.** They look odd but are valid, and they avoid rewriting stored documents.
- **[Risk] A document's `width` disagrees with the real image (a hand-edited or imported document), so the renderer asks for a variant that doesn't exist.** → Export fails with `missing-media` naming the file, instead of publishing a broken image. The picker always writes the real dimensions.
- **[Trade-off] WebP only.** Every current browser supports it. The small remainder of very old browsers sees no image, only its alt text.

## Migration Plan

1. Set `BODY_SIZE_LIMIT=25M` in the production environment before deploying.
2. Deploy. The migration adds the `media` table, and startup registers and processes the existing files (seconds per image).
3. **Rollback:** the older build serves `assets/images/<src>` and would look for `<key>` files that don't exist for new uploads. Documents saved with uploaded images show broken images in its preview and fail its ZIP export. To roll back cleanly, restore the database and media folder from the backup taken before deploying. Legacy images keep working either way, because their top-level files are left in place (decision 7).

## Open Questions

- The exact WebP quality (80) and the original's JPEG quality (95) can be tuned after looking at real photos, without changing specs or tasks.
