# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Spike: editing collection items from a block

- [x] 1.1 Prove decision 4 first. On a throwaway branch, give the demo site a `services` node
  array on the site node and make `Services.svelte` render its items with `Node` at
  `[site, "services", i]`. Then, in the browser, check four things:
  - typing in a service's name and description;
  - moving the caret with the arrow keys from the block heading into the items and out to the
    next block;
  - Escape selecting the item, then the block;
  - undo.

  If any fails, stop and report to the owner with the fallback (an item panel in the settings
  column, design decision 4) before writing anything else.

## 2. Schema, types and validation (`packages/site`)

- [x] 2.1 Extend the schema and types for decisions 1, 2 and 6:
  - collections on the site node (`services`, `team`, `testimonials`, `faqs`);
  - `faq_item`, `item_ref` and `social_link` nodes, and `business.social`;
  - `heading`, `show` and `chosen` on the `services`, `team` and `testimonials` blocks and the
    new `faq` block;
  - schema version 7.

  Verify with `schema.test.ts` (Svedit schema shape, `isNodeType`) and the type check.
- [x] 2.2 Add `blockItems(doc, block)` (decision 3) and `socialKind(url)` (decision 6). Verify
  with unit tests: all vs. chosen, chosen order, a missing ref skipped, and every host in
  "Social profiles" (with `www.` and `m.` prefixes).
- [x] 2.3 Validation: item contents per collection with "Service 3"-style messages; missing-item,
  wrong-collection and duplicate-item errors on refs; empty-block warnings for collection blocks;
  social profile errors and the duplicate warning. Remove the block-scoped item rules. Verify
  with tests for every scenario of "Collections", "Collection blocks", "Social profiles", "Image
  block contents" and "Call to action and testimonial contents" in the site-document delta.

## 3. Upgrade to version 7 (`packages/site`)

- [x] 3.1 Implement `toVersion7` in `migrate.ts` (decision 8): lift items in page and block
  order, merge exact duplicates, set `show` and `chosen`, add empty `faqs` and `social`, and
  bump the version. Update the `migrateSite` doc comment. Verify with `migrate.test.ts` cases
  "One services block", "Highlights and a full list" and "Same name, different text", and that
  the input isn't modified.
- [x] 3.2 Regenerate `fixtures/demo-site.json` at version 7 through the upgrade and review the
  diff (decision 9). Verify that the existing render snapshots pass **unchanged**.

## 4. Rendering (`packages/site`)

- [x] 4.1 Render the `services`, `team` and `testimonials` blocks from `blockItems`, render
  nothing when nothing is shown, and add the `faq` block as `<details>`/`<summary>` with styles
  in `render/css.ts`. Verify with `blocks.test.ts` for "One service on two pages", "Chosen
  order", "Question and answer" and "Nothing to show", and a new snapshot of a page with an FAQ
  block.
- [x] 4.2 Add social links to the footer (a `<nav>` labelled through `render/strings.ts`, in
  Czech and English) and `sameAs` and `hasOfferCatalog` to the home page's JSON-LD. Verify with
  "Two profiles", "Switch off" and "Services and profiles" in `header.test.ts`/`metadata.test.ts`
  (or neighbours), and `html-validate` passing on the snapshot pages.
- [x] 4.3 Update `packages/site/README.md` (document shape, collections, `blockItems`). Verify by
  reading the section against the code.

## 5. Languages (`packages/site`)

- [x] 5.1 Extend `applySharedFields` (decision 5): collection membership and order from the
  primary, each language's own texts kept, images from the primary with `alt` kept while `src`
  matches, missing items copied, dangling `item_ref`s removed, and social profiles shared.
  Verify with `languages.test.ts` for "New service in Czech", "Translated service keeps its
  translation" and "Service deleted in Czech", and that neither input is modified.

## 6. Project upgrade (`apps/admin`)

- [x] 6.1 Add `upgradeProjects(db)` (decision 8): find projects with a current document below
  version 7, upgrade each language, append the primary's missing items, switch `all` blocks to
  `chosen` where needed, and save new versions with `created_by = null`, one transaction per
  project. Call it from `getDb()` after the migrations. Verify with `site-documents.test.ts` or
  a new `upgrade-projects.test.ts` for "Czech and English project", "A service only in English"
  and "Already upgraded", plus a failure case leaving the data unchanged.
- [x] 6.2 Show a version with no author as "System" in the History tab and its version page.
  Verify with a unit test of the history load and the catalogue strings.

## 7. Editor: collection blocks (`apps/admin`)

- [x] 7.1 Update the editor's Svedit schema and node components: `Services`, `Team` and
  `Testimonials` render the shown items through their collection paths, and the new `Faq` and
  `FaqItem` components follow the same pattern. Add FAQ to the block picker, with a wireframe
  drawing and a description. Verify with `svedit-schema.test.ts`, `block-illustrations.test.ts`
  and an e2e test that adds an FAQ block ("New FAQ block").
- [x] 7.2 Add collection-aware transforms and handle menus (decision 4):
  - in `all` mode: insert, move, duplicate and delete on the collection; Delete says "Also
    shown on N other pages";
  - in `chosen` mode: move, "Remove from this block", and the add picker (existing items and
    "New item");
  - deleting an item removes its refs everywhere, in one undo step;
  - toolbar names such as "Question 2 of 5";
  - Escape from an item selects the block showing it (spike result in decision 4);
  - an item shown twice on one page is editable in the first block, a preview in later ones.

  Verify with `structure.test.ts`/`handles.svelte.test.ts` units and e2e tests "Edit a
  highlighted service", "Remove a highlight", "Add an existing service to the highlights",
  "Delete a shown service", "Same service twice on one page" and "Add a question".
- [x] 7.3 Add the "All … / Chosen …" switch to the block panel. Verify with the e2e test "Switch
  to chosen" and a unit test that the switch is one undo step and doesn't change the rendered
  items.
- [x] 7.4 Outside the primary language, make the collections' structure fixed and items' images
  read-only, with the reasons in the handle menu. Verify with the e2e tests "Translate a service
  in English" and "No new services in English".
- [x] 7.5 Update the existing e2e specs that add service items, people or testimonials
  (`image-blocks`, `content-blocks`, `walkthrough`, …) to the new behaviour. Verify that the
  full Playwright suite passes.

## 8. Settings: social profiles (`apps/admin`)

- [x] 8.1 Add the social profiles list to `BusinessSettings` (add, remove, move, the kind label,
  `https://` added on leaving the field), read-only outside the primary language. Verify with
  the e2e test "Add an Instagram profile" in `settings.spec.ts`, and "Phone in English" still
  passing with the profiles read-only.

## 9. Integration

- [x] 9.1 On a copy of a real database (or the seeded demo with a second language and an
  English-only service), run the admin, then export every project's ZIP before and after the
  upgrade and diff them. Verify that the pages are identical apart from the home page's new
  `hasOfferCatalog` in the JSON-LD (and footer social links where profiles exist, none yet). Record the result in the change.
- [x] 9.2 Update `docs/roadmap.md` (milestone A: collections done, locations next) and
  `docs/tasks.md`. Verify by reading.
