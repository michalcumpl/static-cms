# Design

## Context

- **The import** (`apps/admin/src/lib/server/import/job.ts`): `crawl` → `readSite` →
  `fetchImages` → `createSiteProject`, then `imports.retry_state` (`RetryState`) keeps what a
  retry needs: the version saved, `homeLang`, the unreachable pages, the queue over the limit, the
  menu, failed images, `media` (image reference ID → media key) and `pages` (old address → page ID).
- **Other languages today:** `menuLinks` (`packages/import/src/links.ts`) sets aside switcher and
  `hreflang` links as `languages` (addresses only, no language code); `readSite` reports each as a
  `LeftOut` with reason `language`. `fetchPage` (`crawl.ts`) leaves out a page whose `lang` differs
  from `homeLang`, also as `language`, so English sitemap pages show up one by one. `sameSite`
  allows only the host and its `www.` twin.
- **Retries** (`lib/server/import/retry.ts`): `startRetry` checks the import is done, the review
  open and nothing running, inserts an `import_retries` row (`kind`: `again` | `next`), and runs
  `runRetry` on the import queue with the import's 5-minute deadline. `readPagesForRetry`
  (`packages/import/src/retry.ts`) reads pages into nodes under fresh IDs with unique slugs,
  internal links to known pages, and FAQ items from questions.
- **Languages** (`lib/server/site-documents.ts`): `addLanguage` inserts a `site_documents` row
  (hidden) and its first version as a copy of the primary's current document. Shared fields are
  replaced by the primary's whenever another language is read, so the copy's shared nodes don't
  matter after saving, but the collections' item IDs must be the primary's.
- **Redirects:** `page_origins` is keyed by language, and `earlierAddresses` redirects a
  language's old paths without a language prefix, so `/en/contact.html` → `/en/contact/` already
  works once the rows exist.
- **Image references** are keyed by their first candidate address (`ImageCollector`), so an image
  the import fetched is found in `RetryState.media` by address.

## Goals / Non-Goals

**Goals:**
- A language import is the retry machinery with a different crawl start and a different save
  target, not a third importer.
- The result is indistinguishable from a language the owner added and translated by hand: the
  languages capability needs no change.
- Nothing in the primary language changes.

**Non-Goals:**
- Language versions on another host (`en.example.cz`, `example.com`): `sameSite` excludes them, as
  for pages.
- Retrying or continuing a language's import ("Try again", "Import the next pages").
- Importing into a language the project already has, or merging with it.
- The admin command (it imports the primary only, as now).

## Decisions

### 1. The import records the languages on offer: `RetryState.languages`

```ts
interface RetryState {
  // ...as now
  /** Other language versions the old home page links: language code and home address. */
  languages?: { lang: string; url: string }[];
  /** Per imported page, its language links' addresses (for pairing; see 3). */
  pages: { url: string; pageId: string; alternates?: string[] }[];
}
```

`menuLinks` returns each language link with its `hreflang` (primary subtag, lowercased) when it
has one. At the end of the crawl, the job resolves a language for each home-page language link
without `hreflang` by fetching it (`fetchPage` without the language check) and reading its `lang`;
at most one fetch per address, within the import's budget. Links are grouped by language; the
version's home is the link whose path is shortest (`/en/` before `/en/contact/`). Only offered
languages that aren't the primary are kept. `LeftOut` for `language` gains an optional `lang`, so
the review groups the left-out pages of one language under one item with the action.

Imports made before this change have no `languages`: the review offers nothing for them (as
retries did for imports before retries).

*Alternative:* resolve the languages when the owner opens the review. Rejected: it fetches during
a page load, and the import already has the HTML.

### 2. A third retry kind: `language`, with the language on the row

`retryKinds` becomes `["again", "next", "language"]`; `import_retries` gains a nullable `lang`
column (migration `0009`). `startRetry(db, projectId, userId, kind, options, lang?)` keeps every
existing check and adds: the language is in `retryState.languages`, and the project doesn't have
it (`projectLanguages`), refused with `server.languages.alreadyHas` otherwise. The running check is
shared, so a language import and a retry exclude each other.

`runLanguageImport` (a new module `lib/server/import/language.ts`, called from `runRetry`'s
dispatch) does:

