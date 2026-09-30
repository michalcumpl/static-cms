# Design

## Context

See proposal.md for the motivation. The code as it stands:

- **`MediaLibrary.svelte`.**
  - `ACCEPT = "image/jpeg,image/png,image/webp"`.
  - `uploadFiles(files)` creates one upload row per file with states `uploading → processing → done | failed`, then calls `send(file, upload)` for each, one after another.
  - `send` posts the file with `XMLHttpRequest` to `paths.library`.
  - Chosen and dropped files both go through `uploadFiles`.
- **The server** (`$lib/server/media.ts`) accepts JPEG, PNG and WebP by content and refuses the rest with 415. It turns images upright, strips metadata and re-encodes, so whatever the browser sends is normalised.
- **Media keys** come from the file name. With the file name `IMG_5420.jpg`, the key is `img-5420-<hash>`.
- **`libheif-js` 1.23.2 (LGPL-3.0)** ships three variants:
  - pure JS (3 MB);
  - `wasm`, with a separate `libheif.wasm` (1.4 MB), aimed at Node; its README calls bundling it unsupported;
  - `libheif-wasm/libheif-bundle.mjs` (about 2 MB, the WebAssembly inlined), an ES module that works in browsers.

  The API is `new HeifDecoder().decode(bytes)`, which returns images with `get_width()`, `get_height()` and `display(imageData, callback)`.
- **The HEIC check** (archived `media-library` design) covered iOS Safari, macOS Safari and macOS Chrome with a JPEG/PNG/WebP picker. It didn't cover a picker that lists HEIC.

## Goals / Non-Goals

**Goals:**
- Every browser that can run the editor can upload iPhone photos.
- No download cost for anyone who never picks a HEIC file, and none in Safari at all.
- Nothing HEIC-specific reaches the server.

**Non-Goals:**
- A Web Worker, streaming decode, or HDR output.

## Decisions

### 1. Everything HEIC goes through one converter

`accept` becomes `image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif`. The extensions are listed because Chrome on macOS doesn't map every HEIC file to the MIME type.

`isHeic(file)` decides:
- true when `file.type` is `image/heic`, `image/heif`, `image/heic-sequence` or `image/heif-sequence`;
- true when the name ends in `.heic` or `.heif`;
- otherwise, true when bytes 4–11 are `ftyp` followed by a HEIF brand (`heic`, `heix`, `hevc`, `heim`, `heis`, `mif1`, `msf1`).

The byte check covers files that arrive without a type or with the wrong extension.

`uploadFiles` calls `prepareUpload(file)` before `send`:
- files that aren't HEIC pass through unchanged;
- HEIC files come back as a JPEG `File`, or as an error.

### 2. Native decoding first, libheif as the fallback

```
decodeHeic(file):
  try createImageBitmap(file, { imageOrientation: "from-image" })   -- Safari
  catch -> libheif:
    const { default: libheif } = await import("libheif-js/libheif-wasm/libheif-bundle.mjs")
    images = new libheif.HeifDecoder().decode(new Uint8Array(await file.arrayBuffer()))
    primary = images[0]; ImageData(w, h); primary.display(imageData, done)
  -> draw onto a canvas scaled to at most 4096 px on the longer side
  -> canvas.toBlob("image/jpeg", 0.92) -> File(`${basename}.jpg`, { type: "image/jpeg" })
```

- **Loading.** The dynamic `import()` becomes a separate Vite chunk of about 2 MB (the WebAssembly inlined), fetched only on the first HEIC file in a browser without native support, and cached like any asset.
- **Why not the separate `.wasm`.** The package calls that build unsupported with bundlers. A later change can try loading it through `locateFile` and an `import.meta.url` asset, if 0.6 MB less download matters.
- **LGPL.** The library stays a separately loaded, replaceable file, and the README notes the license.
- **Orientation.** libheif applies the file's rotation and mirroring (`irot`/`imir`) when decoding. Native decoding applies them because of `imageOrientation: "from-image"`. Either way the pixels come out upright; the server's `rotate()` then has nothing to do, since the JPEG carries no orientation.
- **Primary image.** libheif returns the primary image first. Gain maps, depth maps and thumbnails are ignored.
- **Size cap: 4096 px on the longer side,** with the scale factor applied to both sides and rounded:
  - Safari on iOS refuses canvases over 16,777,216 pixels, so a 24-megapixel iPhone photo would come out blank;
  - the widest published variant is 2400 px;
  - it also keeps the JPEG well under 20 MB.
