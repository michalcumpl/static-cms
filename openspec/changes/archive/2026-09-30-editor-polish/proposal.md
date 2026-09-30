# Proposal

## Why

Three small annoyances came up in the editor walk-throughs and in our own tests:
- **Cmd/Ctrl+A can select a whole section.** Pressed repeatedly, it grows from the field's text to the paragraph, then all paragraphs, then the section itself. One Backspace then deletes a whole block. Undo recovers it, but owners reach for Cmd+A out of habit and expect it to select only the text they're in.
- **Some problem messages show internal IDs.** For example "Describe image n3f9a… in its alt text" or "Link cta_order needs a label". Owners can't tell which image or button is meant.
- **A problem about a link inside text can't be clicked.** "This link points to a page that no longer exists" has no way to lead the owner to the link.

## What Changes

- **Cmd/Ctrl+A selects only the current field's text.** Pressing it again selects nothing more. Escape remains the way to select a whole paragraph, item or section. On a selected image or block, Cmd+A does nothing.
- **Readable messages everywhere owners look.**
  - Every problem in the `site` category names things in the owner's terms and never contains a node ID or an internal field name.
  - Problems about images and links say which page they are on, for example: "An image on "Galerie" needs a description (alt text), or mark it as decorative." and "A button on "Úvod" needs a label."
  - "Slug" becomes "address", and the heading-order message is rephrased in plain words.
- **Clickable text-link problems.** Clicking a problem about a link inside text switches to the page that contains it and selects exactly the linked words, so the owner can re-link or unlink them.

### Non-goals (this change)

- Theme messages (colours, fonts, contrast) and structural messages. Owners can't edit the theme yet, and structural problems are refused on save, so owners don't see them.
- Translating the editor or its messages into Czech.
- Any other change to selection behaviour (Escape, arrow keys, clicking).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: the Validation result requirement. Site-rule messages contain no node IDs or internal field names, and say which page an image or link is on.
- `site-editing`: text editing gets the Cmd/Ctrl+A rule, and the problems panel handles problems about links inside text.

## Impact

- `packages/site`: validation messages in `domain.ts` (a page lookup for images and links), and the tests that assert messages.
- `apps/admin`:
  - `commands.ts` (a field-only select-all command);
  - `locate.ts` (finding a mark's text and range);
  - `ProblemsPanel.svelte` (selecting that range);
  - unit and Playwright tests.
- No schema, storage, rendering or export changes.
