# Spec Delta

## MODIFIED Requirements

### Requirement: Sitemap
Export SHALL accept the same optional site address as rendering. The site's base URL SHALL be that site address when given, otherwise the document's base URL. When the site has a base URL, export SHALL include a `sitemap.xml` listing the absolute URL of every page, with the home page at the base URL. When the site has no base URL, export SHALL omit `sitemap.xml` and report a warning.

#### Scenario: Sitemap with base URL
- **WHEN** exporting a site with base URL `https://anideti.cz` and pages home and `kontakt`
- **THEN** `sitemap.xml` lists `https://anideti.cz/` and `https://anideti.cz/kontakt/`

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

### Requirement: Redirects file
Export SHALL accept an optional list of redirects, each from an address path to another address path. When the list is not empty, export SHALL include a `_redirects` file with one line per redirect, `<from> <to> 301`, in the given order. Each path SHALL start with `/`; a redirect whose path contains whitespace or doesn't start with `/` SHALL be rejected with an error.

#### Scenario: Redirects written
- **WHEN** exporting with the redirect from `/kontakt/` to `/napiste-nam/`
- **THEN** the file tree contains `_redirects` with the line `/kontakt/ /napiste-nam/ 301`

#### Scenario: No redirects
- **WHEN** exporting without redirects
- **THEN** the file tree has no `_redirects`
