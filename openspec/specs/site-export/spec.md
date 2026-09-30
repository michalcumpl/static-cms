# site-export Specification

## Purpose

Packages a rendered site into a static file tree and a ZIP archive that can be uploaded as-is to any static web host.

## Requirements

### Requirement: File layout
Export SHALL produce a file tree in which the home page (the page named by the site's home page ID) is `index.html`, every other page is `<slug>/index.html`, the stylesheet is `assets/style.css`, and every image used by the site is under `assets/images/`. The home page SHALL NOT also be written under its slug. Export SHALL accept the same optional base path as rendering (default `/`). Rendered links SHALL resolve correctly when the tree is served at that path.

#### Scenario: Two-page site
- **WHEN** exporting a site with the home page and a page with slug `kontakt`
- **THEN** the tree contains `index.html`, `kontakt/index.html` and `assets/style.css`

#### Scenario: Home page listed second
- **WHEN** exporting a site whose pages are `kontakt` and `uvod`, with `uvod` as the home page
- **THEN** the tree contains `index.html` (the `uvod` page) and `kontakt/index.html`, and no `uvod/index.html`

#### Scenario: Export for a subdirectory
- **WHEN** exporting with base path `/web/`
- **THEN** the file layout is unchanged and `index.html` links the stylesheet as `/web/assets/style.css`

### Requirement: Media files
The caller SHALL supply the bytes of every image file the document uses, keyed by file name (the variant files `<media key>-<width>.webp`). Export SHALL include exactly those files under `assets/images/`, and SHALL fail with an error naming the missing file if a used file's bytes were not supplied.

#### Scenario: Missing media
- **WHEN** a hero image has media key `team-1a2b3c4d` and width 800, and no bytes were supplied for `team-1a2b3c4d-800.webp`
- **THEN** export fails with an error naming `team-1a2b3c4d-800.webp`

#### Scenario: Unused media
- **WHEN** bytes are supplied for an image file that no node uses
- **THEN** that file is not included in the export

#### Scenario: All variants exported
- **WHEN** exporting a site whose hero image is 1000 pixels wide with media key `pult-3f9a2c1d`
- **THEN** the tree contains `assets/images/pult-3f9a2c1d-480.webp`, `…-960.webp` and `…-1000.webp`, and no original

### Requirement: Sitemap
When the site has a base URL, export SHALL include a `sitemap.xml` listing the absolute URL of every page, with the home page at the base URL. When the site has no base URL, export SHALL omit `sitemap.xml` and report a warning.

#### Scenario: Sitemap with base URL
- **WHEN** exporting a site with base URL `https://anideti.cz` and pages home and `kontakt`
- **THEN** `sitemap.xml` lists `https://anideti.cz/` and `https://anideti.cz/kontakt/`

#### Scenario: Home page's slug is not in the sitemap
- **WHEN** exporting a site with base URL `https://anideti.cz` whose home page has slug `uvod`
- **THEN** `sitemap.xml` lists `https://anideti.cz/` and does not list `https://anideti.cz/uvod/`

#### Scenario: No base URL
- **WHEN** exporting a site with no base URL
- **THEN** there is no `sitemap.xml` and the result includes a warning

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
