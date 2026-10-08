## MODIFIED Requirements

### Requirement: Sitemap
Export SHALL accept the same optional site address as rendering. The site's base URL SHALL be that site address when given, otherwise the document's base URL. When the site has a base URL, export SHALL include a `sitemap.xml` listing the absolute URL of every page, item pages of services and projects included, with the home page at the base URL. The not-found page SHALL NOT be listed. When the site has no base URL, export SHALL omit `sitemap.xml` and report a warning saying that the sitemap, page addresses in link previews and share images were left out.

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

#### Scenario: Project pages in the sitemap
- **WHEN** the site with base URL `https://punkfilm.cz` has the projects' listing page "Work" and two projects with the addresses `the-last-race` and `mustang`
- **THEN** `sitemap.xml` lists `https://punkfilm.cz/work/the-last-race/` and `https://punkfilm.cz/work/mustang/`, and the export holds `work/the-last-race/index.html` and `work/mustang/index.html`
