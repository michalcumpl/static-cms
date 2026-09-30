# Tasks

## 1. Select all within a field

- [x] 1.1 Replace Svedit's select-all with `SelectFieldTextCommand` for `meta+a,ctrl+a` (design.md decision 1); verify with unit tests (text selected fully, repeat keeps it, node and property selections unchanged, grapheme lengths) and Playwright for Select all, then delete and Escape still selects the block

## 2. Readable messages

- [x] 2.1 Build the page lookup and rewrite the messages in design.md decision 2's table; verify with the site-document scenarios Image without a description and Button without a label, the updated message assertions in the existing tests, and `pnpm --filter @static-cms/site test`
- [x] 2.2 Add the "owners' words" test over the site-rule problems the demo and image-blocks fixtures can produce (with deliberate breakages); verify it fails when a message contains a node ID, "slug" or an internal property name (`seo_description`, `page_id`, `href`, `src`, …), and passes on the new wording

## 3. Clickable text links

- [x] 3.1 Add `locateMark` and use it in the problems panel to switch pages and select the linked words; verify with unit tests for `locateMark` (range, page, text path) and Playwright for Go to a broken text link

## 4. Integration

- [x] 4.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally and in CI (a CI run after pushing); verify all pass
- [x] 4.2 Remove the two items from the Milestone 2 walk-through list in `docs/roadmap.md` and note the change; verify the links resolve once the change is archived
