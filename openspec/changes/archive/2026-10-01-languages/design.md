# Design

## Context

See proposal.md. These decisions were made while exploring:
- full per-language documents, with shared fields from the primary;
- a new language starts as a copy with the same page IDs, hidden until published;
- the primary at the root and others under `/<lang>/`;
- no browser-language redirects;
- the work split into `languages` and `language-tools`.

The current state that shapes the approach:
- **Storage.** `site_documents` has `(project_id, lang)` unique, and every read and save in `site-documents.ts` uses `DEFAULT_LANG = "cs"`. `versions` belong to a document. `publishes.version_id` points at the one version published.
- **Renderer.** `renderSite(doc, { basePath, siteUrl })` and `exportSite(doc, media, { basePath, siteUrl, redirects })` handle one document. `RenderContext` resolves page URLs from the base path. `renderHead` builds the head, and `renderDocument` the shell. Site strings exist for `cs` and `en`.
- **Editor.** It loads `GET /api/projects/<p>/site` in `edit/+layout.ts`, routes by page ID (`/p/<p>/edit/<page-id>/`), and has one `EditorState` and session.
- **Preview, ZIP and publish.** The preview exports at `/p/<p>/preview/` and serves files from the tree. The ZIP download builds in the browser from the site API and the media route. Publishing reads the current document, computes redirects from earlier published documents, exports and deploys.

## Goals / Non-Goals

**Goals:**
- Rendering and validation stay one document at a time. Several languages are composed only at the edges: export, preview and publish.
- Existing single-language projects behave and render exactly as before. With one language, there's no switcher and no alternates.

**Non-Goals:**
- Per-language themes, favicons or business data.
- Showing all languages side by side in the editor.

## Decisions

### 1. Shared fields are applied on read, not copied on save

We decided on "synced copies" while exploring. Implementing it as a copy on every save of the primary would write a new version of every other language. That would bump their versions under an open editor, causing 409s, and multiply versions.

Instead, `applySharedFields(primary, other)` in `packages/site/src/languages.ts` returns `other` with the shared fields replaced by the primary's (the list is in the languages spec). The server calls it whenever it reads a non-primary document. The stored English document can hold stale shared values, but nothing ever renders or edits them unapplied. Owners see exactly what "synced copies" promised, without the write fan-out.

