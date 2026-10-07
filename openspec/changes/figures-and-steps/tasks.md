# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Model and rendering

- [ ] 1.1 The node types `figures`, `figure`, `steps`, `step` (decision 1) and the content rules
  with the new codes (decision 2). Verify with unit tests for "Valid figures and steps", "Figure
  without a label", "Seven figures", "Long value", "Steps without a heading", a step without a
  title, empty blocks, and the owners'-words test.
- [ ] 1.2 Render both blocks with their styles (decision 3). Verify with unit tests for the
  markup ("Steps markup", figures with and without a heading, no empty elements), `html-validate`
  on a page with both, and the updated stylesheet snapshot.
- [ ] 1.3 `blocks.figures` and `blocks.steps` in the builder (decision 5). Verify: the builder's
  every-block site includes both and has no validation errors.

## 2. Editor

- [ ] 2.1 Inserters, item insertion with the six-figure limit, Enter adding the next item, and the
  handle and toolbar names (decision 4). Verify with unit tests: "Insert key figures" (three empty
  figures, caret in the first value), a new steps block, "Add a step" after the second, no
  seventh figure, and the names "Figure 2 of 4" and "Step 1 of 3".
- [ ] 2.2 Canvas components, picker entries and drawings, texts in both languages (decision 4).
  Verify with the existing coverage tests (a component per node type, a drawing per block type)
  and e2e: insert key figures and steps on "Kontakt", fill them in, save, and the preview shows
  the values, labels and numbered steps.

## 3. Examples and checks

- [ ] 3.1 Rebuild the Mortgage Specialist and Fond 10X examples with the blocks and reload them
  (local only, decision 5). Verify: `check.ts` reports no errors, and screenshots show the
  figures and steps.
- [ ] 3.2 Update `docs/layouts.md` (key figures and steps no longer gaps) and `docs/roadmap.md`
  (`figures-and-steps` done). Run the type check, unit tests, lint and the full Playwright suite;
  verify that all pass.
