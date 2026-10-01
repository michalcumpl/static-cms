# Proposal

## Why

The `languages` change lets a project add a language as a copy of the primary, and pages pair automatically through their translation key. Sites don't stay copies, though:
- an owner adds "Ceník" in Czech after English was created, and English has no counterpart;
- a page built separately in English ("Our story") belongs with an existing Czech one ("O nás"), but isn't paired;
- after a copy, nothing tells the owner which English pages still show Czech text.

This is the second half of Milestone 5, agreed while exploring it.

## What Changes

- **Linking pages across languages.** The page settings gain an **In other languages** part listing every other language of the project. For each one it shows:
  - the page's counterpart, with a link to open it in that language;
  - or "Not translated", with two actions:
    - **Copy here:** copies the page into that language;
    - **Link to an existing page:** picks a page of that language that has no counterpart in this one.

  A linked page can be **unlinked**. Linking and unlinking change only the language being edited: its page takes the other page's translation key, or gets a key of its own again. They are undoable editor actions, saved with the page.
- **Copying a page into another language.** The page is copied as it was last saved:
  - with its blocks, images and texts, under new node IDs;
  - with the same translation key, so it's paired at once;
  - with a slug made unique in the target language;
  - with a menu item at the end of the target language's menu;
  - links inside it to other pages of the site point to their counterparts in the target language, where those exist.

  The copy is saved as a new version of the target language's document, and the editor offers to open it.
- **Checking what still needs translating.** A page in a language other than the primary is **not translated yet** while its title, or its slug, is still the same as its primary counterpart's. The project page's Languages section lists, for each other language:
  - its pages not translated yet;
  - the primary's pages that have no counterpart in it;

  each with a link to open it in the editor. The editor's page list marks a page that isn't translated yet. These are hints, not validation problems; they never block publishing.

### Non-goals (this change)

- Comparing text content block by block, or machine translation (Milestone 6).
- Linking a page in a language other than the one being edited. Each language's own editor changes its own document, and copying is the only action that writes another language.
- Copying a whole set of pages at once.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `languages`:
  - linking and unlinking a page to its counterpart in another language;
  - copying a page into another language;
  - the "not translated yet" rule and the checklist on the project page.
- `site-editing`:
  - the page settings' "In other languages" part;
  - the "not translated yet" mark in the page list.

## Impact

- **`packages/site`:**
  - `copyPageInto(source, pageId, target, idFor)`: a page's subtree with new IDs, remapped internal links, a unique slug and a menu item;
  - `translationStatus(primary, other)`: which pages aren't translated yet, and which primary pages are missing;
  - tests.
- **`apps/admin`:**
  - `GET /api/projects/<p>/translations` lists every language's pages (ID, title, slug, key and status);
  - `POST /api/projects/<p>/languages/<lang>/pages` copies a page into a language;
  - editor operations for linking and unlinking;
  - the "In other languages" part of `PageSettings`;
  - the mark in the page list;
  - the checklist in `LanguagesSection`;
  - unit and e2e tests.
- **No document format change and no database migration.** Translation keys already exist.
- **Docs:** the roadmap (Milestone 5 done).
