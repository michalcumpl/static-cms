# Proposal

## Why

Owners' photos rarely come in the shape a block shows them in. Galleries cut to 4:3, cards to
16:10, portraits to a circle, and the full-photo hero to whatever the screen allows, always from
the centre. Faces end up cut off, and sideways scans stay sideways. Today the only fix is to edit
the file elsewhere and upload it again. The roadmap lists `image-cropping` as the next change
("crop, focal point and rotation in the media library", `docs/roadmap.md`, phase 3), before
`guided-setup` asks new owners for their photos.

## What Changes

- **Cropping and rotating make a new image** (chosen 2026-10-08 over editing in place). The
  owner turns the picture in 90° steps and draws a crop frame, free or locked to a shape (1:1,
  4:3, 3:2, 16:9). Saving adds a new library image cut from the source's full original. The
  source stays as it was, so documents, older versions and undo that use it are unaffected. The
  new image goes through the same pipeline as an upload (variants, no metadata, its own media
  key), so rendering, publishing, icons and share files need no change.
- **Edits stay re-editable.** An edited image remembers its source and the edit. Editing it again
  opens the source with the previous frame, so a crop is never cut from a crop. The same edit
  made twice gives the same image.
- **A focal point per use of an image** (chosen over one per library image). Each `image` node
  gets a focal point, centred by default, and the site renders it as `object-position` (a
  class, and a small `<style>` in the page's head). A photo can then show the face in a 1:1
  portrait and the shop front in a wide hero without being cut twice. The image is not cut,
  and changing the shape of a block keeps the point.
- **Where the owner does it** (chosen: the library and the image panel):
  - the media library dialog gets "Edit" on an image, which adds the result to the library and
    selects it;
  - the editor's Image panel and the list forms' image field (people, testimonials, projects)
    get "Crop and rotate". This opens the same editor on the placed image, with the frame
    locked to the shape that block shows. Saving swaps the new image into that use and keeps
    its description, in one undoable step.
  - the same two places get "Focal point": click the picture, or use the arrow keys, to set it,
    and "Centre" to reset it.
- **Format change:** schema version 12 gives every existing image a centred focal point, and
  pages render exactly as before.
- **Cleanup** keeps a removed image while an image cut from it is still kept, so it can be
  edited again.

Not in this change: free-angle straightening, flipping, filters or brightness, cropping on the
canvas itself, a focal point for share files (they still cut from the centre; owners can crop a
share image instead), AVIF, and editing images outside the library (logos as SVG, video
thumbnails).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `media`: a new "Editing images" requirement (crop and rotate into a new image); the library
  lists an edited image's source and edit; cleanup keeps sources of kept images.
- `site-document`: Site node (schema version 12); new "Image focal point" and "Upgrading
  version-11 documents" requirements.
- `site-rendering`: Images (an image's focal point as `object-position`).
- `site-editing`: new "Cropping and rotating images" and "Focal point" requirements, covering the
  library dialog, the Image panel and the list forms.

## Impact

- `@webmio/model`: `focus_x` and `focus_y` on `image` (schema, `ImageNode`, defaults,
  validation `invalid-focal-point`), `toVersion12` in `migrate.ts`, schema version 12, fixtures
  and the builder.
- `@webmio/render`: `renderImage` adds a focal point class, and the page's head gets a `<style>`
  for the classes it uses; snapshots of upgraded documents are unchanged.
- Admin server: `editImage` in `media.ts` (sharp rotate and extract from the original, then the
  upload pipeline), `media` table columns `source_key` and `edit` (a Drizzle migration),
  `POST /api/projects/<p>/media/<key>/edit`, the library's JSON, and cleanup's keep rule.
- Admin UI: a `CropDialog.svelte` (frame, handles, keyboard, shape presets, rotate), "Edit" in
  `MediaLibrary.svelte`, "Crop and rotate" and a `FocalPoint.svelte` in `ImagePanel.svelte` and
  `form/FormImage.svelte`, the slot shapes per owner type in `image-slots.ts`, transforms
  `setImageFocus` and `swapImage`, `object-position` on the canvas's `nodes/Image.svelte`, and
  i18n in Czech and English.
- No new dependencies: sharp already does rotation and extraction.