- **Errors.** Any exception, an empty result, or a canvas that yields no blob counts as "couldn't be converted".

### 3. Dialog states

- **Upload states** become `converting → uploading → processing → done | failed`. Rows for files that don't need conversion start at `uploading`.
- **Name.** A converted file's row shows the new name (`IMG_5420.jpg`).
- **Failure.** Shows "This photo couldn't be converted. Export it as JPEG and try again."
- **Hint.** "JPEG, PNG, WebP or HEIC (converted in your browser), up to 20 MB. Location and camera data are removed."

### 4. Tests

- **Unit (Vitest):** `isHeic` by type, by name, and by bytes (`ftypheic`, `ftypmif1`), plus negatives (a JPEG, a PDF, an AVIF with `ftypavif`); the size-cap arithmetic.
- **Playwright (Chromium, so the libheif path).** Uses `apps/admin/e2e/media/photo.heic`, made once on macOS with `sips -s format heic` from a 4032×3024 JPEG (a flat image, so the file is small). The tests:
  - choose it: the library lists `photo.jpg`, 4032×3024, key `photo-<hash>`;
  - drop it;
  - choose a `.heic`-named text file: the conversion error appears and nothing is uploaded;
  - a 5712×4284 fixture comes out as 4096×3072.
- **Safari's native path isn't covered by CI,** which installs only Chromium. It is checked by hand on iOS and macOS as the final task.

## Risks / Trade-offs

- **[Risk] With HEIC in `accept`, iOS might stop converting and send the raw HEIC.** → Checked on 2026-09-30 (task 1.1), with the same iPhone photo (stored as HEIC) in three pickers:

  | Browser | JPEG/PNG/WebP picker | Picker listing HEIC (C) | Picker without `accept` |
  |---|---|---|---|
  | iOS 18 Safari | JPEG, `IMG_5420.jpeg` | JPEG, `IMG_5420.jpeg` | JPEG, `IMG_5420.jpeg` |
  | macOS Safari 26 | JPEG, `tempImage….jpg` | raw HEIC, `IMG_5420.HEIC` | raw HEIC, `IMG_5420.HEIC` |
  | macOS Chrome 153 | HEIC not selectable | raw HEIC, `IMG_5420.HEIC` | raw HEIC, `IMG_5420.HEIC` |

  iOS always hands over a JPEG with the photo's real name, so on the iPhone the converter never runs and nothing extra is downloaded. On the Mac, both browsers send the raw HEIC (`image/heic`) with its real name once HEIC is listed, and the editor converts it: natively in Safari, with libheif in Chrome. This also ends Safari's `tempImage…` names, so the key becomes `img-5420-<hash>`.
- **[Trade-off] About 2 MB downloaded on the first HEIC file in Chrome or Firefox.** It happens once per browser cache, only for people who pick a HEIC file, and "Converting…" covers the wait.
- **[Risk] A 12-megapixel decode on the page takes a second or two and briefly holds about 50 MB.** → Files convert one at a time, like uploads. A Web Worker is a follow-up if the page stutters.
- **[Risk] Some HEIF variants don't decode** (unusual codecs, or `heic-sequence` Live Photo stills). → The clear failure message tells the owner to export as JPEG, and nothing half-converted is uploaded.
- **[Trade-off] Colour.** The canvas works in sRGB, so Display P3 iPhone photos lose a little saturation. The server converts to sRGB anyway.

## Verification

- **2026-09-30 (task 4.2):** the owner uploaded an iPhone HEIC photo through the editor's media library in iOS Safari, macOS Safari and macOS Chrome. In each browser the photo appeared in the library upright and under its real name.

## Open Questions

- The JPEG quality (0.92) can be tuned after looking at real photos, without changing specs or tasks.
