# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **Schema.** The document is a Svedit document: properties are `string`, `integer`,
  `boolean`, `text`, a `node` reference or a `node_array`. There are no free-form arrays or
  string lists, so references between nodes are either a `node_array` (ownership) or a string
  property holding an ID (`page_link.page_id`, `internal_link.page_id`). Validation requires
  every node to be reachable from the root, and owned by one parent.
- **Items today** (`service_item`, `person`, `testimonial`) sit in the `items` or `people` lists
  of their blocks (`packages/site/src/schema/schema.ts`).
- **The canvas** renders blocks with Svelte components (`apps/admin/src/lib/editor/nodes/`).
  They draw item lists with `NodeArrayProperty` at a path into the block
  (`[...path, "items"]`). The editor is one Svedit session rooted at the site node
  (site-editing, "One Svedit editor rooted at the site node"). Paths into the site's own
  properties already work: `Site.svelte` draws the header and footer from it.
- **Languages.** One document per language; a new language is a copy with the same node IDs.
  `applySharedFields(primary, other)` in `packages/site/src/languages.ts` overlays shared fields
  on read (`readSite` in `apps/admin/src/lib/server/site-documents.ts`).
- **Upgrades.** `migrateSite` chains per-document upgrades on read; nothing is rewritten until
  the next save. Versions have a nullable `created_by`.
- **Startup.** The database opens lazily in `getDb()` (`lib/server/app.ts`), which applies the
  Drizzle migrations; that is the first thing any request does.

## Goals / Non-Goals

**Goals:**
- One node per fact: an item exists once per document; blocks only point at it.
- Upgraded sites publish the same pages (snapshot tests prove it), except for the additions
  this change makes on purpose: the home page's `hasOfferCatalog` when the site has services,
  and footer social links once profiles exist.
- Owners keep the canvas workflow: edit an item where they see it.

**Non-Goals:**
- A form-based editor for collections (milestone B).
- Item-level sharing beyond the language rules below (no per-field "translated" flags).

## Decisions

### 1. Collections are node arrays on the site node

The site gets `services`, `team`, `testimonials` and `faqs`, each a `node_array` of the existing
item types (`service_item`, `person`, `testimonial`) plus a new `faq_item` (`question`: text
without newlines; `answer`: text with `INLINE_MARKS` and newlines). The site node owns the items,
so reachability and the one-parent rule hold unchanged.

*Alternative:* a separate `collections` node holding the four lists. That's one more hop for
every path and buys nothing, since the site node already groups site-wide data (theme, business,
nav).

### 2. Blocks reference items through `item_ref` nodes

Each collection block has `heading`, `show` (`"all" | "chosen"`, default `"all"`) and `chosen`, a
`node_array` of `item_ref` nodes (`item_id: string`). The ref nodes are owned by the block; the
item ID is a plain string, like `page_link.page_id`. Validation checks that the ID names an item
of the right collection and isn't repeated. The `faq` block is new with the same shape.

*Alternatives:*
- **Listing item IDs directly in the block's `node_array`:** that gives an item two parents and
  breaks reachability. Svedit would also treat deleting it from the block as deleting the node.
- **A `featured` flag on items, with blocks showing "all" or "featured":** simpler, but one
  highlight set per site can't carry existing sites over unchanged (two blocks with different
  subsets) and can't order highlights per block.

### 3. One function decides what a block shows

`blockItems(doc, block)` in `packages/site` returns the item nodes a block shows: the
collection for `all`, the resolved refs for `chosen`. Missing refs are skipped, which matters in
other languages; validation reports them only where they're stored. The renderer, the validator's
empty-block warning, the editor and the structured data all use it, so they can't disagree.

### 4. Editing items in place through paths into the collection

On the canvas, a collection block renders each shown item with Svedit's `Node` at the item's
path in the site's collection (`[site, "services", index]`). The item's existing component is
reused, so text editing, marks and image slots behave as today. The block's handles and the "+"
between items call new transforms instead of Svedit's array operations on the block:
- **`all` mode:** insert, move, duplicate and delete operate on the collection's array.
- **`chosen` mode:** move and remove operate on the block's `chosen` refs. Adding uses a picker
  of unchosen items plus "New item", which inserts into the collection and appends a ref.
- **Deleting an item** removes the node from the collection and every `item_ref` pointing at it,
  across all pages of the document, in one Svedit transaction (one undo step).

**Spike result (task 1.1, 2026-10-05): the approach works.** An end-to-end test on the demo
home page compared the unchanged editor with two variants: the whole collection mounted with
`NodeArrayProperty` at `[site, "services"]` (the `all` mode), and items mounted one by one with
`Node` at `[site, "services", i]` (the `chosen` mode). Results:
- **Typing, marks and undo:** identical to the unchanged editor in both variants.
- **Arrow keys:** in the `all` variant, identical to today, gap carets included. In the `chosen`
  variant the caret moves from field to field with no gap carets between items. That's fine,
  because adding there goes through the handle menu and picker.
