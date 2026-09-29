# Spec Delta

## MODIFIED Requirements

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
