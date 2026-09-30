# Proposal

## Why

iPhones store photos as HEIC, which the server can't decode. The check on 2026-09-30 (archived `media-library` design, Risks) showed what happens in practice:
- iOS Safari converts HEIC to JPEG before uploading, so iPhone uploads work.
- Safari on the Mac also converts, but renames the file to `tempImage….jpg`, so the image gets a meaningless key.
- **Chrome on the Mac can't upload HEIC photos at all.** The editor's file picker greys them out, and a dropped HEIC file is refused.

Owners who move photos from their phone to a Mac and use Chrome hit a dead end with no workaround in the app.

## What Changes

- **HEIC in the picker.** The library dialog's file picker accepts HEIC/HEIF (`image/heic`, `image/heif`, `.heic`, `.heif`) as well as JPEG, PNG and WebP, in every browser. Chrome can then select HEIC photos, and Safari hands over the original file with its real name instead of converting it itself.
- **Conversion in the browser, before upload.** A HEIC/HEIF file, whether chosen or dropped and whether recognised by type, extension or content, is converted to a JPEG named `<original name>.jpg`, then uploaded as before:
  - by the browser's own decoder where there is one (Safari);
  - otherwise by libheif (`libheif-js`), loaded only the first time a HEIC file needs it (Chrome, Firefox).
- **Dialog feedback.** Each file shows "Converting…" before its upload progress. A file that can't be converted shows "This photo couldn't be converted. Export it as JPEG and try again." and nothing is sent. The dialog's hint mentions HEIC.
- **Size cap.** Converted photos are at most 4096 px on their longer side. Safari on iOS can't draw larger canvases, and the widest published variant is 2400 px anyway.
- **The server doesn't change.** It still accepts only JPEG, PNG and WebP, then turns images upright, strips all metadata, and makes the variants. The 20 MB limit applies to the converted JPEG.

### Non-goals (this change)

- Decoding HEIC on the server.
- AVIF uploads (same container family, still refused).
- Keeping HDR (gain maps) or the extra images of a HEIF file (bursts, depth). Only the primary image is used.
- Converting in a Web Worker. The conversion runs on the page; a worker can come later if large photos make the page stutter.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-editing`: the media library dialog accepts HEIC/HEIF photos and converts them to JPEG in the browser before uploading, with a converting state and a clear failure message.

## Impact

- `apps/admin`:
  - `libheif-js` as a new dependency (LGPL-3.0, loaded as its own lazily fetched chunk);
  - `$lib/editor/heic.ts` (detection, native decoding, libheif fallback, JPEG encoding);
  - `MediaLibrary.svelte` (`accept`, the conversion step, states, hint);
  - a small HEIC test fixture;
  - unit tests for detection;
  - Playwright tests for choosing and dropping a HEIC file in Chromium.
- No server, database or document changes.
- README: supported formats. Roadmap: known limits of the media item.
