# Proposal

## Why

The control panel (`control-panel`) gave the business its sections, but two of them are only
dashboard cards: **What you offer** and **About you** show counts and open the block editor,
because services, questions, people and testimonials can only be edited on the canvas, inside a
block of some page. An owner who wants to fix a price has to know which page shows it. The
strategy's principle 1 says owners maintain the facts of their business, not pages
(`docs/strategy.md`), and the collections already hold those facts once per site
(`business-collections`). This change gives them forms of their own.

## What Changes

- **Two new sections in the panel**, between Business and Website in the section bar:
  - **What you offer** (`/p/<project>/offer`): the services (name, description, price) and the
    questions (question, answer);
  - **About you** (`/p/<project>/about`): the people (portrait, name, role, short text) and the
    testimonials (photo, quote, name, detail).
- **The forms are Svedit**, through the editor's own session and operations (control-panel
  decision "a"):
  - texts keep bold, italic and links, with a small formatting toolbar;
  - each item can be added, moved up and down, duplicated and deleted, with the editor's
    collection operations, so blocks showing chosen items follow as they do in the editor;
  - deleting an item that pages show says on how many pages, and takes it off them;
  - portraits and photos are chosen from the media library, with their descriptions;
  - Save, Undo, Redo, the unsaved-changes question and the conflict refusal work as in the
    Business section.
- **Where each list appears:** every list says which pages show it, each a link to the editor
  on that page. Choosing which items a block shows stays in the editor.
- **Other languages:** texts can be translated; adding, deleting, moving and images are
  disabled with "Services are added and removed in <primary language>", as on the canvas.
- **The dashboard's cards** for What you offer and About you open their sections instead of the
  editor, and the problems about items lead to the item's field in its section.
- **Problem messages** about items say where they are fixed: "edit it in What you offer" or
  "in About you", instead of "in a services block on any page".

Not in this change: a photos page and image cropping (their own change), live previews of the
site next to the forms, and design in the panel.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-page`: the panel gains the What you offer and About you sections and their list
  forms; the section bar, the dashboard's cards and problem links, and saving cover them.
- `site-document`: messages about collection items name the panel section where they are fixed.

## Impact

- **Admin routes:** `(panel)/offer/` and `(panel)/about/`, two section bar entries, and the
  paths `offer` and `about` in `project-paths.ts`.
- **Editor code reused in the panel:** `SectionScreen.svelte` learns two more sections and
  mounts Svedit for them, with form versions of the item node components and a node-component
  map of its own; `collections.ts` operations are called for a whole collection.
- **Dashboard:** the two cards' links and `problemHref` for item problems.
- **Model:** the wording of the item messages in `validate/domain.ts`; no document format change.
- **Tests:** unit tests for the collection-level operations and problem links, and e2e specs for
  the two sections.
- **Docs:** `apps/admin/README.md` (routes) and `docs/roadmap.md` (milestone B).
