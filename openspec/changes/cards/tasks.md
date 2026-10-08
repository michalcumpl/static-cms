# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Model

- [ ] 1.1 The `cards` and `card` node types and their validation (decisions 1 and 2), with the
  `broken-card-link` warning code. Verify with unit tests for every site-document scenario of the
  delta ("Category tiles", "Card without a title", "Link to a project without a page", "Unsafe
  address", "Thirteen cards", "Cards block").
- [ ] 1.2 The builder's `blocks.cards` (decision 5). Verify: its every-block site has a cards
  block linking to a page and to a project, and validates.

## 2. Rendering

- [ ] 2.1 The cards block in both looks, whole-card links, columns by count, styles and image
  sizes (decision 3). Verify with unit tests "Category tiles", "Awards under photos", "Link that
  leads nowhere", heading levels with and without a block heading, `html-validate` on a page
  with both looks, and snapshots unchanged apart from the stylesheet.

## 3. Editor

- [ ] 3.1 The canvas components, item handles and insertion with the 1–12 limits, the inserter
  and picker drawing, and the look (decision 4). Verify with unit tests (insert, add, move,
  duplicate, delete each one undo step; limits) and e2e "Insert cards" and "Last card can't be
  deleted".
- [ ] 3.2 The Card panel and `setCardLink` (decision 4). Verify with unit tests (each target kind
  one step, invalid address refused) and e2e "Category tile" and "Link to a project".

## 4. Examples and checks

- [ ] 4.1 Rebuild Scénografie and Punk Film with cards and reload them (local only, decision 5).
  Verify: `check.ts` reports no errors, and screenshots of both home pages and Scénografie's
  About page read well.
- [ ] 4.2 Update `docs/layouts.md` (item 16 done), `docs/roadmap.md` (`cards` done) and
  `docs/tasks.md`. Run the type check, unit tests, lint and the full Playwright suite; verify that
  all pass. Record any deviations in design.md under "Changes made while building".
