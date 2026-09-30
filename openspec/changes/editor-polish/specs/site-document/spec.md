# Spec Delta

## MODIFIED Requirements

### Requirement: Validation result
Validation SHALL return all problems found, not only the first. Each problem SHALL have a severity (`error` or `warning`), a category, a machine-readable code, a human-readable message, and the ID of the node (and property, when applicable) it concerns. The category SHALL be `structure` for problems with the document's shape (identifiers, node types, property values, references, mark ranges, cycles, reachability) and `site` for problems with the site rules (pages, home page, slugs, menu, links, headings, images, theme). Messages about a page, or about a link to a page, SHALL name the page by its title rather than by its node ID. Messages of `site` problems about pages, links, images, headings and blocks SHALL NOT contain node IDs or internal property names; a problem about an image or a link SHALL say which page it is on, by title. A document with any error SHALL be considered invalid. Warnings alone SHALL NOT make a document invalid.

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

#### Scenario: Image without a description
- **WHEN** an image on the page "Galerie" has no alt text and is not decorative
- **THEN** the message says that an image on "Galerie" needs a description (alt text) or must be marked decorative, and contains no node ID

#### Scenario: Button without a label
- **WHEN** the call to action of the hero on the page "Úvod" has an empty label
- **THEN** the message says that a button on "Úvod" needs a label, and contains no node ID

#### Scenario: Owners' words
- **WHEN** a document has an invalid slug, a level 3 subheading before any level 2 heading, an image without a description, and a link without a label
- **THEN** none of the messages contains a node ID, the word "slug", or an internal property name such as `seo_description`, `page_id`, `href` or `src` (the words the editor shows owners, such as "alt text" and "label", are fine)
