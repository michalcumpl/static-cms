# Proposal

## Why

Both new launch examples open their home page with photo tiles that lead to their main sections:
Scénografie's four project categories and three workshops, Punk Film's Commercials, Film & TV and
Other. Scénografie's About page also lists seven awards and eight capabilities, each a picture
with a title and a few lines. Today these are galleries, which can't link, or eight text with
image blocks in a row, which are far too heavy (`docs/layouts.md`, item 16). The Exhibitions and
Creative production templates need a block for this before they can be built
(`docs/roadmap.md`, row 6g).

## What Changes

- **A cards block:** an optional heading and up to twelve cards. Each card has an optional
  image, a title, an optional short text (bold, italic and links), and an optional link: to a
  page of the site, to a project or service that has its own page, or to an outside address.
  A card with a link opens it from anywhere on the card.
- **Two looks:** "Text under the photo" (the image, then the title and the text; for awards
  and capabilities) and "Title over the photo" (the title over the image, the text under it;
  for section tiles). Columns follow the number of cards, as key figures do.
- **Validation:** a card needs a title; a link to a page, project or service that no longer
  exists, or to a project or service without its own page, is reported (the card then renders
  without the link); unsafe addresses are refused as elsewhere.
- **In the editor:** the block picker offers Cards (three empty cards). Cards are added, moved,
  duplicated and deleted like the items of other blocks; images use the usual image slots, and
  the block panel offers the look. While the caret is in a card, a Card panel sets its link.
- **The builder** writes cards, and the local examples use them: Scénografie's category and
  workshop tiles, awards and capabilities, Punk Film's three sections.

No document format change: only new node types, so existing documents are unaffected.

Not in this change: cards drawn from a collection (the projects block does that for projects),
icons instead of photos, and a carousel of cards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: the cards block and its cards, its look and its link targets.
- `site-rendering`: how cards render in each look, and their links.
- `site-editing`: inserting cards, their items, their look and the Card panel; the block list
  in "Block structure" (which also gains the projects block it was missing).

## Impact

- **Model:** schema and types (`cards`, `card`), validation, the builder.
- **Render:** the cards block, its styles and column rule, image sizes, html-validate.
- **Admin:** canvas components (`Cards`, `Card`), the inserter and picker drawing, item handles
  and insertion, the Card panel (link), the look in the block panel, texts in both languages.
- **Tests:** model, render (snapshots, `html-validate`), editor unit tests and e2e.
- **Local examples** (not committed): Scénografie and Punk Film rebuilt.
