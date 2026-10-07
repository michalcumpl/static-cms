# Design

## Context

See proposal.md for the motivation. The current state, from the last block change
(`cta-and-testimonials`) and the code:

- **A block type** is a node type in `packages/model/src/schema/schema.ts` and `types.ts` (a test
  keeps them in step), content rules in `validate/domain.ts` (`checkContentBlock`), a renderer
  in `packages/render/src/blocks.ts`, styles in `css.ts` (snapshot-tested, no comments allowed),
  and in the admin a canvas component (`editor/nodes/`), an entry in `nodeComponents`
  (`config.ts`), an inserter in `transforms.ts` (`blockInserters`), a picker entry and drawing
  (`handles.ts` `BLOCK_TYPES`, `block-illustrations.ts`), and names and descriptions in `en.ts`
  and `cs.ts`. Tests require a canvas component for every node type and a drawing for every
  block type.
- **Items inside a block** (not a collection): gallery photos and partner logos. They come from
  the media library, so `itemInsertionPoint` (`structure.ts`) only handles bulleted lists today.
  Handles and toolbar names come from `ITEM_TYPES` and `ITEM_LISTS` in `handles.ts`.
- **Enter at the end of an item's text** inserts the list's `default_node_type` through the
  session's `inserters` (`config.ts`).
- **Headings:** block headings render as `<h2>`. The heading rule (`heading-skip`) only looks at
  subheadings in text blocks.
- **The builder** (`packages/model/src/builder.ts`) writes every block type and is tested to
  produce a valid site with all of them.

## Goals / Non-Goals

**Goals:**
- Two blocks that use the existing block and item mechanisms, with no new editor machinery.
- Markup that templates can style freely (separate elements for value and label, an `<ol>` for
  steps).

**Non-Goals:**
- Animated counters, icons per figure or step, or images in steps.
- Figures as business data shared across pages (they are page content, like a gallery).
- Structured data for either block.

## Decisions

### 1. Node types

```
figures   heading: text (single line)
          items: node_array<figure> (default figure)                    0..6
figure    value: text (single line)    label: text (single line)
steps     heading: text (single line)
          items: node_array<step> (default step)
step      title: text (single line)
          text:  text (bold, italic, links; line breaks allowed)
```

- **Items live in the block,** like gallery photos: figures and steps belong to one page and
  differ between languages ("300 mil. Kč" against "CZK 300M"), so they are not collections.
- **Step numbers aren't stored:** the `<ol>` numbers them, so moving a step can't leave a wrong
  number behind.
- **Document format:** new types only, so the schema version stays 8 and nothing is migrated, as
  with earlier block additions.

### 2. Validation

In `checkContentBlock`, messages naming the page and the position:

| Rule | Code | Severity |
| --- | --- | --- |
| figure without a value | `empty-value` | error |
| figure without a label | `empty-label` | error |
| value longer than 24 characters (graphemes) | `long-figure` | warning |
| more than six figures | `too-many-items` | error |
| steps block without a heading | `empty-heading` | error |
| step without a title | `empty-title` | error |
| either block without items | `empty-block` | warning |

The owners'-words test covers the new messages. A steps block's heading is required because its
step titles are `<h3>` under it; with it, the page's heading outline stays correct without
extending the heading rule.

### 3. Rendering and styles

```html
<section class="block figures">
  <h2>…</h2>                                     <!-- only with a heading -->
  <ul class="figure-list">
    <li class="figure"><p class="figure-value">300 mil. Kč</p><p class="figure-label">…</p></li>
  </ul>
</section>

<section class="block steps">
  <h2>…</h2>
  <ol class="step-list">
    <li class="step"><h3 class="step-title">…</h3><p class="step-text">…</p></li>
  </ol>
</section>
```

- **Figures:** a grid of `repeat(auto-fit, minmax(10rem, 1fr))`, at most two columns below 40rem;
  values at about twice the body size in the primary colour, bold; labels in the text colour.
- **Steps:** a CSS counter draws each number in a circle in the primary colour beside the step;
  the `<ol>`'s own markers are hidden so the number isn't read twice.
- `html-validate` on a page with both blocks, and the stylesheet snapshot updated.

### 4. Editor

- **Canvas components:** `Figures.svelte` / `Figure.svelte` (value and label as text properties,
  placeholders "Číslo" and "Popis"), `Steps.svelte` / `Step.svelte` (title and text, placeholders
  "Krok" and "Popis kroku"). The canvas numbers steps like the published page.
- **Inserters:** `insertFigures` (empty heading, three empty figures, caret in the first value),
  `insertSteps` (heading "Jak to funguje", three empty steps, caret in the heading); `insertFigure`
  and `insertStep` for Enter and "Add item".
- **Item insertion:** `itemInsertionPoint` learns the `items` of `figures` and `steps` besides
  bulleted lists. A figures block with six figures doesn't offer "Add item".
- **Handles and names:** `ITEM_TYPES` gains `figure` and `step`, `ITEM_LISTS.items` gains
  `figures` and `steps`; the names are "Figure 2 of 4" / "Číslo 2 ze 4" and "Step 1 of 3" /
  "Krok 1 ze 3"; blocks are "Key figures block" / "Blok s čísly" and "Steps block" / "Blok s
  kroky".
- **Block picker:** `BLOCK_TYPES` gains both after the call to action, with drawings (three
  large numbers with lines under them; three numbered circles with lines) and one-line
  descriptions.
- **Duplicating, deleting, undo** work through the existing block and item operations.

### 5. Builder and examples

`blocks.figures({ heading?, items: { value, label }[] })` and
`blocks.steps({ heading, items: { title, text? }[] })`, in the builder's everything-site test.
The local Mortgage Specialist and Fond 10X `build.ts` files replace their bold lists and step
subheadings with the blocks, and are reloaded (`remove.ts`, `load-site`) to check them on real
content; nothing of that is committed.

## Risks / Trade-offs

- **[Long values break the row]** → the 24-character warning, and values wrap within their cell.
- **[Six as a limit]** comes from the examples (at most six figures); a template wanting more can
  raise it later without a migration.
- **[Spec catch-up]** The "Block structure" requirement didn't list the questions block, which
  the editor already offers; the delta adds it with the two new ones.

## Migration Plan

None: two new block types, no format change.
