# Design

## Context

See proposal.md for the motivation. The code as it stands:

- **Select-all.** `commands.ts` maps `meta+a,ctrl+a` to Svedit's `SelectAllCommand`. On a text selection it first selects all of the text; if all of it is already selected, it moves up to a node selection of the containing node. On a node selection it grows to the whole list, then to the parent node. Escape (`SafeSelectParentCommand`) already selects the parent and refuses the fixed lists.
- **Messages.** `domain.ts` builds site-rule messages. Pages are named through `pageLabel`. Three messages still interpolate node IDs:
  - `empty-link-label`: `Link ${link.id} needs a label.`
  - `missing-alt`: `Describe image ${image.id} …`
  - `decorative-with-alt`: `Image ${image.id} is marked decorative …`

  `invalid-slug`, `duplicate-slug` and `heading-skip` use the words "slug" and "level 3 subheading". `checkImage` and the link checks run over all nodes of a type, with no page context.
- **Locating problems.** `locateNode` walks `node` and `node_array` properties from the root, so marks (`internal_link`, `link`), which are referenced from text ranges, are never found. `ProblemsPanel.canShow` therefore returns false for them.

## Goals / Non-Goals

**Goals:**
- Nothing an owner can trigger by editing content shows a node ID.
- Every problem an owner can fix on the canvas is clickable.

**Non-Goals:**
- Rewriting the structural (`generic.ts`) and theme messages.

## Decisions

### 1. `SelectFieldTextCommand` replaces Svedit's select-all

In `commands.ts`, `meta+a,ctrl+a` maps to a command that does the following:
- On a `text` selection, it sets `{ type: "text", path, anchor_offset: 0, focus_offset: length }` on the same path, and nothing more.
- On any other selection (node, property), it does nothing, but still reports itself as enabled, so the key is consumed and the browser doesn't select the whole page.

Length is counted in grapheme clusters, as Svedit does (`get_char_length`), so a text with emoji selects fully. Escape is unchanged.

**Alternative:** subclass Svedit's command and stop at the first step. Its escalation logic is inside one `execute`, so a small command of our own is simpler and doesn't depend on Svedit internals.

### 2. A page lookup for messages

`checkSiteRules` builds `pageOf: Map<nodeId, page>` once, by walking each page's subtree through `node` and `node_array` properties, plus the mark ranges of text properties. `checkImage` and the link checks take the page from it. Nodes outside any page (menu items) get "in the menu" instead of a page. Wording:

| Code | New message |
|---|---|
| `missing-alt` | `An image on "Galerie" needs a description (alt text), or mark it as decorative.` |
| `decorative-with-alt` | `An image on "Galerie" is marked decorative, so it can't have a description.` |
| `empty-link-label` | `A button on "Úvod" needs a label.` (call to action); `A menu item needs a label.` (menu) |
| `missing-page` (text link) | `A link on "Úvod" points to a page that no longer exists.` |
| `invalid-slug` | `"Ceník" needs an address.` / `The address "Kontakt Us" may only contain lowercase letters, digits and dashes; try "kontakt-us".` |
| `duplicate-slug` | `"Kontakt" and "Contact us" have the same address "kontakt".` |
| `heading-skip` | `On "Kontakt", a smaller subheading comes before any main subheading; make the first one a main subheading.` |
| `invalid-media-key` | `An image on "Galerie" has an invalid file name; choose it again from the media library.` |
| `unsafe-link` | `"javascript:…" isn't an allowed address; use https://, http://, mailto:, tel: or a path starting with /.` |

The `nodeId` and `property` of each problem stay as they are, because the panel navigates by them. Tests that assert the old wording are updated. A new test runs the "owners' words" scenario over every site-rule message the fixtures can produce: no node IDs, no "slug", and no property names such as `alt` or `label` in backticks or bare.

### 3. Locating marks

`locateMark(doc, markId)` in `locate.ts` walks the same tree as `locateNode`. For each `text` property it checks the `marks` ranges, and returns `{ path: [...textPath], start, end, pageId }` for the range whose `node_id` is the mark. `ProblemsPanel`:
- treats a problem as showable when `locateNode` or `locateMark` finds it;
- for a mark, navigates to the page, then sets `{ type: "text", path, anchor_offset: start, focus_offset: end }` and focuses the canvas, as it already does for nodes.

## Risks / Trade-offs

- **[Trade-off] Cmd+A no longer selects a whole block.** Owners who liked "Cmd+A, Cmd+A, Backspace" to empty a section use Escape then Delete instead.
- **[Risk] New messages drift back to IDs as rules are added.** → The "owners' words" test fails on any ID or property name in a site-rule message produced from the fixtures.
