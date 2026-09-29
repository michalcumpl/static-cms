# Spec Delta

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry the schema version (`2`), the site name, a language tag (for example `cs`), an optional base URL, a reference to the theme, a reference to the navigation, an ordered list of pages, and the ID of the home page. The home page ID SHALL name a page in the site's list of pages. The position of a page in the list SHALL NOT determine which page is home.

#### Scenario: Missing language
- **WHEN** the site node has an empty language
- **THEN** validation reports an error, because every page needs a `lang` attribute

#### Scenario: Home page
- **WHEN** a site lists pages `page_contact`, `page_home` and its home page ID is `page_home`
- **THEN** `page_home` is treated as the home page, served at the site root

#### Scenario: Home page is not a page of the site
- **WHEN** the site's home page ID is `page_gone`, which is not in its list of pages
- **THEN** validation reports a missing-home error

#### Scenario: Unsupported schema version
- **WHEN** a document has schema version 1
- **THEN** validation reports an unsupported-schema-version error

### Requirement: Pages and slugs
Every page SHALL have a title, a slug, optional SEO description text, and an ordered list of blocks. Every page's slug, the home page's included, SHALL be non-empty, lowercase, ASCII, dash-separated (the output of slugifying itself), and unique within the site. The home page's slug SHALL NOT be used for its address while it is the home page.

#### Scenario: Duplicate slug
- **WHEN** two pages both have slug `kontakt`
- **THEN** validation reports a duplicate-slug error naming both pages

#### Scenario: Non-normalized slug
- **WHEN** a page has slug `Kontakt Us`
- **THEN** validation reports an invalid-slug error suggesting `kontakt-us`

#### Scenario: Home page needs a slug
- **WHEN** the home page's slug is empty
- **THEN** validation reports an invalid-slug error for the home page

#### Scenario: Home slug clashes with another page
- **WHEN** the home page has slug `uvod` and another page also has slug `uvod`
- **THEN** validation reports a duplicate-slug error naming both pages

### Requirement: Navigation
The navigation SHALL be an ordered list of navigation items. Each item SHALL have a label and SHALL link either to a page node in the document (by reference) or to an external URL. A page that has more than one navigation item SHALL be reported as a warning.

#### Scenario: Link to a page by reference
- **WHEN** a navigation item references `page_contact` and that page's slug later changes
- **THEN** the item still links to that page without editing the navigation

#### Scenario: Page in the menu twice
- **WHEN** two navigation items both reference `page_contact`
- **THEN** validation reports a duplicate-menu-item warning, and the document stays valid

### Requirement: Validation result
Validation SHALL return all problems found, not only the first. Each problem SHALL have a severity (`error` or `warning`), a category, a machine-readable code, a human-readable message, and the ID of the node (and property, when applicable) it concerns. The category SHALL be `structure` for problems with the document's shape (identifiers, node types, property values, references, mark ranges, cycles, reachability) and `site` for problems with the site rules (pages, home page, slugs, menu, links, headings, images, theme). Messages about a page, or about a link to a page, SHALL name the page by its title rather than by its node ID. A document with any error SHALL be considered invalid. Warnings alone SHALL NOT make a document invalid.

#### Scenario: Multiple problems reported together
- **WHEN** a document has a duplicate slug and an image without alt text
- **THEN** validation returns both errors in one result

#### Scenario: Warnings only
- **WHEN** a document's only problem is an unreachable node
- **THEN** the document is considered valid and the warning is returned

#### Scenario: Problem categories
- **WHEN** a document has a dangling reference and an empty subheading
- **THEN** the dangling reference is reported with category `structure` and the empty subheading with category `site`

#### Scenario: Readable page problem
- **WHEN** two pages titled "Kontakt" and "Contact us" both have slug `kontakt`
- **THEN** the duplicate-slug message names "Kontakt" and "Contact us", not their node IDs

#### Scenario: Link to a deleted page
- **WHEN** a paragraph's link references a page that is no longer in the site
- **THEN** validation reports a missing-page error with category `site`, saying the link points to a page that no longer exists

## ADDED Requirements

### Requirement: Upgrading version-1 documents
A version-1 document SHALL be upgradable to version 2 without losing content. The upgrade SHALL set the home page ID to the first page in the list, give that page a slug made from its title (or `home` when the title gives none), made unique with a numeric suffix when another page uses it, and set the schema version to 2. Upgrading a version-2 document SHALL return it unchanged.

#### Scenario: Upgrade a two-page site
- **WHEN** a version-1 document with pages "Úvod" (slug empty) and "Kontakt" (slug `kontakt`) is upgraded
- **THEN** the result has schema version 2, home page ID pointing at "Úvod", "Úvod" has slug `uvod`, and all other nodes are unchanged

#### Scenario: Title slug is taken
- **WHEN** a version-1 document's first page is titled "Kontakt" and another page already has slug `kontakt`
- **THEN** the first page gets slug `kontakt-2`

#### Scenario: Already upgraded
- **WHEN** a version-2 document is upgraded
- **THEN** the same document is returned
