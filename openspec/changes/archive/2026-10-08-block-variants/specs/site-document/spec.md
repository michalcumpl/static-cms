## ADDED Requirements

### Requirement: Block variants
Four blocks SHALL carry a choice of how they look, with today's look as the default:
- a `hero` block's `layout`: `beside` (the text next to the image) or `cover` (the image fills the block, the text over it);
- a `services` block's `layout`: `cards`, `list` or `accordion`;
- a `team` block's `layout`: `cards` or `list` (without portraits);
- a `gallery` block's `image_fit`: `fill` (images cropped to one shape) or `whole` (each image shown complete).

Any other value SHALL be reported as an error. A hero with the layout `cover` and no image SHALL be reported as a warning, since it shows as `beside` until it has one. The choices SHALL NOT change what a block holds: a team in the `list` layout keeps its portraits, which show again in `cards`.

#### Scenario: Full-photo hero
- **WHEN** the home page's hero has the layout `cover` and an image
- **THEN** the document is valid

#### Scenario: Full-photo hero without a photo
- **WHEN** a hero has the layout `cover` and no image
- **THEN** validation reports a cover-without-image warning, and the document stays valid

#### Scenario: Unknown layout
- **WHEN** a services block has the layout `grid`
- **THEN** validation reports an invalid-value error for that block

### Requirement: Upgrading version-8 documents
A version-8 document SHALL be upgradable to version 9 without changing what its pages show. The upgrade SHALL give every `hero` the layout `beside`, every `services` and `team` block the layout `cards`, and every `gallery` the image fit `fill`, and set the schema version to 9. Stored documents SHALL be upgraded when read and stored at their next save, as for earlier versions.

#### Scenario: Upgrade the bakery
- **WHEN** the version-8 demo site, with a hero and a services block on its home page, is upgraded
- **THEN** the hero has the layout `beside`, the services block `cards`, the schema version is 9, and every page renders exactly as before

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`9`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon, a default share image and a logo, each a list of at most one `image` node;
- a switch "show the site name in the header", `true` or `false`;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme, a reference to the navigation, and a reference to the business details;
- the four collections (services, team, testimonials, FAQs), each an ordered list of items;
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
- **WHEN** a document has schema version 8
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

#### Scenario: Two logos
- **WHEN** the site's logo list holds two image nodes
- **THEN** validation reports a too-many-items error
