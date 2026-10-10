# Tasks

## 1. The document

- [x] 1.1 The `banner` node (decision 1) in `@webmio/model`:
  - the schema and page blocks, types and `BlockInput`/`blocks.banner`;
  - validation (decision 2): `empty-heading`, `too-many-items`, and the heading counting for
    `heading-skip`;
  - verify with model tests for "A banner between two blocks", "Banner without a heading", "A
    smaller subheading after a banner", and the builder's every-block site.

## 2. Rendering

- [x] 2.1 `renderBanner` and its CSS (decision 3):
  - the photo band, sharing the hero cover's rules;
  - the plain primary-colour band with an inverted button;
  - `IMAGE_SIZES.banner`;
  - update the pinned stylesheet fixtures and snapshot;
  - verify with render tests for "A photo band", "A colour band" and "The photo loads when
    needed" (lazy, `sizes="100vw"`, the focal point's position), and that the page keeps one
    `<h1>`.

## 3. Editor

- [x] 3.1 The picker, illustration, `insertBanner`, `bannerHeading` in the site strings, and en/cs
  names (decision 4); verify with unit tests: the picker offers the banner anywhere, an insert
  has the heading in the site's language and the caret in it, the illustration tests.
- [x] 3.2 `nodes/Banner.svelte` (image slot, heading and text in place, button) and the button
  panel and image owners for `banner`; verify with unit tests for adding and removing its button
  (one at most) and its image, and e2e "Insert a banner mid-page", "Give the banner a photo" and
  "Give the banner a button".

## 4. Import

- [x] 4.1 Banner detection and mapping (decision 5), with a band added to the agency fixture's
  home page; verify with import tests "A photo band between card grids", "A background behind a
  long text", the home page's panel staying the hero, the agency's updated block list, and that
  the imported sites still validate.

## 5. Documentation and integration

- [x] 5.1 Update the README (20 blocks), `docs/import-mapping.md` (the band row, the planned-block
  note) and `docs/roadmap.md` (`banner-block` and `contact-form` done, 20 block types); run
  `pnpm turbo run typecheck test build`, Biome and the admin's end-to-end tests, and verify
  everything passes.
