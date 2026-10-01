# Proposal

## Why

Many small businesses in Czechia need their site in a second language: English for tourists and expats, German or Polish near the borders. Today a project has exactly one document, in Czech. This is Milestone 5, the first of two changes agreed while exploring it. The follow-up, `language-tools`, covers linking and copying single pages between languages and a "not translated yet" checklist.

The groundwork is in place:
- the database already holds one document per project and language;
- the renderer's base path produces `/en/` links;
- site strings exist in Czech and English;
- the business details are stored as data rather than text.

## What Changes

- **Project languages.**
  - A project has a **primary language** (its first, Czech for every existing project) and may add **Slovak, English, German or Polish**.
  - A new language starts as a **copy of the primary document**, with the same page IDs, and is **hidden** until a member publishes it.
  - A language other than the primary can be hidden again, or removed after confirming.
  - This is managed in a new "Languages" section of the project page.
- **Shared fields come from the primary.** These describe the business and the site, not the language:
  - the theme, favicon, default share image (its image; its description stays per language), and the AI crawler switches;
  - the business data: address, phone, email, map address, type, opening hours and the footer switch.

  When any other language's document is read (for the editor, preview, download or publish), these fields are replaced by the primary's current values. In the editor they are read-only outside the primary, marked "Edited in Čeština". Everything else, all texts and pages and the menu, is per language.
- **Page pairing.** Every page gets a `translation_key`. A copied page keeps its key, so "Kontakt" in Czech and its English copy are the same page in two languages.
  - **Document format 5:** existing pages get their own ID as the key.
  - New and duplicated pages get a key of their own.
- **Addresses.** The primary language stays at the root, so existing published addresses don't change. Other languages are served under `/<lang>/`, with their own slugs. A copy keeps the Czech slugs until the owner changes them.
- **On every page of a site with more than one language:**
  - `<link rel="alternate" hreflang>` for each published counterpart, and `x-default` pointing at the primary's;
  - a language switcher in the header, linking to the same page in each other language, or to that language's home when there's no counterpart.

  The browser's language never redirects visitors.
- **One site, one deploy.** Export renders every included language with its base path and merges them:
  - one `sitemap.xml` listing every page with its alternates;
  - one `robots.txt`;
  - one `404.html` in the primary language;
  - the favicon at the root.

  Publishing deploys all published languages together, and redirects from earlier addresses work per language. The preview shows every language, hidden ones included. The ZIP download contains the published languages.
- **Editor.**
  - A language switcher at the top of the left column; each language is edited and saved on its own.
  - The Site and Business tabs show the primary's shared fields read-only in other languages.
- **Site strings** gain Slovak, German and Polish: the not-found page, day names, "closed", "Show on map" and placeholder headings.

### Non-goals (this change)

- Linking an unpaired page to one in another language, copying single pages across, and translation checklists (`language-tools`).
- Changing the primary language, per-language domains, and machine translation (Milestone 6).
- Redirecting a removed language's addresses. They return "not found", like deleted pages.

## Capabilities

### New Capabilities

- `languages`: a project's languages:
  - the primary language;
  - adding (copying), publishing, hiding and removing languages;
  - shared fields taken from the primary;
  - who may manage languages.

### Modified Capabilities

- `site-document`: pages gain `translation_key` (format 5, and its upgrade).
- `site-rendering`:
  - language alternates and the language switcher, given the site's other languages;
  - site strings in five languages.
- `site-export`:
  - exporting several languages into one file tree, with a merged sitemap;
  - one robots file and one not-found page.
- `site-storage`: a project holds one document per language; reading a non-primary document applies the primary's shared fields.
- `site-editing`:
  - the editor's language switcher;
  - read-only shared fields in other languages;
  - translation keys for new and duplicated pages.
- `publishing`: publishing deploys every published language; redirects and history per language.

## Impact

- **`packages/site`:**
  - `translation_key` and the format-5 migration;
  - render options for alternates and the switcher;
  - `exportSiteLanguages` (merged export and sitemap with `xhtml:link` alternates);
  - shared-field overlay helpers;
  - strings for sk, de and pl;
  - CSS for the switcher;
  - tests.
- **`apps/admin`:**
  - database: `projects.primary_lang`, `site_documents.published`, and a `publish_documents` table (the version of each language in a publish), with a migration and a backfill;
  - `site-documents.ts`: per-language read and save with the overlay, and add, remove and publish/hide;
  - the languages API and the project page section;
  - the site API, editor load and paths take a language;
  - the editor's language switcher, and read-only shared fields;
  - preview, ZIP download and publishing over all languages;
  - per-language redirects;
  - tests (unit and e2e).
- **No new dependencies.**
- **Docs:** README (languages, format 5) and the roadmap (Milestone 5, part 1).
