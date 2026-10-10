# Proposal

## Why

Many small business sites in Czechia and around it have an English or German version next to the
main one. The import reads only the home page's language and the review just says "Another language
of the website, not imported", so the owner has to add the language and retype every page by hand,
although the translations are already on the old site.

## What Changes

- **The import notes each other language it can import.** For each language version the old site
  links to (language switcher, `hreflang` alternates), the import records the language and its home
  address. A version counts when its language is one sites can have (cs, sk, en, de, pl), isn't the
  primary, and the project doesn't have it.
- **"Import the English version" in the review.** While the review isn't dismissed, each such
  language offers an action that imports it in the background, like a retry, one at a time per
  project:
  - its pages are read from its own home page, menu and sitemap, up to 20 pages, with the import's
    rules and limits;
  - it becomes a new, hidden language of the project, saved as that language's first version, with
    the shared fields from the primary as for any added language;
  - each page is paired with its counterpart in the primary language (same translation key) when
    the old site pairs them (an `hreflang` alternate or the language switcher), the home pages
    always; the others get a translation key of their own;
  - the primary's pages without a counterpart are not in the new language, so the Languages page
    lists them as missing;
  - the menu is the language version's own menu; the site name, description and business name come
    from its home page;
  - questions on a paired page translate the primary counterpart's questions when the two pages
    have as many; otherwise they become text;
  - images the import already brought are reused, new ones are fetched;
  - each page records its old address, so the published site redirects it.
- **The review reports the language's import**: its pages with old and new addresses, and what it
  left out. Nothing is published, and the language stays hidden until the owner publishes it.

Not in this change: importing several languages at once or during the first import, "Try again" and
"Import the next pages" for another language, languages the admin doesn't offer, matching an
existing language the owner added by hand.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `site-import`: "Language" (other languages are offered for import instead of only named),
  "Import review" (the language actions and their report), "Retrying what was left out" (other
  languages are imported from the review, not retried); a new requirement "Importing another
  language".

## Impact

- `packages/import`: language versions with their language codes (`links.ts`, `site.ts`); reading
  a language version's pages into a language document paired with the primary's (`retry.ts` or a
  new `language.ts`).
- `apps/admin`: `RetryState` gains the languages on offer; a new retry kind `language` in
  `lib/server/import/retry.ts` (or a sibling module) that crawls the version, builds and saves the
  new language document and its `page_origins`; the import review page and its action; i18n (cs, en).
- No new tables; `import_retries.kind` gains a value, and the retry row records the language.
- No change to publishing or languages: the new language behaves like one added by hand.
