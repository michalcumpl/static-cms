# Tasks

## 1. Spike: what browsers upload

- [x] 1.1 Check what iOS Safari (photo library, `accept="image/jpeg,image/png,image/webp"`) and macOS Safari/Chrome (a `.heic` file) actually send, using a throwaway page that logs the file's type, name and first bytes; record the outcome in design.md (Risks) and verify it names the follow-up, if one is needed

## 2. Width ladder and rendering

- [x] 2.1 Add `imageVariants(width)`, `imageFile(key, width)` and `usedImageFiles(doc)` to `packages/site` and export them; verify with unit tests: 4032 → 480/960/1600/2400, 1000 → 480/960/1000, 320 → 320, 480 → 480, and the demo site → `["hero.png-320.webp"]`
- [x] 2.2 Render images with `srcset`, `sizes` (the hero's fixed value), the variant `src` and the dimensions, and add `missing-image-size` validation; verify with the site-rendering scenarios Large hero image and Small image, the site-document scenarios Unknown dimensions and Path in source, and that html-validate passes on the regenerated snapshots
- [x] 2.3 Make `exportSite` use `usedImageFiles` for the file list and `missing-media`, and rename the demo fixture's media to `hero.png-320.webp` (a WebP made from `hero.png`); verify with the site-export scenarios Missing media, Unused media and All variants exported, and `pnpm --filter @static-cms/site test`

## 3. Storage and processing

- [x] 3.1 Add `sharp` to the catalog and `apps/admin`, and check whether an `allowBuilds` entry is needed; verify `pnpm install --frozen-lockfile` and a one-line sharp resize run locally, and that CI installs its linux binary (a CI run)
- [x] 3.2 Add the `media` table (design.md decision 3) with a Drizzle migration; verify with a unit test that a fresh in-memory database has the table with its unique `(project_id, sha256)` index
- [x] 3.3 Implement `uploadImage` in `$lib/server/media.ts` (type check, limits, `rotate()`, metadata-free original, WebP variants, key, duplicate handling, one-at-a-time queue, temp files renamed into place); verify with unit tests on generated images for the media scenarios Upload a photo, Disguised file refused, Too large, Location removed (EXIF with GPS is gone from every stored file), Rotated photo, Same file twice, Variants of a large photo and Variants of a small image, and an animated WebP being refused
- [x] 3.4 Implement `listLibrary`, `removeFromLibrary` and re-upload restoring an image; verify with unit tests for List after upload, Remove an image in use (the variant file stays readable) and a removed image returning when uploaded again
- [x] 3.5 Implement `registerLegacyMedia` and call it from startup `init` after the import; verify with a unit test for Imported demo image (library entry, `hero.png-320.webp`, top-level `hero.png` left in place) and that a second start registers nothing new

## 4. HTTP API and access

- [x] 4.1 Add `POST` and `GET /api/projects/[project]/media`, restrict `GET …/media/[file]` to variant names, and add `DELETE …/media/[key]`; verify with handler tests: 201/200/413/415 with messages, the library listing, 204 on removal, an original under `originals/` never served, and 401/404 for non-members (the Media of another workspace scenario)
- [x] 4.2 Warn at startup when `BODY_SIZE_LIMIT` is missing or below 25M in production, and document `BODY_SIZE_LIMIT`, the upload limits and supported formats in `apps/admin/README.md`; verify with a unit test of the warning and that the README's environment table lists `BODY_SIZE_LIMIT`
- [x] 4.3 Switch the preview and the overview's ZIP download to `usedImageFiles` (design.md decision 7); verify with the preview route test serving `assets/images/hero.png-320.webp`, and a Playwright check that the ZIP lists only that image file

## 5. Editor

- [x] 5.1 Add `setHeroImage` and `removeHeroImage` transforms, and make `Image.svelte` show the variant; verify with unit tests for Add an image to a hero (media key and dimensions stored), Remove the hero image with undo restoring the alt text, and replace clearing the alt text unless the same image is chosen
- [x] 5.2 Build `MediaLibrary.svelte` (list with thumbnails, file input and drop zone, XHR progress per file, errors, choose, remove from library); verify with Playwright for Upload and choose (a generated JPEG), and Refused upload (a PDF)
- [x] 5.3 Add "Replace…" and "Remove" to the Image panel and "Add image" to a hero without an image, focusing the alt text after choosing; verify with Playwright: remove the demo hero image, add it back from the library, the alt field is focused with the describe hint (Description asked for after choosing), then save and see it in the preview

## 6. Cleanup and integration

- [x] 6.1 Add the `media-cleanup [--dry-run]` admin command (design.md decision 8); verify with a unit test for the Cleanup scenario and a dry run that deletes nothing
- [x] 6.2 Walk through end to end in Playwright: upload a phone-sized JPEG with GPS EXIF, use it in the hero, describe it, save, export the ZIP, and check that it holds the variants and no EXIF; verify that `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite pass locally and in CI
- [x] 6.3 Mark "Media library and image upload" as done in `docs/roadmap.md` Milestone 3, with the change link, the decisions (sharp, WebP width ladder, hashed keys, remove-then-cleanup) and the known limits (hero only, no HEIC from Mac, no AVIF); verify the links resolve once the change is archived
