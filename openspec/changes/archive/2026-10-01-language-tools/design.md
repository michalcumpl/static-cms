# Design

## Context

See proposal.md. After `languages`, the situation is:
- **Pairing:** pages pair across languages by `translation_key` (format 5). A copied language keeps the IDs and keys. New and duplicated pages get their own key.
- **Editor:** each language is its own session, loaded with `?lang=`. `EditorState` knows `lang`, `primaryLang` and `languages`.
- **Server:**
  - `site-documents.ts` has `readSite(db, p, lang)` with shared fields applied, `saveSite(…, lang)`, `projectLanguages` and `readLanguages`;
  - the languages API is under `/api/projects/<p>/languages[/<lang>]`.
- **Duplicating a page** in the editor uses Svedit's `tr.build`, which copies a subtree under fresh IDs. The server has no Svedit session, so copying into another language needs its own subtree copy.
- **The project page's** `LanguagesSection` lists languages, and `PageSettings` edits one page.

## Goals / Non-Goals

**Goals:**
- Every action writes only one document. Linking writes the edited language's document, through the editor and its undo. Copying writes the target's document, on the server, as one saved version.
- The translation state is computed, never stored: from titles, slugs and keys.

**Non-Goals:**
- Live updates when another language changes while the editor is open. The "In other languages" part reloads after a copy, and otherwise reflects what was loaded.

## Decisions

### 1. Translations summary

`translationSummary(doc)` in `packages/site/src/translations.ts` returns `{ key, pageId, title, slug, home }[]` for a document's pages.

`translationStatus(primary, other)` returns:
- `untranslated`: pages of `other` whose title equals the primary counterpart's, or whose slug does, except for the home page;
- `missing`: the primary's pages whose key isn't in `other`.

Both are pure and work on upgraded documents.

`GET /api/projects/<p>/translations` returns, for every language:
- `{ lang, name, primary, pages: summary[] }`;
- and, for the other languages, `untranslated` and `missing`.

Each language is computed from its saved document. Shared fields don't matter here, so the documents are read without applying them.

The editor loads this endpoint with the site, in `edit/+layout.ts`, and keeps it as `editor.translations`. The project page loads the same data on the server, for the checklist.

### 2. Linking and unlinking in the editor

- `linkPage(session, pageId, key)` sets the page's `translation_key` to the chosen counterpart's key.
- `unlinkPage(session, pageId)` sets it back to the page's own ID.

Each is one transaction.

**The choices** offered for "Link to an existing page" in a language L are L's pages whose key has no page in the language being edited. They come from `editor.translations`, minus keys used in the current (possibly unsaved) document. Validation already reports two pages with the same key, as a safety net.

**The "In other languages" part** derives each language's counterpart from `editor.translations` and the current page's key, so a link or unlink shows at once.

*Alternative:* a server action that sets keys in both documents. Linking only ever needs one side, the edited page joining the other's key, so the edit stays in the editor, with undo.

### 3. Copying a page into another language

`copyPageInto(source, pageId, target, newId)` in `packages/site/src/translations.ts` returns the target document with the copy, or a reason it can't be copied.

1. **Refuse** when the target already has a page with the page's key.
2. **Collect the page's subtree:** walk the schema's `node` and `node_array` properties, and the marks and annotations in text properties. This uses the same reachability walk as validation.
3. **Copy it under new IDs** from `newId()`, rewriting every reference inside the subtree: lists, node references, and mark and annotation node IDs.
4. **Remap internal links.** Each `internal_link` mark and `page_link` node points to a page of the source. Its `page_id` becomes the target's page with the same translation key when there is one, and is left as it was otherwise; validation then reports it as a link to a missing page.
5. **Set the slug** with `uniqueSlug(slug, target slugs)`, and keep the translation key.
6. **Add it to the target's `pages`.** When the page has a `page_link` in the source's menu, add a `page_link` at the end of the target's menu, labelled with the page's title.

`POST /api/projects/<p>/languages/<lang>/pages` with `{ from, pageId }`:
- reads the source language's saved document and the target's current one;
- copies with `newId = () => newId("n")`, in the editor's `n…` ID style;
- saves the target with `saveSite`, based on the version just read, which is a conflict if the target changed in between;
- answers 201 `{ pageId, title }`, 409 for an existing counterpart or a conflict, and 404 for an unknown language or page.

The editor calls it only when the session isn't dirty; otherwise it asks to save first. It then reloads `editor.translations`, and the part offers to open the copy.

*Alternative:* copy in the browser with a Svedit session of the target. That would mean loading the target document into the editor that's open for another language.

### 4. Checklist and marks

- **`LanguagesSection`** gets a "To translate" list under each non-primary language: untranslated pages, each linking to its editor, and missing pages, each linking to the primary's editor for that page with "Copy to <language>" as the next step. When a language has neither, it says "Fully translated".
- **`PagesSidebar`** marks untranslated pages in a non-primary language with a "Not translated" tag. It compares the current session's titles and slugs with the primary's summary from `editor.translations`, so the mark follows typing.

### 5. Tests

- **`packages/site`:**
  - `copyPageInto`: subtree copied with new IDs and nothing shared; marks remapped; internal links remapped or left; unique slug; menu item only when the source page had one; refused when a counterpart exists; the result validates;
  - `translationStatus`: untranslated by title or slug; the home page by title only; missing pages.
- **`apps/admin`:**
  - the translations endpoint;
  - the copy endpoint: 201, 409 counterpart, 409 conflict, 404, access;
  - link and unlink with undo;
  - the link choices exclude paired pages.
- **e2e:**
  - copy "Ceník" from Czech to English, and open it;
  - link an English page to "O nás", save, and publish to see the alternate;
  - unlink;
  - the project page lists untranslated and missing pages, and the sidebar mark goes away when the title and slug change.

## Real publish (task 4.3, 2026-10-01)

On the project with English, the owner copied a page across, linked a page built in English, followed the checklist, published, and checked the language switcher on the copied and linked pages. They reported that it works.

## Risks / Trade-offs

- **[The "not translated" rule is a heuristic]** A page whose title is genuinely the same in both languages, such as "Galerie" in Czech and German, stays marked. → It's a hint only, never a blocker. A per-page "translated" switch can come later if owners ask.
- **[A copy into a language open in another editor]** That editor's next save gets a 409 conflict, as with any concurrent save. → It's rare, and the message tells the owner to reload.
- **[The translations summary is loaded once]** It doesn't reflect other languages' later saves until a reload. → The part reloads after a copy, and other changes are rare while editing.

## Migration Plan

None: no format change and no database change.
