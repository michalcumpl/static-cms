# Spec Delta

## MODIFIED Requirements

### Requirement: File layout
Export SHALL produce a file tree in which:
- the home page (the page named by the site's home page ID) is `index.html`;
- every other page is `<slug>/index.html`;
- the not-found page is `404.html`;
- the stylesheet is `assets/style.css`;
- `robots.txt` is at the root;
- every image variant and share file used by the site is under `assets/images/`;
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

## ADDED Requirements

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
