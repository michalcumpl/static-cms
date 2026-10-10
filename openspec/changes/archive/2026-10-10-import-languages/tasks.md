# Tasks

## 1. Fixture: the bakery's English version

- [x] 1.1 Extend `packages/import/fixtures/bakery/en/` into an English version: a navigation with "Home", "Our bread" (`/en/our-bread/`), "Contact" (`/en/contact.html`) and "Wholesale" (`/en/wholesale/`, no Czech counterpart), `hreflang` alternates both ways between the paired pages (Czech pages linking theirs, English pages linking back), the home's three questions in English, two questions on "Contact" (whose Czech "Kontakt" has none, for the mismatch), the Czech photos reused plus one new, a business name in its structured data, and the English pages kept out of `sitemap.xml` (so the Czech import's report is unchanged); leave "Akce" and "O nás" without counterparts; update `fixtures/README.md` and verify the existing `fixtures.test.ts` snapshots of the Czech import are unchanged (the Czech import still reads only Czech pages)

## 2. `@webmio/import`: languages with their codes

- [x] 2.1 Make `menuLinks` return each language link with its `hreflang` primary subtag (lowercased, `""` without one) and give `LeftOut` an optional `lang`; verify `links.test.ts` cases for an `hreflang` link, `<link rel=alternate hreflang>`, and a switcher link without `hreflang`
- [x] 2.2 Have `readSite` report one `language` left-out per version with its `lang` when known, and return each page's language-link addresses (for `alternates`); verify `site.test.ts` that the bakery reports English once with `lang: "en"` and that "Naše pečivo" lists `/en/our-bread/`
- [x] 2.3 Add the `questionsAsText` option to `readPagesForRetry` (reuse given item IDs, or make the block text: heading, then each question as a level-3 subheading with its answer); verify `retry.test.ts` for both branches and that no FAQ items are returned in either

## 3. Recording the languages on offer

- [x] 3.1 Add `languages` and `pages[].alternates` to `RetryState`, and `lang` to `import_retries` with migration `0009_import_languages.sql` and `"language"` in `retryKinds`; verify `db.test.ts` and that an existing database gains the column
- [x] 3.2 At the end of the import job, resolve each version's language (`hreflang`, else fetch the link and read its `lang`), group by language with the shortest path as its home, keep offered non-primary languages, and write them with each page's `alternates`; verify a `job.test.ts` case that the bakery's import records `{ lang: "en", url: ".../en/" }`, and a `language.test.ts` case where a link without `hreflang` is resolved by its page and a Hungarian link is not kept
- [x] 3.3 Split `addLanguage` into `createLanguage(db, projectId, lang, userId, document)` and the copy; verify `languages-storage.test.ts` still passes and a new test creates a language from a given document as its first, hidden version

## 4. The language import job

- [x] 4.1 Extend `startRetry` with `lang` for kind `language`: refused when the language isn't offered, the project has it ("already has English"), the review is dismissed, or an import or retry runs (shared check); verify tests for "Language added by hand meanwhile" and "Refused while a retry runs", and that "Try again" is refused while a language import runs
- [x] 4.2 Implement the crawl and pairing in `lib/server/import/language.ts`: crawl the version's home with 20 pages, drop its `language` left-outs, pair one to one (homes; `hreflang`/switcher links either way; no pairing via a link to the primary's home from another page); verify unit tests on the bakery fixture: "Our bread" ↔ "Naše pečivo", "Contact" ↔ "Kontakt", "Wholesale" unpaired, and a switcher-to-home page left unpaired
- [x] 4.3 Build the language document: the primary's copy without its pages and menu items, the version's pages (home first) with paired translation keys, its menu, site name, description and business name, questions translated onto the counterpart's items or made text, images reused from `state.media` by address and new ones fetched and uploaded; verify against the fixture server "Import the English version", "A page only in English", "A page only in Czech", "Shared details stay the primary's", "Translated questions" and "Questions that don't match" (the English "Contact" has two questions, "Kontakt" none)
- [x] 4.4 Save with `createLanguage` in a transaction that re-checks the language, insert `page_origins` with `lang`, update the report (pages with `lang`, the language's left-out replaced by what it left out, tagged with `lang`), remove the language from `RetryState.languages`, and leave the rest of `RetryState` unchanged; verify a test that afterwards "Try again" still adds a Czech page that failed (the bakery has nothing over the limit), and a test that a failure (language added during the run) leaves the project and report unchanged and the language still offered
- [x] 4.5 Verify "Old English address redirected": a publishing test that the English "Contact" redirects from `/en/contact.html` to its English address (found and fixed: `redirectsFromOrigins` compared old paths with unprefixed addresses, so `/en/our-bread/` redirected to itself)
- [x] 4.6 Return `lang` from `GET /api/projects/[project]/import-retry` and verify its route test

## 5. The review

- [x] 5.1 Add `offers.languages` and the `?/importLanguage` action to the review's `+page.server.ts`; verify a server test that the action starts a `language` retry and that a language the project has isn't offered
- [x] 5.2 Show one left-out item per language with "Import the <language> version" for offered ones, the progress and the result ("Added English with 4 pages, hidden until you publish it", linking to the Languages page), and a language column for pages when the report has two languages; texts in `cs.ts` and `en.ts`; verify `i18n.test.ts` and `svelte-check`
- [x] 5.3 Add an e2e case to `apps/admin/e2e/site-import.spec.ts`: import the bakery, import its English version from the review, see the English pages listed and English hidden on the Languages page with "Akce" missing; verify it passes

## 6. Problems and imported images in every language (found in testing)

- [x] 6.1 Record `languageVersions` in `RetryState` (`createLanguage` returns its version ID) and make the decorative action cover each imported language's images, saving one version per language changed; verify "Images of an imported language" and that "Two undescribed images" and "The owner's own image" still pass
- [x] 6.2 List every language's problems in the review's "Before you publish", grouped per language, prefixed by language name when there are several, linking into that language's editor; verify "A problem in the imported language" in a review server test
- [x] 6.3 Have the preview list each language's errors with its name and a link to where it is fixed in that language's editor; verify "A problem in a hidden language" in `preview.test.ts`
- [x] 6.4 Extend the e2e case: after importing English, the review lists the English photo's problem and "Mark these images as decorative" fixes it; verify it passes

## 7. Integration

- [x] 7.1 Run the import against a real bilingual small business site (with the admin's local server), import its other language from the review, and check the pairs, menu and redirects in the preview; record anything mis-mapped in `docs/import-mapping.md`
- [x] 7.2 Run the repository's checks (lint, type checks, unit and e2e tests) and verify they pass
