# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`), and every
site string to each site language. The type check and the untranslated-text test enforce this.

## 1. Model

- [x] 1.1 `slides` on the hero, the `slide` type, the `slideshow` look, `toVersion11`, fixtures at
  format 11 with `demo-site-v10.json` kept (decision 1). Verify with unit tests "Upgrade the
  bakery" (10 → 11) and the existing tests on the new fixtures.
- [x] 1.2 Validation with the shared `checkItemLink` and the `slideshow-too-short` code (decision
  2). Verify with unit tests "Latest work", "One slide", "Slide without a photo", "Slides kept in
  another look", too many slides and a broken slide link.
- [x] 1.3 The builder's slides (decision 5). Verify: its every-block site has a slideshow hero and
  validates.

## 2. Rendering and export

- [x] 2.1 The slideshow markup and styles, scripts per page, strings (decision 3). Verify with unit
  tests "Six projects", "One slide left", "Slideshow script only with a slideshow",
  `html-validate`, and snapshots unchanged apart from the stylesheet.
- [x] 2.2 `SLIDESHOW_SCRIPT` and the export (decision 3). Verify with the export test "Slideshow
  script only when needed", and the script's behaviour in e2e (2.1's markup in a browser):
  advancing, pause on focus and hover, reduced motion, the controls and inert slides.

## 3. Editor

- [x] 3.1 The "Slideshow" look adding two slides, slides on the canvas, item handles with the limit
  of eight, `insertHero` with slides (decision 4). Verify with unit tests (look and slides one
  step, limits, duplicate) and e2e "Make the hero a slideshow" and "Ninth slide".
- [x] 3.2 `LinkPanel` for cards and slides, `setItemLink` (decision 4). Verify with unit tests and
  e2e "Link a slide to a project", and the cards e2e still passing.

## 4. Examples and checks

- [x] 4.1 Rebuild Punk Film with a slideshow and reload it (local only, decision 5). Verify:
  `check.ts` reports no errors, and screenshots of the home page read well.
- [x] 4.2 Update `docs/layouts.md` (item 17 done), `docs/roadmap.md` (`hero-slideshow` done) and
  `docs/tasks.md`. Run the type check, unit tests, lint and the full Playwright suite; verify
  that all pass. Record any deviations in design.md under "Changes made while building".

## 5. Clips from Vimeo (decided 2026-10-08)

- [x] 5.1 `clip_url` on slides, `slideClip(url)` and the `unsupported-clip` error. Verify with unit
  tests for every accepted form and "Clip that isn't a Vimeo file".
- [x] 5.2 The clip in the slide's markup and in the script (load and play the current one only,
  pause the others, none under reduced motion or data saver, advance on end). Verify with unit
  tests of the markup and e2e "Clips load only when shown" and "Reduced motion" (no clip
  requested), with the clip requests intercepted.
- [x] 5.3 The clip field in the Slide panel, the builder's `clip`, and Punk Film's slides with
  their clips (local only). Verify with unit tests, e2e "Add a clip", and a screenshot.

