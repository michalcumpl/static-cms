# Spec Delta

## MODIFIED Requirements

### Requirement: Content blocks
Pages SHALL support exactly these block types:
- `hero`: a heading, optional supporting text, an optional image, and an optional call-to-action (label and link).
- `rich_text`: an ordered list of paragraphs, subheadings (level 2 or 3) and bulleted lists. Text supports bold, italic and link marks.
- `services`: an optional heading and an ordered list of service items, each with a name, a description and an optional price text.
- `text_with_image`: an optional heading, an ordered list of paragraphs and bulleted lists (text supports bold, italic and link marks), an optional image, and the side the image is on (`left` or `right`, default `right`).
- `gallery`: an optional heading and an ordered list of gallery items, each with an image and an optional caption.
- `team`: an optional heading and an ordered list of people, each with a name, an optional role, an optional short text, and an optional portrait image.
- `logos`: an optional heading and an ordered list of logo items, each with an image, the partner's name, and an optional link to a page of the site or an external URL.

#### Scenario: Block content with marks
- **WHEN** a `rich_text` paragraph has text `Call us today` with a bold mark on offsets 0–7
- **THEN** the document is valid

#### Scenario: Mark out of range
- **WHEN** a mark's end offset exceeds the length of its text
- **THEN** validation reports an error for that property

#### Scenario: Image blocks
- **WHEN** a page's blocks are a `text_with_image` with one image on the left, a `gallery` with three photos, a `team` with two people, and a `logos` block with two logos, all with the required texts filled in
- **THEN** the document is valid

#### Scenario: Unknown image side
- **WHEN** a `text_with_image` block's image side is `top`
- **THEN** validation reports an invalid-value error for that block

### Requirement: Image accessibility
Every `image` node SHALL either have non-empty alt text or be explicitly marked decorative, except the image of a logo item, whose alt text is the partner's name. An image marked decorative SHALL have empty alt text.

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

## ADDED Requirements

### Requirement: Image block contents
Each gallery item and each logo item SHALL have exactly one image; a `text_with_image` block and a person SHALL have at most one. Every person and every logo item SHALL have a non-empty name. A `gallery`, `team` or `logos` block without any items SHALL be reported as a warning. A logo item's link SHALL be either a page of the site or a URL allowed by the link safety rule, and not both.

#### Scenario: Person without a name
- **WHEN** a person in a team has an empty name
- **THEN** validation reports an empty-name error for that person

#### Scenario: Logo without a name
- **WHEN** a logo item has an empty name
- **THEN** validation reports an empty-name error for that logo item, because the name is its image's description

#### Scenario: Empty gallery
- **WHEN** a gallery has no items
- **THEN** validation reports an empty-block warning, and the document stays valid

#### Scenario: Gallery item without an image
- **WHEN** a gallery item's image list is empty
- **THEN** validation reports an error that the item needs an image

#### Scenario: Logo linked to a removed page
- **WHEN** a logo item links to `page_gone`, which is not a page of the site
- **THEN** validation reports a missing-page error for that logo item

#### Scenario: Unsafe logo link
- **WHEN** a logo item's URL is `javascript:alert(1)`
- **THEN** validation reports an unsafe-link error for that logo item
