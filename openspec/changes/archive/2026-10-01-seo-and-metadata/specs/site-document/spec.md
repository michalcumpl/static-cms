# Spec Delta

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`3`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon and a default share image, each a list of at most one `image` node;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme and a reference to the navigation;
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
- **WHEN** a document has schema version 2
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Image accessibility
Every `image` node SHALL either have non-empty alt text or be explicitly marked decorative. Two kinds of image are exempt: the image of a logo item, whose alt text is the partner's name, and the site's favicon, which is never shown as an image on a page. An image marked decorative SHALL have empty alt text.

#### Scenario: Missing alt text
- **WHEN** an image has empty alt text and is not marked decorative
- **THEN** validation reports an error asking for a description or the decorative flag

#### Scenario: Decorative image
- **WHEN** an image is marked decorative with empty alt text
- **THEN** the document is valid

#### Scenario: Gallery photo without description
- **WHEN** a gallery item's image has empty alt text and is not decorative
- **THEN** validation reports a missing-alt error for that image

#### Scenario: Logo described by its name
- **WHEN** a logo item named "Nadace Harmonie" has an image with empty alt text that is not marked decorative
- **THEN** the document is valid

#### Scenario: Favicon without description
- **WHEN** the site's favicon image has empty alt text and is not marked decorative
- **THEN** the document is valid

#### Scenario: Share image without description
- **WHEN** a page's share image has empty alt text and is not marked decorative
- **THEN** validation reports a missing-alt error saying that the share image of that page needs a description

### Requirement: Upgrading version-1 documents
A version-1 document SHALL be upgradable to the current version without losing content. The upgrade SHALL:
- set the home page ID to the first page in the list;
- give that page a slug made from its title (or `home` when the title gives none), made unique with a numeric suffix when another page uses it;
- then upgrade the result as a version-2 document.

Upgrading a document of the current version SHALL return it unchanged.

#### Scenario: Upgrade a two-page site
- **WHEN** a version-1 document with pages "Úvod" (slug empty) and "Kontakt" (slug `kontakt`) is upgraded
- **THEN** the result has schema version 3, the home page ID points at "Úvod", and "Úvod" has slug `uvod`
- **AND** its other content is unchanged apart from the fields the upgrade of version-2 documents adds

#### Scenario: Title slug is taken
- **WHEN** a version-1 document's first page is titled "Kontakt" and another page already has slug `kontakt`
- **THEN** the first page gets slug `kontakt-2`

#### Scenario: Already upgraded
- **WHEN** a version-3 document is upgraded
- **THEN** the same document is returned

## ADDED Requirements

### Requirement: Upgrading version-2 documents
A version-2 document SHALL be upgradable to version 3 without losing content. The upgrade SHALL add to the site:
- an empty description;
- no favicon and no default share image;
- AI search and AI training both allowed.

It SHALL give every page no share image, and set the schema version to 3.

#### Scenario: Upgrade a version-2 site
- **WHEN** a version-2 document with pages "Úvod" and "Kontakt" is upgraded
- **THEN** the result has schema version 3, an empty site description, empty favicon and share image lists, both AI switches on, and each page has an empty share image list
- **AND** every other node and property is unchanged

### Requirement: Share images
Every page SHALL have a share image: a list of at most one `image` node, used when the page is shared as a link. When a page has none, the site's default share image SHALL be used. A share image narrower than 600 pixels SHALL be reported as a warning, because link previews show it blurred.

#### Scenario: Small share image
- **WHEN** the page "Kontakt" has a share image 400 pixels wide
- **THEN** validation reports a warning that the share image of "Kontakt" is too small for link previews

#### Scenario: Two share images
- **WHEN** a page's share image list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Favicon size
A favicon image whose longer side is under 180 pixels (the whole image is fitted into the square icons) SHALL be reported as a warning, because the icon for phones' home screens would be blurred.

#### Scenario: Small favicon
- **WHEN** the site's favicon image is 64 × 64 pixels
- **THEN** validation reports a warning that the favicon is too small

### Requirement: Description for search engines
A page with an empty description, on a site with an empty description, SHALL be reported as a warning naming the page by its title. A page without its own description, on a site with a description, SHALL NOT be reported.

#### Scenario: No description anywhere
- **WHEN** the page "Kontakt" has an empty description and so does the site
- **THEN** validation reports a warning that "Kontakt" has no description for search engines and link previews

#### Scenario: Site description as fallback
- **WHEN** the page "Kontakt" has an empty description and the site's description is "Rodinná školka v Brně"
- **THEN** validation reports no description warning
