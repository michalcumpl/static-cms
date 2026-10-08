# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`), and every
server message to both languages. The type check and the untranslated-text test enforce this.

## 1. Model: the focal point and schema version 12

- [x] 1.1 Add `focus_x`/`focus_y` (integers 0–100, default 50) to `image` in `schema.ts` and
  `ImageNode`, and the `invalid-focal-point` check (decision 3). Verify with unit tests "Face in
  the upper third", "Out of range" and a non-integer position.
- [x] 1.2 Add `toVersion12` in `migrate.ts`, set `SCHEMA_VERSION` and the schema default to 12,
  and update the `migrateSite` comment, fixtures and the builder. Verify with the unit test
  "Upgrade the bakery" (every image at 50, 50, version 12) and "Unsupported schema version" for
  11, and check that the existing fixture and builder tests pass.

## 2. Rendering

- [x] 2.1 Make `renderImage` add a `focus-X-Y` class for an off-centre point, with the page's
  `<style>` holding its rule (decision 4). Verify with unit tests "Portrait framed on the face",
  "Centred image" and "Only where shown", `html-validate` on a page with an off-centre image,
  and snapshots unchanged.

## 3. Server: editing images

- [x] 3.1 Generate migration `0001` with `source_key` and `edit` on `media` (decision 2), and add
  `source` to `toItem` and the library JSON. Verify with `pnpm --filter admin db:generate`
  producing only those two columns and a `db.test.ts` that migrates a fresh database.
- [x] 3.2 Implement `editImage` in `media.ts`: resolve to the source, validate, rotate and
  extract from the original or the largest variant, deduplicate by hash, store through
  `storeImage`, all inside `serially` (decision 1). Verify with `media.test.ts` cases "Crop a
  photo", "Turn a sideways scan", "Edit an edited image", "Same edit twice", "Crop outside the
  picture", "Too small", a legacy image with no original, a removed crop brought back, and no
  EXIF in the result.
- [x] 3.3 Add `POST /api/projects/[project]/media/[name]/edit` with member access, the same-site
  check and 400 `{ message }` for refusals. Verify with `media-api.test.ts`: 201 for a new crop,
  200 for a repeat, 400 with a reason, "not found" for another workspace, 401 signed out, and
  refusal from another site.
- [x] 3.4 Make `cleanupMedia` keep the sources of kept images (decision 6). Verify with the
  unit test "Source of a kept crop" and the existing "Cleanup" test passing.

## 4. Editor: the crop dialog

- [x] 4.1 Write the frame maths in `crop.ts` (`clampFrame`, `resizeFrame`, `fitShape`,
  `turnFrame`, a 64-pixel minimum) and `shapeOf` in `image-slots.ts` (decision 5). Verify with
  unit tests for clamping at edges with a locked shape ("Frame kept in shape"), turning a frame,
  the largest centred frame per shape, and each owner type's shape (a gallery shape only with
  `fill`).
- [x] 4.2 Build `CropDialog.svelte` (picture with turn, draggable frame and handles, keyboard
  moves and a live region, shape radio group, reset, save with progress and the server's
  reason, cancel), mounted beside `MediaLibrary` and exposed as `editor.openCrop`. Verify with
  e2e "Keyboard only" and "Cancel".
- [x] 4.3 Add "Edit" in `MediaLibrary.svelte` that opens the dialog and puts the result first
  and selected. Verify with e2e "Turn a sideways photo in the library".
- [x] 4.4 Add "Crop and rotate" in `ImagePanel.svelte` and `form/FormImage.svelte` with the
  `swapImage` transform (keeps the description, resets the focal point, one undo step), hidden
  where the image can't be replaced. Verify with a `swapImage` unit test, e2e "Crop a portrait
  from a group photo" and "Re-crop", and a check that a non-primary language shows no button for
  a person's portrait.

## 5. Editor: the focal point

- [x] 5.1 Add the `setImageFocus` transform and `object-position` on the canvas's
  `nodes/Image.svelte`, and reset the point in `setImage` when the key changes. Verify with unit
  tests (set, reset on replace, unchanged when the same image is chosen again).
- [x] 5.2 Build `FocalPoint.svelte` (click, arrows by 1, Shift and arrows by 10, "Centre",
  `aria-valuetext`, key presses batched) in the Image panel and `FormImage`, hidden for logos,
  the site logo, the favicon and read-only collection items (decision 7). Verify with e2e "Keep a
  face in view", "Arrow keys", "Reset" and "No focal point for logos".

## 6. Finish

- [x] 6.1 Mark `image-cropping` done in `docs/roadmap.md` (phase 3 table, "Where we are", and
  "Known limits": cropping is no longer missing, but share files still ignore the focal point),
  and update the README's media line. Check that the links resolve.
- [x] 6.2 Run typecheck, lint, the unit tests and the full e2e suite. Crop and set a focal point
  on one of the local example sites, publish to the preview, and check the result. Record any
  deviations in design.md under "Changes made while building".
