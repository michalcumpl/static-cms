# Tasks

## 1. Document and rendering in `packages/site`

- [x] 1.1 Add the `call_to_action`, `testimonials` and `testimonial` node types to the schema and types (design.md decision 1), and the content rules (decision 5) with the new `empty-quote` code. Verify with unit tests for "Call to action and testimonials", "Call to action without a heading", "Three buttons", "Call to action without buttons", "Testimonial without a quote", "Button to a removed page", and an empty testimonials block, and extend the owners'-words test.
- [x] 1.2 Render both blocks with CSS and the testimonial photo size (decision 2). Verify with unit tests for "Call to action with two buttons", "Testimonial" (and one with a photo: `sizes="4rem"`, lazy), that testimonial photos are in `usedMediaFiles`, `html-validate` on a page with both blocks, and unchanged snapshots.

## 2. Editor

- [x] 2.1 Add the inserters, "Add item" for testimonials, the fixed `actions` list, and testimonial photos as optional decorative images (decision 3). Verify with unit tests: "Insert a call to action" (one button to home, labelled "Tlačítko"), a new testimonials block with one empty testimonial, adding a testimonial after the current one, and choosing and removing a photo.
- [x] 2.2 Add the button operations in `lib/editor/buttons.ts`. Verify with unit tests for "Point a button at a page", "Call button", "Unsafe address refused", "Give the hero a button", "Second button" (and no third), removing a hero's button, never removing a call to action's last button, and one undo step each.
- [x] 2.3 Add the canvas components, `ButtonPanel.svelte` and the two Add block buttons. Verify with e2e tests:
  - insert a call to action, point its button at "Kontakt", add a second button to `tel:+420321123456`, save, and the preview has both links;
  - give the hero a button;
  - insert testimonials, fill in two with a photo on one, save, and the preview shows both figures.

## 3. Docs and checks

- [x] 3.1 Update the roadmap (Milestone 3: call to action and testimonials done, with the button panel; review markup deliberately left out). Verify by reading it.
- [x] 3.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [x] 3.3 Manual check by the owner: add a call to action with a call button and a testimonials block to a real site, publish, and check them on a phone (the call button dials, and the layout wraps). Record the outcome in design.md.
