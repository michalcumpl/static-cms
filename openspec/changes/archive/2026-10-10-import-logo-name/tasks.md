# Tasks

## 1. Whether the old header shows the name

- [x] 1.1 Export a `HIDDEN` selector list from `content.ts` (its hidden elements plus `offscreen`, `sr-only`, `visually-hidden`, `screen-reader-text`, `screenreader`, `hide-text` classes) and use it in `contentArea`; verify the existing content and fixture tests pass unchanged
- [x] 1.2 Make `homeImages` also return the logo element's visible text (the header image's link or parent, or the CSS logo rule's first element; `undefined` without one); verify `site.test.ts` cases for the bakery (`""`), a CSS logo with off-screen text (`""`), and a home link with an emblem and "Pekárna U Lípy" (the name)
- [x] 1.3 In `readSite`, pass `showName: false` to `site.logo` when there is a logo element whose visible text doesn't contain the site's name (without case, diacritics or extra spaces); verify "A logo that is the name", "A logo drawn by CSS" and "The name beside the logo" (the bakery's snapshot covers only the report, so it is unchanged)
- [x] 1.4 (Found in testing.) With hidden headings out of the content, Mareš's home took a menu icon (`ico-menu-pos.svg`, which is never imported) as the hero's photo instead of the building's photo from CSS; the hero never takes an SVG of the content; verify a `site.test.ts` case of an SVG icon and a photo filling a panel

## 2. Checks

- [x] 2.1 Import marespartners.cz locally and verify the site's `header_show_name` is off and the other languages share it; record it in `docs/import-mapping.md`
- [x] 2.2 Run lint, type checks, unit and end-to-end tests and verify they pass
