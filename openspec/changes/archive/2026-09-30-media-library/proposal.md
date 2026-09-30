# Proposal

## Why

Owners can't add or change a single picture. The hero image is whatever the starter or demo site came with. When uploading arrives, the photos will come straight from phones: several megabytes, 4000 px wide, with EXIF data that often includes GPS coordinates. Publishing those as they are makes pages slow and can reveal where someone lives. The media library is the next step of Milestone 3, and later work builds on it: favicon, gallery, testimonials, logos.

## What Changes

- **Upload with server-side processing.** Members upload JPEG, PNG or WebP files (up to 20 MB and 40 megapixels) to a project.
  - The server checks the real file type from the file's bytes and strips all metadata (EXIF, GPS).
  - It stores a cleaned original and WebP variants in a fixed ladder of widths (480, 960, 1600, 2400 px, never wider than the original).
  - SVG, animated images, and anything that isn't a readable raster image are refused.
- **Media keys.** An uploaded image is identified by `<slug of its original name>-<8-character content hash>`, for example `chleb-na-pultu-3f9a2c1d`. Files from before this change keep their names as keys. Uploading the same picture twice gives the same key. A `media` table records each image's original name, dimensions, file size, uploader and time.
- **Responsive rendering.** **BREAKING** (output format): images render as `<img>` with `srcset` and `sizes` over the WebP variants, and `src` points to a variant instead of the uploaded file. The published file layout changes from `assets/images/<src>` to `assets/images/<key>-<width>.webp`. Image nodes must have known dimensions.
- **Export of variants.** The renderer lists every file a document needs. The ZIP download fetches only those files, not everything in the project's media folder.
- **Library and picker in the editor.** A library dialog shows the project's images; members can upload files into it by dropping them or choosing them. The Image panel gains "Replace…" and "Remove", and a hero without an image gets "Add image…". Choosing an image is one undoable action, and its alt text is asked for right away.
- **Safe removal.** "Remove from library" only hides an image from the library; its files stay on disk, so undo, older versions and later rollbacks keep working. An admin command deletes the files of images that no stored version references.
- **Processing existing files.** On startup, media from before this change (such as the imported demo `hero.png`) are registered under their existing name as the key and get their variants. Documents don't change.

### Non-goals (this change)

- Images outside the hero (gallery, content images, logos, favicon). They come with the blocks and settings that need them.
- Cropping, focal points, filters, and editing images.
- AVIF output, and the `<picture>` element with format fallbacks.
- SVG uploads, and HEIC decoding on the server. The first task checks what iPhones and Macs actually upload.
- Storage quotas, and any external storage or CDN.

## Capabilities

### New Capabilities

- `media`: uploading and processing images (type check, metadata removal, WebP variants), media keys, the per-project library, removal from the library, cleanup of unreferenced files, and access limited to members.

### Modified Capabilities

- `site-document`: image nodes require known dimensions, and an image's `src` is a media key.
- `site-rendering`: images render with `srcset`/`sizes` over the WebP width ladder, and the renderer reports which image files a document uses.
- `site-export`: the image files are the variants a document uses, under `assets/images/`.
- `site-storage`: the "Project media" requirement moves to `media`.
- `site-editing`: add, replace and remove the hero image through a library dialog with upload.

## Impact

- `packages/site`:
  - a width-ladder helper (`imageVariants(width)`);
  - the image renderer (`srcset`, `sizes`, variant `src`);
  - `usedImageFiles(doc)` for export;
  - the export file list;
  - validation that images have dimensions;
  - the demo fixture's media;
  - render and export tests and snapshots.
- `apps/admin`:
  - `sharp` as a new dependency (prebuilt binaries, no install script expected);
  - a `media` table and migration;
  - `$lib/server/media.ts` (processing, keys, storage, library queries, cleanup);
  - `POST`/`GET` routes under `/api/projects/<p>/media`;
  - the startup conversion;
  - the admin command `media-cleanup`;
  - the editor: library dialog, Image panel actions, hero image slot;
  - the overview's ZIP download;
  - tests, including Playwright for upload and picking.
- Deployment:
  - sharp's prebuilt binaries for linux-x64/arm64 (glibc);
  - `BODY_SIZE_LIMIT=25M` must be set for adapter-node, whose default of 512 KB would refuse every photo;
  - README notes on upload limits and the cleanup command.
- `docs/roadmap.md`: the media item of Milestone 3.
