# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Model

- [ ] 1.1 The four properties, `toVersion9`, the fixtures at format 9 with `demo-site-v8.json`
  kept, and the `cover-without-image` warning (decision 1). Verify with unit tests for "Full-photo
  hero", "Full-photo hero without a photo", "Unknown layout" and "Upgrade the bakery" (the
  version-8 demo upgrades to 9 with the defaults), and the existing tests passing on the new
  fixtures.
- [ ] 1.2 The builder's options (decision 4). Verify: its every-block site uses each variant and
  validates.

## 2. Rendering

- [ ] 2.1 The four variants' markup and styles (decision 2). Verify with unit tests for
  "Full-photo hero", "Practice areas as an accordion", "Team as a list", "Whole screenshots", the
  hero falling back to `beside` without an image, `html-validate` on a page with every variant,
  and snapshots unchanged apart from the stylesheet.

## 3. Editor

- [ ] 3.1 `setBlockLook`, the block panel's "Look" choices and hint, and the canvas classes
  (decision 3). Verify with unit tests (one undo step each; new and duplicated blocks keep their
  values) and e2e "Make the hero a full photo", "Practice areas as an accordion" and "Full photo
  without a photo".

## 4. Examples and checks

- [ ] 4.1 Rebuild the examples with the variants and reload them (local only, decision 4).
  Verify: `check.ts` reports no errors, and screenshots show each variant reading well, the
  full-photo heroes included.
- [ ] 4.2 Update `docs/layouts.md` (the variants no longer gaps) and `docs/roadmap.md`
  (`block-variants` done). Run the type check, unit tests, lint and the full Playwright suite;
  verify that all pass.
