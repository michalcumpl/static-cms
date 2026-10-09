# Spec Delta

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`13`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon, a default share image and a logo, each a list of at most one `image` node;
- a switch "show the site name in the header", `true` or `false`;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme, a reference to the navigation, and a reference to the business details;
- the ID of its template and the template release it was last upgraded to (see "Site template");
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
- **WHEN** a document has schema version 12
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

#### Scenario: Two logos
- **WHEN** the site's logo list holds two image nodes
- **THEN** validation reports a too-many-items error

## ADDED Requirements

### Requirement: Site template
The site's template ID SHALL name a template of the registry (see the templates capability), and
its template release SHALL be a positive whole number no greater than that template's current
release. Validation SHALL report:
- an unknown-template error when no template has the ID;
- an unknown-template-release error when the release is newer than the template's current one,
  as happens when a document comes from newer code.

An older release SHALL NOT be a problem: upgrading brings it to the current release (see
"Template releases" in the templates capability).

#### Scenario: Standard at release 1
- **WHEN** a site's template is `standard` with release 1, and Standard's current release is 1
- **THEN** the document is valid

#### Scenario: Unknown template
- **WHEN** a site's template is `bakery`
- **THEN** validation reports an unknown-template error on the site node

#### Scenario: Release from the future
- **WHEN** a site records Standard release 4 and the current release is 2
- **THEN** validation reports an unknown-template-release error

### Requirement: Hidden blocks
Every block SHALL have a switch "hidden", `false` by default. A hidden block SHALL stay in its
page with all its content and be validated as any other block, but SHALL NOT be shown on the
website (see "Hidden blocks" in the site-rendering capability). A hero SHALL stay the first block
of its page while hidden.

A page whose blocks are all hidden, or that has no blocks, SHALL be reported as a warning naming
the page by its title, because it shows only its title.

#### Scenario: Hidden testimonials
- **WHEN** a home page has a testimonials block with hidden on
- **THEN** the document is valid and the block keeps its heading and its choice of testimonials

#### Scenario: Everything hidden
- **WHEN** every block of the page "Ceník" is hidden
- **THEN** validation reports a warning that "Ceník" shows nothing but its title

#### Scenario: Hidden hero not first
- **WHEN** a page's blocks are `rich_text_1` and a hidden `hero_1`
- **THEN** validation reports that the hero must be the first block

### Requirement: Upgrading version-12 documents
A version-12 document SHALL be upgradable to version 13 without changing what its pages show. The
upgrade SHALL give the site the template `standard` with release 1, give every block hidden
`false`, and set the schema version to 13. Stored documents SHALL be upgraded when read and stored
at their next save, as for earlier versions.

#### Scenario: Upgrade the bakery
- **WHEN** the version-12 demo site is upgraded
- **THEN** its template is `standard` at release 1, no block is hidden, the schema version is 13,
  and every page renders exactly as before
