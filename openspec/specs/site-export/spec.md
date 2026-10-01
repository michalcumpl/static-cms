# site-export Specification

## Purpose

Packages a rendered site into a static file tree and a ZIP archive that can be uploaded as-is to any static web host.

## Requirements

### Requirement: File layout
Export SHALL produce a file tree in which:
- the home page (the page named by the site's home page ID) is `index.html`;
- every other page is `<slug>/index.html`;
- the not-found page is `404.html`;
- the stylesheet is `assets/style.css`;
- `robots.txt` is at the root;
- every image variant and share file used by the site is under `assets/images/`;
- every font file and font licence the theme needs is under `assets/fonts/`;
- when the site has a favicon, `favicon.ico`, `icon-512.png` and `apple-touch-icon.png` are at the root.

The home page SHALL NOT also be written under its slug. Export SHALL accept the same optional base path as rendering (default `/`). Rendered links SHALL resolve correctly when the tree is served at that path.

#### Scenario: Two-page site
- **WHEN** exporting a site with the home page and a page with slug `kontakt`
- **THEN** the tree contains `index.html`, `kontakt/index.html`, `404.html`, `robots.txt` and `assets/style.css`

#### Scenario: Home page listed second
- **WHEN** exporting a site whose pages are `kontakt` and `uvod`, with `uvod` as the home page
- **THEN** the tree contains `index.html` (the `uvod` page) and `kontakt/index.html`, and no `uvod/index.html`

#### Scenario: Export for a subdirectory
- **WHEN** exporting with base path `/web/`
- **THEN** the file layout is unchanged and `index.html` links the stylesheet as `/web/assets/style.css`

### Requirement: Media files
The caller SHALL supply the bytes of every media file the document uses (see "Media files used by a document" in site-rendering), keyed by file name. Export SHALL place them in the tree:
- **Variant files** (`<media key>-<width>.webp`) and **share files** (`<media key>-share.jpg`) go under `assets/images/` with their own names.
- **The favicon's icon files** become `apple-touch-icon.png` (from `-icon-180.png`), `icon-512.png` (from `-icon-512.png`), and `favicon.ico`, an ICO file holding the 32-pixel PNG.

Export SHALL include no other media, and SHALL fail with an error naming the missing file if a used file's bytes were not supplied.

#### Scenario: Missing media
- **WHEN** a hero image has media key `team-1a2b3c4d` and width 800, and no bytes were supplied for `team-1a2b3c4d-800.webp`
- **THEN** export fails with an error naming `team-1a2b3c4d-800.webp`

#### Scenario: Unused media
- **WHEN** bytes are supplied for an image file that no node uses
- **THEN** that file is not included in the export

#### Scenario: All variants exported
- **WHEN** exporting a site whose hero image is 1000 pixels wide with media key `pult-3f9a2c1d`
- **THEN** the tree contains `assets/images/pult-3f9a2c1d-480.webp`, `…-960.webp` and `…-1000.webp`, and no original

#### Scenario: Favicon files
- **WHEN** exporting a site whose favicon has media key `logo-1a2b`, with its three icon files supplied
- **THEN** the tree contains `favicon.ico`, which starts with the ICO header and holds the bytes of `logo-1a2b-icon-32.png`
- **AND** it contains `apple-touch-icon.png` with the bytes of `logo-1a2b-icon-180.png`, and `icon-512.png` with the bytes of `logo-1a2b-icon-512.png`

#### Scenario: Share file
- **WHEN** exporting a site whose default share image has media key `pult-3f9a`
- **THEN** the tree contains `assets/images/pult-3f9a-share.jpg` and no WebP variants of that image

### Requirement: Sitemap
Export SHALL accept the same optional site address as rendering. The site's base URL SHALL be that site address when given, otherwise the document's base URL. When the site has a base URL, export SHALL include a `sitemap.xml` listing the absolute URL of every page, with the home page at the base URL. The not-found page SHALL NOT be listed. When the site has no base URL, export SHALL omit `sitemap.xml` and report a warning saying that the sitemap, page addresses in link previews and share images were left out.

#### Scenario: Sitemap with base URL
- **WHEN** exporting a site with base URL `https://anideti.cz` and pages home and `kontakt`
- **THEN** `sitemap.xml` lists `https://anideti.cz/` and `https://anideti.cz/kontakt/`, and not `404.html`

#### Scenario: Home page's slug is not in the sitemap
- **WHEN** exporting a site with base URL `https://anideti.cz` whose home page has slug `uvod`
- **THEN** `sitemap.xml` lists `https://anideti.cz/` and does not list `https://anideti.cz/uvod/`

#### Scenario: No base URL
- **WHEN** exporting a site with no base URL
- **THEN** there is no `sitemap.xml` and the result includes a warning

#### Scenario: Site address given to export
- **WHEN** exporting a site whose document has no base URL, with site address `https://sc-p1.netlify.app`
- **THEN** `sitemap.xml` lists `https://sc-p1.netlify.app/` and the pages' canonical links use that address

### Requirement: Invalid documents are not exported
Export SHALL refuse a document that fails validation and SHALL return the validation errors.

#### Scenario: Invalid document
- **WHEN** exporting a document with a duplicate slug
- **THEN** no files are produced and the duplicate-slug error is returned

### Requirement: ZIP archive
Export SHALL be able to package the file tree as a single ZIP archive, with files at the archive root (no wrapping folder). This SHALL work in both a browser and Node.js.

#### Scenario: Archive contents
- **WHEN** a two-page site is exported as a ZIP
- **THEN** extracting the archive yields `index.html`, `kontakt/index.html` and `assets/style.css` at the top level

### Requirement: Reproducible archive
Exporting the same document with the same media SHALL produce a byte-identical file tree and ZIP archive, independent of the time or machine the export runs on.

#### Scenario: Repeated export
- **WHEN** the same site is exported to a ZIP twice, at different times
- **THEN** the two archives are byte-identical

### Requirement: Redirects file
Export SHALL accept an optional list of redirects, each from an address path to another address path. When the list is not empty, export SHALL include a `_redirects` file with one line per redirect, `<from> <to> 301`, in the given order. Each path SHALL start with `/`; a redirect whose path contains whitespace or doesn't start with `/` SHALL be rejected with an error.

#### Scenario: Redirects written
- **WHEN** exporting with the redirect from `/kontakt/` to `/napiste-nam/`
- **THEN** the file tree contains `_redirects` with the line `/kontakt/ /napiste-nam/ 301`

#### Scenario: No redirects
- **WHEN** exporting without redirects
- **THEN** the file tree has no `_redirects`

### Requirement: Robots file
Export SHALL include a `robots.txt` that:
- allows every crawler everything by default;
- for each AI category switched off in the site, has one group naming that category's crawlers by user agent, with `Disallow: /`;
- when the site has a base URL, ends with a `Sitemap:` line giving the sitemap's absolute URL.

The two categories are:
- **AI search and answers:** crawlers and fetchers that AI assistants and AI search use to find and quote pages, for example `OAI-SearchBot`, `Claude-SearchBot` and `PerplexityBot`.
- **AI training:** crawlers that collect pages for training AI models, and the tokens that opt a site out of such use, for example `GPTBot`, `ClaudeBot`, `CCBot` and `Google-Extended`.

The lists of user agents SHALL be kept in one place, so that they can be updated as crawlers change. Traditional search engines (such as `Googlebot` and `Bingbot`) SHALL NOT be in either list.

#### Scenario: Everything allowed
- **WHEN** exporting a site with both AI switches on and base URL `https://anideti.cz`
- **THEN** `robots.txt` has `User-agent: *` with `Allow: /`, no `Disallow` line, and `Sitemap: https://anideti.cz/sitemap.xml`

#### Scenario: No AI training
- **WHEN** exporting a site with AI search allowed and AI training not allowed
- **THEN** `robots.txt` has a group naming `GPTBot`, `ClaudeBot`, `CCBot` and `Google-Extended` with `Disallow: /`
- **AND** it names neither `OAI-SearchBot` nor `Googlebot`

#### Scenario: No base URL
- **WHEN** exporting a site without a base URL
- **THEN** `robots.txt` has no `Sitemap:` line

### Requirement: Exporting several languages
Export SHALL accept several site documents, one per language, with one of them primary. It SHALL produce one file tree:
- **Pages:** the primary's pages at the base path, and each other language's pages under `<lang>/`, each rendered with the alternates of every language given.
- **Stylesheet:** one `assets/style.css` (from the primary's theme).
- **Shared files:** the primary's `robots.txt`, favicon files and `404.html` at the root.
- **Media:** every media file any language uses, each once, under `assets/images/`.
- **Sitemap:** one `sitemap.xml` that lists every page of every language with its absolute URL, declares the `xhtml` namespace, and gives each URL an `<xhtml:link rel="alternate" hreflang>` for every counterpart, its own language included.
- **Redirects:** the `_redirects` file holds the given redirects of all languages.

When any document has validation errors, export SHALL fail with them, each naming its language. With one document, export SHALL produce the same tree as exporting that document alone.

#### Scenario: Czech and English
- **WHEN** exporting a Czech primary with pages home and `kontakt` and an English document with pages home and `contact`
- **THEN** the tree contains `index.html`, `kontakt/index.html`, `en/index.html`, `en/contact/index.html`, one `404.html`, one `robots.txt` and one `assets/style.css`

#### Scenario: Sitemap alternates
- **WHEN** exporting that site with base URL `https://anideti.cz`
- **THEN** `sitemap.xml` lists `https://anideti.cz/kontakt/` with alternates `cs` → `https://anideti.cz/kontakt/` and `en` → `https://anideti.cz/en/contact/`

#### Scenario: An English error
- **WHEN** the English document has an image without a description
- **THEN** export fails, and the problem says it is in the English version

### Requirement: Font files
Rendering SHALL be able to report the font files a document's theme needs (see "Font files of a theme" in the theming capability). The caller SHALL supply their bytes, keyed by file name, separately from media. Export SHALL place each under `assets/fonts/` with its own name, include no other font files, and fail with an error naming the missing file if a needed file's bytes were not supplied. With several languages, the fonts SHALL be the primary's.

#### Scenario: Webfonts exported
- **WHEN** exporting a site whose theme uses `lora` for headings and `system-sans` for the body, with the Lora files supplied
- **THEN** the tree contains `assets/fonts/lora-latin-normal.woff2`, `assets/fonts/lora-latin-ext-normal.woff2` and `assets/fonts/lora-OFL.txt`, and no other file under `assets/fonts/`

#### Scenario: Missing font file
- **WHEN** exporting a site whose body font is `inter`, and no bytes were supplied for `inter-latin-italic.woff2`
- **THEN** export fails with an error naming `inter-latin-italic.woff2`

#### Scenario: System fonts only
- **WHEN** exporting a site that uses only system fonts
- **THEN** the tree has no `assets/fonts/` files