- **Escape:** the first Escape selects the item. Svedit's select-parent only works for paths
  longer than three segments and goes up the document path, so the second Escape stopped at the
  item. `SafeSelectParentCommand` therefore handles a node selection in a site collection:
  `is_enabled` is true, and it selects the block that renders the item. It finds the block from
  the DOM, as the closest node element above the item, and reads its `data-path`.
- **No console errors.**

**Svedit's "one path = one DOM mount" rule.** One item path can be mounted once per canvas. The
editor shows one page at a time, so this only matters when two blocks on the same page show the
same item. The first block (in page order) mounts it editable. Later blocks render it read-only
with the same markup as the published site, outside Svedit, and selecting it moves the caret to
the editable copy.

### 5. Language sharing: structure and images from the primary, texts per language

`applySharedFields` gains a collections step. For each collection:
- the item ID list becomes the primary's;
- an item the other document has keeps its texts, and takes the primary's image node (keeping
  its own `alt` while `src` is the same, as for share images);
- an item it lacks is copied from the primary;
- items only in the other document are dropped, together with their nodes;
- `item_ref`s in the other document's blocks that point at dropped items are removed, so
  validation stays clean.

Social profiles join `SHARED_BUSINESS_FIELDS` handling (the primary's `social_link` nodes, like
the opening days). In the editor, `isFixedListProperty` treats the collections as fixed outside
the primary language, and image slots of items are read-only there.

*Alternative:* collections per language, like pages. That's simpler, but the price of "Chléb"
would then be retyped per language, which is exactly the drift this change removes.

### 6. Social profiles as `social_link` nodes

`business.social`: a `node_array` of `social_link` nodes (`url: string`). The kind comes from a
pure `socialKind(url)` in `packages/site`, used by validation, rendering (link text) and the
Settings field label, so it's never stored. Footer links are text, labelled per kind; the `<nav>`
label comes from `render/strings.ts`.

### 7. Structured data reads the collection, not the blocks

`hasOfferCatalog` lists the services collection in order, whether or not a page shows them:
they are the business's offer. Description is plain text (marks dropped); prices are omitted
because they're free text.

### 8. The version-7 upgrade, per document and per project

- **`toVersion7` (per document, in `migrate.ts`):** walk pages in `site.pages` order and their
  blocks in order. Move each block's item nodes into the collection, merging an item into an
  earlier one when a canonical JSON of its texts, marks and image `src`/`alt` matches (the
  duplicate's nodes are dropped). Then set `show` and `chosen` per block (`all` when the block's
  item IDs equal the collection's). Add empty `faqs` and `business.social`. Rename `team.people`
  to the shared shape, so all collection blocks carry `heading`, `show` and `chosen`.
- **`upgradeProjects` (project-level, in the admin):** called from `getDb()` right after the
  Drizzle migrations. It selects projects with any current document below version 7, and for
  each, in one SQLite transaction:
  1. run `toVersion7` on every language;
  2. append items missing from the primary, and switch `all` blocks to `chosen` in documents
     that lacked an appended item;
  3. insert new versions with `created_by = null`.

  The history shows a null author as "System" (new i18n string). An exception propagates out of
  `getDb()`, so every request fails until it's fixed, and the stored data stays untouched.

*Alternative:* only the per-document upgrade on read. That drops items that exist only in a
non-primary language as soon as shared fields apply, which is silent data loss.

### 9. Fixture and snapshots

The demo fixture is regenerated at version 7 by running the upgrade, then reviewed. The existing
rendering snapshots must pass unchanged against the upgraded fixture, which is the HTML-identity
check. New snapshots cover the FAQ block, social links and the extended JSON-LD.

## Risks / Trade-offs

- **[Svedit can't edit nodes outside the page tree smoothly]** → spike first; documented
  fallback (item panel).
- **[Deleting from an "all" block surprises owners when the item is also highlighted
  elsewhere]** → the Delete entry says how many other pages show it, and undo restores it
  everywhere.
- **[The merge heuristic joins two items the owner meant as different]** → it merges only exact
  duplicates (texts, marks and image); same-name items with any difference stay separate.
- **[Upgrade at startup blocks the admin if one project fails]** → the transaction per project
  leaves data untouched. Tests cover the fixture and a two-language project. The upgrade is
  rehearsed on a copy of the production database before deploying.
- **[Membership shared across languages means an English-only service can't exist]** → this is
  intended (facts are shared); the project upgrade keeps existing ones by moving them to the
  primary.
- **[Old versions restored from history]** → restoring a version-6 version runs the per-document
  upgrade. Items that exist only in a restored non-primary version are dropped by shared fields.
  This is accepted and documented as a known limit.

## Migration Plan

1. Ship the `packages/site` changes (schema 7, `toVersion7`, shared fields, rendering) with the
   admin changes in one release, since the admin reads and writes version 7.
2. Before deploying, run the startup upgrade against a copy of the production database and
   compare published HTML per project (export both, diff).
3. Deploy. Backups (Litestream) are the rollback: restoring the pre-deploy database and the
   previous release returns to version 6. A release can't be rolled back on its own after the
   upgrade, because the old code refuses version 7.

## Open Questions

- The exact wording of "Remove from this block" and of the item pickers in Czech: settle with
  the i18n catalogue review.
