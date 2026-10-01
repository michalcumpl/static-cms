# Spec Delta

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`5`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon and a default share image, each a list of at most one `image` node;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme, a reference to the navigation, and a reference to the business details;
- an ordered list of pages;
- the ID of the home page.

The home page ID SHALL name a page in the site's list of pages. The position of a page in the list SHALL NOT determine which page is home.

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
- **WHEN** a document has schema version 4
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Upgrading version-1 documents
A version-1 document SHALL be upgradable to the current version without losing content. The upgrade SHALL:
- set the home page ID to the first page in the list;
- give that page a slug made from its title (or `home` when the title gives none), made unique with a numeric suffix when another page uses it;
- then upgrade the result as a version-2 document.

Upgrading a document of the current version SHALL return it unchanged.

#### Scenario: Upgrade a two-page site
- **WHEN** a version-1 document with pages "Úvod" (slug empty) and "Kontakt" (slug `kontakt`) is upgraded
- **THEN** the result has schema version 5, the home page ID points at "Úvod", and "Úvod" has slug `uvod`
- **AND** its other content is unchanged apart from the fields and nodes the later upgrades add

#### Scenario: Title slug is taken
- **WHEN** a version-1 document's first page is titled "Kontakt" and another page already has slug `kontakt`
- **THEN** the first page gets slug `kontakt-2`

#### Scenario: Already upgraded
- **WHEN** a version-5 document is upgraded
- **THEN** the same document is returned

### Requirement: Upgrading version-2 documents
A version-2 document SHALL be upgradable to the current version without losing content. The upgrade SHALL add to the site:
- an empty description;
- no favicon and no default share image;
- AI search and AI training both allowed.

It SHALL give every page no share image, and then upgrade the result as a version-3 document.

#### Scenario: Upgrade a version-2 site
- **WHEN** a version-2 document with pages "Úvod" and "Kontakt" is upgraded
- **THEN** the result has schema version 5, an empty site description, empty favicon and share image lists, both AI switches on, and each page has an empty share image list
- **AND** every other node and property is unchanged apart from the business details and translation keys the later upgrades add

### Requirement: Upgrading version-3 documents
A version-3 document SHALL be upgradable to the current version without losing content. The upgrade SHALL add:
- a `business` node with every field empty except the country (`CZ`), the type `LocalBusiness` and the footer switch on;
- seven closed `opening_day` nodes;
- the site's reference to the business node.

It SHALL then upgrade the result as a version-4 document. New node IDs SHALL NOT collide with existing ones.

#### Scenario: Upgrade a version-3 site
- **WHEN** a version-3 document is upgraded
- **THEN** the result has schema version 5, and its site references a business node with empty details, the country `CZ`, the type `LocalBusiness`, the footer switch on, and seven days from Monday to Sunday without ranges
- **AND** every other node and property is unchanged apart from the pages' translation keys

## ADDED Requirements

### Requirement: Page translation keys
Every page SHALL have a translation key: a non-empty identifier that pairs it with its counterparts in the project's other languages. Pages with the same translation key in two languages SHALL be treated as the same page in those languages. Within one document, no two pages SHALL share a translation key; a duplicate SHALL be reported as an error naming both pages.

#### Scenario: Duplicate key
- **WHEN** the pages "Kontakt" and "Napište nám" of one document have the same translation key
- **THEN** validation reports a duplicate-translation-key error naming both pages

#### Scenario: Empty key
- **WHEN** a page's translation key is empty
- **THEN** validation reports an invalid-value error for that page

### Requirement: Upgrading version-4 documents
A version-4 document SHALL be upgradable to version 5 without losing content. The upgrade SHALL give every page its own node ID as its translation key, and set the schema version to 5.

#### Scenario: Upgrade a version-4 site
- **WHEN** a version-4 document with pages `page_home` and `page_contact` is upgraded
- **THEN** the result has schema version 5, `page_home` has the translation key `page_home` and `page_contact` has `page_contact`
- **AND** every other node and property is unchanged