What applying means:
- **Theme:** the primary's theme node values are copied over the other's theme node (same ID from the copy, otherwise by the site's `theme` reference).
- **Favicon and default share image:**
  - the image nodes in the other's lists are replaced by copies of the primary's, under the same IDs;
  - for the share image, the description is kept when the image key is unchanged, and the primary's is used otherwise. Clearing it would make the other language invalid until someone translated it.
- **AI switches:** copied.
- **Business:**
  - every field except `name` and `hours_note` is copied;
  - the days and ranges are copied as nodes, by the primary's IDs;
  - the other's old range nodes become unreferenced, and are dropped from the returned document so it stays free of unreachable-node warnings.

The function is pure and tested in `packages/site`. The admin is the only caller.

*Alternative:* a separate shared document (option C in exploration), rejected for breaking the one-input renderer.

### 2. Storage

- **`projects.primary_lang`:** text, not null, default `'cs'`. It's the language a project was created in; existing rows get `cs`.
- **`site_documents.published`:** integer boolean, not null, default 1, so existing documents stay published. Added languages are inserted with 0. The primary is always treated as published, whatever the column says.
- **`publish_documents`:** `(publish_id → publishes, lang, version_id → versions)`, primary key `(publish_id, lang)`. The migration backfills one row per existing publish from `publishes.version_id`, with the project's primary language. `publishes.version_id` stays as the primary's version, for the history's "saved version".
- **`site-documents.ts`:**
  - `readSite(db, projectId, lang?)` reads the primary when no language is given, and applies the shared fields for any other language;
  - `saveSite(db, projectId, userId, document, baseVersion, lang?)`;
  - `projectLanguages(db, projectId)` lists `{ lang, primary, published, version }`;
  - `addLanguage` copies the primary's current, upgraded document with `site.lang = lang`;
  - `setLanguagePublished`;
  - `removeLanguage`, which deletes the document; versions cascade, and so do `publish_documents` rows through `version_id`.

`DEFAULT_LANG` stays the default for new projects.

### 3. Translation keys and format 5

- **Schema:** `page.translation_key: string`.
- **Migration:** `toVersion5` sets each page's key to its ID.
- **Validation:**
  - `invalid-value` for an empty key;
  - `duplicate-translation-key` (new, category `site`) for two pages with the same key, naming both titles.
- **Editor:** `addPage` sets the key to the new page's ID, and `duplicatePage` sets the copy's key to the copy's ID. The copy made by `tr.build` would otherwise keep the original's key.
- **Adding a language** copies node IDs, so keys pair automatically.

### 4. Rendering several languages

- **`RenderOptions.languages?: SiteLanguage[]`**, where `SiteLanguage` is `{ lang, name, basePath, primary, pages: Map<translationKey, url> }`. The URLs are page addresses including the base path.
- **`RenderContext`** keeps the list.
- **`renderHead`** adds the alternates after the canonical link: absolute URLs via `siteUrl` when it's known, paths otherwise.
- **`renderDocument`** adds the switcher, `<nav class="language-switcher" aria-label="Language">`, after the main navigation in the header:
  - it renders only with two or more languages;
  - `languageLinks(ctx, translationKey?)` gives each language's counterpart or home;
  - the not-found page passes no key, so it links each language's home.
- **Language names** live in `strings.ts` next to the site strings: `languageName(lang)`. `siteStrings` gains `sk`, `de` and `pl`.

The single-language path passes no `languages`, so snapshots stay unchanged.

### 5. Export of several languages

`exportSiteLanguages(languages: { lang, document, primary }[], media, { basePath, siteUrl, redirects })`:
1. It validates every document first, and prefixes each problem's message with the language name ("English: …") when there are several.
2. It builds the `SiteLanguage` list: each language's base path is `basePath` for the primary and `basePath + lang + "/"` for the others, and each language's page map comes from `RenderContext` routes.
3. It calls the existing single-document export for each language with `{ basePath, siteUrl, languages }`. For non-primary languages it keeps only page files, prefixed with `<lang>/`. The primary contributes everything else: style, robots, 404, favicon and sitemap, which is replaced.
4. It merges the media files. Shared files are linked from the site's root in every language, through the render option `assetBasePath`, while page links use the language's base path. Without this, English pages linked `/en/assets/style.css`, which doesn't exist (found in review, fixed with a test that every file an English page links is in the tree).
5. It writes one sitemap. Each URL gets `xhtml:link` alternates, and the `xmlns:xhtml` namespace is declared.

`exportSite(doc, …)` stays as it is for one document.

*Alternative:* render all languages inside one `RenderContext`. That's a bigger change to everything that resolves page URLs, for no gain.

### 6. Admin: API, editor, preview, ZIP and publish

- **Languages API:**
  - `GET /api/projects/<p>/languages` lists the languages;
  - `POST` with `{ lang }` adds one (201), answering 409 when it exists and 400 for one not offered;
  - `PATCH …/languages/<lang>` with `{ published }`;
  - `DELETE …/languages/<lang>`;
  - all of them for members, with the cross-site check as for media.
- **Site API:** `GET/PUT /api/projects/<p>/site?lang=en`. The editor URL carries `?lang=en` for non-primary languages. Page IDs are the same across languages, so the language can't live in the page path alone, and a query keeps the existing routes. `projectPaths(p, lang?)` builds both.
- **Project page:** a "Languages" section with a list (name, Primary/Published/Hidden, Edit, Publish or Hide, Remove with a confirmation dialog) and "Add a language" (a `<select>` of offered languages not yet added).
- **Editor:**
  - `+layout.ts` loads the site for `url.searchParams.get("lang")` and the project's languages;
  - `LanguageSwitcher.svelte` sits at the top of the left column and navigates with `goto`, keeping the page ID when the target has the same translation key, so the existing unsaved-changes guard applies;
  - `EditorState` gets `lang` and `primaryLang`;
  - in Site and Business, the shared fields render disabled when `lang !== primaryLang`, with the note and a link.
- **Preview:** exports all languages, hidden ones included, with `basePath = paths.preview`, so English is at `/p/<p>/preview/en/`.
- **ZIP download:** a new `GET /api/projects/<p>/export-input` returns the published languages' documents (shared fields applied) and the media names. The browser fetches the media and calls `exportSiteLanguages`, as it does now with one document.
- **Publish:**
  - it reads every published language, exports with `exportSiteLanguages` and the site address, and records `publish_documents`;
  - redirects are computed per language from that language's earlier published documents, prefixed with the language's base path (`earlierAddresses(db, projectId, lang, current, basePath)`).

### 7. Tests

- **`packages/site`:**
  - format 5 and its validation;
  - `applySharedFields` for each shared field, kept translatable fields, the share image description, and range nodes;
  - alternates and switcher markup with absolute and path URLs, no counterpart, one language, and the not-found page;
  - strings for sk, de and pl;
  - `exportSiteLanguages` with the spec's scenarios, sitemap XML, an English error, one language equal to `exportSite`, and media de-duplicated;
  - `html-validate` on a two-language page.
- **`apps/admin`:**
  - storage: add (copy, hidden, version), read with shared fields, saving one language leaves others, remove, publish/hide, the primary refused, the migration backfill;
  - API: access and errors;
  - publish: two languages in one deploy, hidden left out, per-language redirects, `publish_documents`;
  - editor: translation keys on add and duplicate.
- **e2e:**
  - add English on the project page, edit an English heading, switch back on the same page;
  - change the phone in Czech and see it in English's Business tab, read-only;
  - preview `/en/` while hidden;
  - publish English, and the live site has `/en/`, alternates and the switcher.

## Real publish (task 4.3, 2026-10-01)

The owner added English to a real project, translated pages, changed the phone in Czech, published both languages, and checked the live site. They reported that it works. An earlier attempt had shown English pages without styles and images, which was fixed (decision 5) before this check.

## Risks / Trade-offs

- **[Stored non-primary documents hold stale shared values]** → They're always applied on read. Restoring an old English version later (version history, not built yet) would also get current shared values, which is what owners expect.
- **[A copied language shows Czech text until translated]** → It starts hidden, and the follow-up `language-tools` adds a checklist. The preview shows it, so owners can check before publishing.
- **[Slugs of a copy are Czech]** (`/en/kontakt/`). → It's harmless and fixable per page, and `language-tools` will flag untranslated slugs.
- **[Format 5 is forward-only]** It's the same as earlier formats, documented in the README.
- **[Publishing many languages makes a bigger deploy]** → Unchanged files aren't uploaded (digest deploys), and pages are small.
- **[Removing a language deletes its versions]** → The confirmation says so. Hiding is the reversible alternative, and the dialog offers it.

## Migration Plan

1. A database migration adds `projects.primary_lang` (default `cs`), `site_documents.published` (default 1) and `publish_documents`, and backfills `publish_documents` from `publishes`.
2. Documents upgrade to format 5 on read.
3. Every existing project is single-language and renders unchanged.
4. Rollback after a language was added: older builds read only `cs` and ignore the others. Projects saved in format 5 need the backup, as before.
