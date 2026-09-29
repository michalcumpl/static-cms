# Spec Delta

## Purpose

Packages a rendered site into a static file tree and a ZIP archive that can be uploaded as-is to any static web host.

## ADDED Requirements

### Requirement: File layout
Export SHALL produce a file tree in which the home page is `index.html`, every other page is `<slug>/index.html`, the stylesheet is `assets/style.css`, and every image used by the site is under `assets/images/`. Export SHALL accept the same optional base path as rendering (default `/`). Rendered links SHALL resolve correctly when the tree is served at that path.

#### Scenario: Two-page site
- **WHEN** exporting a site with the home page and a page with slug `kontakt`
- **THEN** the tree contains `index.html`, `kontakt/index.html` and `assets/style.css`

#### Scenario: Export for a subdirectory
- **WHEN** exporting with base path `/web/`
- **THEN** the file layout is unchanged and `index.html` links the stylesheet as `/web/assets/style.css`

### Requirement: Media files
The caller SHALL supply the bytes of every image the document references. Export SHALL include exactly the referenced images, and SHALL fail with an error naming the missing file if a referenced image's bytes were not supplied.

#### Scenario: Missing media
- **WHEN** a hero image references `team.webp` and no bytes were supplied for it
- **THEN** export fails with an error naming `team.webp`

#### Scenario: Unused media
- **WHEN** bytes are supplied for an image that no node references
- **THEN** that file is not included in the export

### Requirement: Sitemap
When the site has a base URL, export SHALL include a `sitemap.xml` listing the absolute URL of every page. When the site has no base URL, export SHALL omit `sitemap.xml` and report a warning.

#### Scenario: Sitemap with base URL
- **WHEN** exporting a site with base URL `https://anideti.cz` and pages home and `kontakt`
- **THEN** `sitemap.xml` lists `https://anideti.cz/` and `https://anideti.cz/kontakt/`

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