1. **Crawl** the version with the existing `crawl(url, { maxPages: 20 })`: its home's language
   becomes `homeLang`, so `fetchPage` drops the primary's pages from the sitemap. Its `language`
   left-outs are discarded (they are the primary's pages, already imported).
2. **Pair** (decision 3), then **read** with `readPagesForRetry`, with `knownPages` set to the
   version's own pages (internal links stay within the language), `takenSlugs` empty, and `newId`
   over the primary's document.
3. **Images:** references found in `state.media` by any candidate are reused; the others are
   fetched with `fetchImages` and uploaded with `uploadImage`. Their descriptions are the version's
   `alt` texts, since image descriptions in pages are per language.
4. **Build** the document (decision 4) and **save** it as a new language (decision 5).
5. **Report:** the new pages are appended to `report.pages` with `lang`; the language's
   `language` left-out item is removed and what this import left out is added with `lang`;
   `RetryState.languages` loses the language; `RetryState` is otherwise unchanged (its `versionId`
   and `pages` stay the primary's, so "Try again" and "Import the next pages" keep working on the
   primary).

### 3. Pairing by address, one to one

A version page *E* pairs with an imported primary page *C* when:
- both are home pages; or
- *E*'s language links include *C*'s address, or *C*'s `alternates` include *E*'s address
  (compared with `pageKey`); a link to the primary's home from a page other than the home doesn't
  count, since switchers often lead to the other language's home.

The first pair in the crawl's order wins, so each primary page has at most one counterpart. *E*
gets *C*'s `translation_key` when *C* is still in the primary's document; otherwise its own page ID.

*Alternative:* pair by slug or by menu position. Rejected: translated slugs and reordered menus
are the norm, and a wrong pair is worse than none (the owner can link pages by hand).

### 4. The language document: the primary's copy, with its pages replaced

Start from a deep copy of the primary's current document (like `addLanguage`), with `lang` set, then:
- remove every page and the nodes it owns (the `owned` walk of `retry.ts`, keeping FAQ items and
  other collection items), and the menu's items;
- add the version's pages, its home first, then in the crawl's order;
- rebuild the menu from the version's home navigation (as `readSite` does), linking the new pages;
- set the site's name and description, and the business's name, from the version's home page
  (`siteName`, the meta description, `readBusiness(...).name`), keeping the copy's when empty;
- questions: `readPagesForRetry` makes FAQ items for every question block. For a paired page,
  the *N*-th question block is matched against the counterpart's *N*-th `faq` block in the primary:
  same count → the new items' texts are written onto the primary's item IDs in this document, the
  block points at those IDs, and the new items are dropped; otherwise the block becomes a text
  block (heading, then each question as a level-3 subheading followed by its answer) and its items
  are dropped. The FAQ collection's item list stays the primary's.

`readPagesForRetry` gets a small option for the last point rather than a second reader:
`questionsAsText?: (pageUrl, blockIndex, count) => string[] | undefined`, returning the item IDs to
reuse or undefined for text.

### 5. Saving a language from a document

`addLanguage` is split: `createLanguage(db, projectId, lang, userId, document)` inserts the row
and first version; `addLanguage` calls it with the primary's copy. The language import validates
the document like the import does (problems allowed; they show in the review) and calls
`createLanguage` inside a transaction that re-checks the language doesn't exist, then inserts
`page_origins` rows with `lang`. A failure leaves the project unchanged; uploaded images that the
document doesn't use stay in the library, as for a failed retry today.

### 6. The review

`+page.server.ts` adds `offers.languages` (each `{ lang, url }` the project doesn't have) and an
action `?/importLanguage` with `lang`. The left-out card shows one item per language: "The English
version (/en/), not imported" with "Import the English version" for offered ones, and the plain
line for others. The progress and result reuse the retry's polling (`/api/projects/[project]/import-retry`
gains `lang` in its response); the result line says "Added English with N pages, hidden until you
publish it", linking to the Languages page. Imported pages get a language column when the report
has more than one language. Texts in `cs.ts` and `en.ts`.

### 7. Problems and imported images in every language (found in testing)

Testing on Mareš Partners: the imported Czech home photo had no description, which blocked the
preview, and nothing led to it: the review listed and fixed only the primary's problems, and the
preview linked to the primary's editor.

- `RetryState.languageVersions` (`{ [lang]: versionId }`) records the version a language import
  saved; `createLanguage` returns it. The imported images of a language are those of that version
  (the primary's stay the import's version and the retries' `importedImages`).
- `undescribedImportedImages(db, projectId)` returns them per language; marking them decorative
  saves one version per language it changes, each with its own conflict check.
- The review's "Before you publish" groups each language's problems on its own (`groupProblems`
  per document), links them with `projectPaths(project, lang)` for languages other than the
  primary, and prefixes their messages with the language's name when there are several, as
  `languageErrors` does for publishing.
- The preview checks every language it shows before exporting, and lists the errors with their
  language and a link each (`problemHref` in that language's paths). A hidden language's errors
  still block the preview; the Overview stays the primary's (not part of this change).

## Risks / Trade-offs

- [The version's crawl reads the primary's sitemap pages only to drop them] → the 20-page limit
  counts kept pages only; the deadline is the same 5 minutes. Over-limit counts may include
  pages of the primary; the report says "up to N" for a language.
- [Sites without `lang` attributes] → their versions can't be told apart: links without
  `hreflang` resolve to no language and are only named, as today.
- [A switcher linking every page to the other language's home] → no pairs but the homes; the
  pages land unpaired and the Languages page lists both sides, which the owner fixes with "Link to
  a page in another language".
- [The owner changes the primary between the import and the language import] → the copy is taken
  at the start of the run; shared fields come from the primary when read anyway, and a primary page
  deleted meanwhile just leaves its English counterpart unpaired.

## Migration Plan

Migration `0009` adds `import_retries.lang` (nullable). `RetryState.languages` and
`pages[].alternates` are optional, so old imports read as before and offer no languages. Rollback:
the column is ignored by older code.
