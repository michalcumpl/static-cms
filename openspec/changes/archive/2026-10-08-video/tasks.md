# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`), and every
site string to each site language. The type check and the untranslated-text test enforce this.

## 1. Model

- [x] 1.1 `videoEmbed(url)` and the `videos` and `video` node types with their validation and the
  `unsupported-video` and `video-as-link` codes (decisions 1 and 2). Verify with unit tests for
  every address form (and ones that aren't videos) and for the site-document scenarios ("Films
  from YouTube", "Address that isn't a video", "Video without a title", "Trailer somewhere else",
  "Videos block").
- [x] 1.2 The builder's `blocks.videos` (decision 5). Verify: its every-block site has a videos
  block and validates.

## 2. Rendering and export

- [x] 2.1 The videos block, the shared video figure, the project trailer, styles and the script
  rule (decision 3). Verify with unit tests "A film before play" (no provider address in any
  `src`/`srcset`), "Several videos", "Script only with a video", the project page with a Vimeo
  and with another address, `html-validate`, and snapshots unchanged apart from the stylesheet
  and the project page.
- [x] 2.2 The script file and the export (decision 3). Verify with a unit test of the script's
  behaviour in a DOM (link replaced by the iframe with the right `src` and `title`), and the
  export test "Video script only when needed".

## 3. Editor

- [x] 3.1 The canvas components, item handles and limits (`itemLimit`), the inserter and picker
  drawing, and the poster slot (decision 4). Verify with unit tests (insert, add, duplicate,
  delete, limits) and e2e for inserting a videos block.
- [x] 3.2 The Video panel and `setVideoUrl`, and the preview serving the script (decision 4).
  Verify with unit tests and e2e "Add a film", "Not a video address", and "Press play" in the
  preview, checking that no request goes to YouTube before play.

## 4. Examples and checks

- [x] 4.1 Rebuild Aniděti and Punk Film and reload them (local only, decision 5). Verify:
  `check.ts` reports no errors, and screenshots of Aniděti's films page and a Punk Film project
  page read well.
- [x] 4.2 Update `docs/layouts.md` (item 8 done), `docs/roadmap.md` (`video` done) and
  `docs/tasks.md`. Run the type check, unit tests, lint and the full Playwright suite; verify that
  all pass. Record any deviations in design.md under "Changes made while building".
