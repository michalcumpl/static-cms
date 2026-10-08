## ADDED Requirements

### Requirement: Image focal point
Every `image` node SHALL carry a focal point: a horizontal and a vertical position, each a whole number from 0 to 100, as percentages of the image's width and height from its top left corner. Both SHALL default to 50, the centre. The focal point SHALL belong to this use of the image, not to the image in the library. Validation SHALL report a position outside 0 to 100 as an `invalid-focal-point` error, and a position that isn't a whole number as an `invalid-value` error, as for every whole-number property.

#### Scenario: Face in the upper third
- **WHEN** a person's portrait has the focal point 40, 30
- **THEN** the document is valid with no problems

#### Scenario: Out of range
- **WHEN** an image's horizontal position is 120
- **THEN** validation reports `invalid-focal-point` for that image

#### Scenario: Not a whole number
- **WHEN** an image's vertical position is 12.5
- **THEN** validation reports `invalid-value` for that image

#### Scenario: Same image, two framings
- **WHEN** the same media key is used in a hero with the focal point 50, 80 and in a card with 20, 50
- **THEN** each use keeps its own focal point

### Requirement: Upgrading version-11 documents
A version-11 document SHALL be upgradable to version 12 without changing what its pages show. The upgrade SHALL give every `image` node the focal point 50, 50 and set the schema version to 12. Stored documents SHALL be upgraded when read and stored at their next save, as for earlier versions.

#### Scenario: Upgrade the bakery
- **WHEN** the version-11 demo site is upgraded
- **THEN** every image has the focal point 50, 50, the schema version is 12, and every page renders exactly as before

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`12`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon, a default share image and a logo, each a list of at most one `image` node;
- a switch "show the site name in the header", `true` or `false`;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme, a reference to the navigation, and a reference to the business details;
- the five collections (services, team, testimonials, FAQs, projects), each an ordered list of items, and the list of project categories;
- the listing pages of services and of projects, each a page ID or none (see "Item pages");
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
- **WHEN** a document has schema version 11
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

#### Scenario: Two logos
- **WHEN** the site's logo list holds two image nodes
- **THEN** validation reports a too-many-items error
