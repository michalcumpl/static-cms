# Tasks

## 1. Spike: what browsers send when the picker lists HEIC

- [ ] 1.1 Re-run the upload check page with a third picker whose `accept` adds `image/heic,image/heif,.heic,.heif`, on iOS Safari, macOS Safari and macOS Chrome; record in design.md (Risks) whether each sends HEIC or JPEG and under which name, and verify the dialog's behaviour for each browser follows from design.md decision 2

## 2. Converter

- [x] 2.1 Add `libheif-js` to the catalog and `apps/admin`; verify `pnpm install --frozen-lockfile` passes and `vite build` emits the libheif bundle as its own chunk, not part of the editor's main chunk (check the build output)
- [x] 2.2 Implement `isHeic` and the size-cap helper in `$lib/editor/heic.ts`; verify with Vitest for type, `.heic`/`.heif` names, `ftypheic`/`ftypmif1` bytes, and negatives (JPEG, PDF, `ftypavif`), and for 5712×4284 → 4096×3072, 4032×3024 unchanged, 3024×4032 unchanged
- [x] 2.3 Implement `convertHeic(file)` (native `createImageBitmap` with `imageOrientation: "from-image"`, libheif fallback through a dynamic import, canvas capped at 4096 px, JPEG 0.92, name `<basename>.jpg`, errors as a result instead of a throw); verify with a Playwright test in Chromium that converting the fixture yields a 4032×3024 JPEG named `photo.jpg`, as part of task 3.2

## 3. Library dialog

- [x] 3.1 Create the HEIC fixtures with `sips` (4032×3024 and 5712×4284, flat images) under `apps/admin/e2e/media/`; verify each is under 200 KB and that `sips -g pixelWidth -g pixelHeight` reports the intended size
- [x] 3.2 Use the converter in `MediaLibrary.svelte`: extend `accept`, convert before `send` for chosen and dropped files, add the converting state, the failure message and the new hint; verify with Playwright for the HEIC photo in Chrome, Dropped HEIC photo, Unreadable HEIC file, Very large HEIC photo and HEIC files can be chosen (the input's `accept` attribute), and that the existing media tests (JPEG unchanged, PDF refused) still pass
- [x] 3.3 Document HEIC support, the in-browser conversion, the 4096 px cap and libheif's LGPL license in `apps/admin/README.md` (Images), and update the known limits of the media item in `docs/roadmap.md`; verify both mention that the server itself still refuses HEIC

## 4. Integration

- [ ] 4.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally and in CI (a CI run after pushing); verify all pass
- [ ] 4.2 Check the native path by hand: upload an iPhone HEIC in iOS Safari and in macOS Safari, then in macOS Chrome, and confirm each appears in the library under its real name (not `tempImage…`) with the right orientation; record the result in design.md
