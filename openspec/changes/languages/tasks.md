# Tasks

## 1. Document, rendering and export in `packages/site`

- [x] 1.1 Add `page.translation_key`, format 5 and `toVersion5`, and the duplicate and empty key rules (design.md decision 3). Update the fixtures to format 5, keeping a format-4 copy. Verify with unit tests for "Upgrade a version-4 site", the earlier upgrade scenarios (now version 5), "Unsupported schema version" (version 4), "Duplicate key" and "Empty key".
- [x] 1.2 Add `applySharedFields` (decision 1). Verify with unit tests: each shared field taken from the primary; site name, description, share image description, business name and hours note kept; the share description cleared when the image changes; opening hours ranges replaced with no unreachable nodes left; the result validates.
- [x] 1.3 Add strings and language names for sk, de and pl (decision 4). Verify with unit tests for "German site", the opening hours day names in each language, and "Other language" (`fr` → English).
- [x] 1.4 Add the `languages` render option: alternates in the head and the language switcher in the header and on the not-found page, with CSS (decision 4). Verify with unit tests for "Counterpart in English", "No counterpart", "One language" (and unchanged snapshots), path URLs without a site address, the not-found page's switcher, and `html-validate` on a two-language page.
- [x] 1.5 Add `exportSiteLanguages` (decision 5). Verify with unit tests for "Czech and English", "Sitemap alternates" (parsed XML), "An English error", one language equal to `exportSite`, media used by two languages exported once, and redirects of both languages in `_redirects`.

## 2. Storage and APIs in `apps/admin`

- [x] 2.1 Add the database migration (`projects.primary_lang`, `site_documents.published`, `publish_documents` with backfill) and per-language storage in `site-documents.ts` (decision 2). Verify with unit tests: "Existing project", "Add English", "Adding a language twice", "Read another language", "Two languages edited at once", "Change the phone once", "Hidden in the preview only" (storage part), "Remove German", "Primary can't be removed", and the backfill.
- [x] 2.2 Add the languages API and the `lang` parameter of the site API (decision 6). Verify with route tests: listing, adding (201, 409, 400), publishing and hiding, removing (and the primary refused), reading and saving `?lang=en`, an unknown language (404), and "Another workspace" (404, and 401 when not signed in).
- [x] 2.3 Make the preview, ZIP export input and publishing work over languages, with per-language redirects and `publish_documents` (decision 6). Verify with tests: the preview serves `/en/` while hidden, "Two published languages", "Hidden language", "Renamed English page", and the history lists the languages of a publish.

## 3. Editor and project page

- [x] 3.1 Give new and duplicated pages their own translation keys. Verify with unit tests for "Duplicate in English" and a new page's key.
- [x] 3.2 Add the project page's Languages section, the editor's language switcher (`?lang=`), and read-only shared fields in Site and Business (decision 6). Verify with e2e tests: add English, open it, change a heading and save; "Switch to English on the same page"; "Phone in English" (read-only with the note, and the hours note editable); the preview at `/en/` while hidden; publish English, then hide it and remove it with confirmation.
- [x] 3.3 e2e: publish Czech and English to the fake Netlify. The live site has `/en/` pages, alternates and the switcher, the sitemap lists both languages, and an English slug change redirects.

## 4. Docs and checks

- [x] 4.1 Update the README (languages, shared fields, format 5) and the roadmap (Milestone 5, part 1 done; `language-tools` next). Verify by reading both.
- [ ] 4.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [ ] 4.3 Manual check by the owner: add English to a real project, translate a page or two, publish, and check the switcher, the English pages and their addresses, and that a phone change in Czech shows in English. Record the outcome in design.md.
