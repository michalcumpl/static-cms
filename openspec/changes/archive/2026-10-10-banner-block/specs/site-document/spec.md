# Spec Delta

## ADDED Requirements

### Requirement: Banner
A `banner` block SHALL hold:
- a heading (one line);
- a text (one line, with bold and italic marks, may be empty);
- at most one image;
- at most one button, an internal or external link like the hero's.

A page MAY hold any number of banners, at any place. Like every page block, a banner SHALL be
hideable.

Validation SHALL report:
- an empty heading (`empty-heading`, error);
- more than one image or more than one button (`too-many-items`, error);
- an image without a description that isn't decorative (`missing-alt`, as for every image).

A banner's heading SHALL count as a main subheading for the page's subheading levels, as the
headings of other blocks do.

#### Scenario: A banner between two blocks
- **WHEN** the home page holds, after a cards block, a banner headed "Last minute" with the text
  "Odlety z Brna", a described photo and a button to the page "Zájezdy"
- **THEN** the document is valid with no problems

#### Scenario: Banner without a heading
- **WHEN** a banner's heading is empty
- **THEN** validation reports `empty-heading` naming the banner

#### Scenario: A smaller subheading after a banner
- **WHEN** a page without a hero has a banner and then a text block whose first subheading is at
  level 3
- **THEN** validation reports no `heading-skip`
