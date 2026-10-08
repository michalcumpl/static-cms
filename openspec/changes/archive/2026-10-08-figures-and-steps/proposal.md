# Proposal

## Why

Four of the five example sites state their case in numbers ("over 10 years", "40+ countries",
"300M CZK managed"), and two explain their process in numbered steps ("1. Assessment, 2.
Application, 3. Approval"). Today both are written as bold bullet lists or subheadings in a text
block, which reads weakly and gives templates nothing to style (`docs/layouts.md`, "What the
examples lack", items 1 and 3). The templates need them as blocks before they are designed
(`docs/roadmap.md`, row 6b).

## What Changes

- **Key figures block** (`figures`): an optional heading and a list of one to six figures, each a
  short value ("10+ let", "+28,9 %", "300 mil. Kč") and a label ("zkušeností na trhu"). Rendered
  as a row of large values with their labels; on phones, two per row.
- **Steps block** (`steps`): a heading and an ordered list of steps, each a title and an optional
  text with bold, italic and links. Rendered as a numbered list; the numbers come from the
  order, not from the text.
- **In the editor:** both blocks in the block picker with a drawing and a description; inserted
  with a placeholder heading and three empty items; items added, moved, duplicated and deleted
  like gallery photos; handles and the toolbar name them ("Figure 2 of 4", "Step 1 of 3").
- **Validation:** a figure needs its value and its label, a figures block holds at most six, and
  a value longer than 24 characters is a warning; a steps block needs its heading and each step
  its title; either block without items is a warning.
- **The site builder** writes both blocks, and the Mortgage Specialist and Fond 10X examples are
  rebuilt with them (locally) to check them on real content.

No document format change: two new block types, so existing documents stay valid as they are.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: the block list gains `figures` and `steps`, with their content rules.
- `site-rendering`: how the two blocks render.
- `site-editing`: inserting them, their items' structure and names.

## Impact

- **Model:** node types `figures`, `figure`, `steps`, `step` in `schema.ts` and `types.ts`; rules
  in `validate/domain.ts`; the builder.
- **Render:** `blocks.ts` and the stylesheet (snapshot update).
- **Admin:** canvas components, inserters, item insertion, the block picker's drawings and texts,
  handle and toolbar names, in Czech and English.
- **Tests:** model, render (`html-validate` included) and editor unit tests; e2e for inserting and
  publishing both blocks.
