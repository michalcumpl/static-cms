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
- `contact`: an optional heading and four switches, for showing the address, the phone, the email and the map link. It shows the site's business details and holds none of its own.
- `opening_hours`: an optional heading. It shows the site's opening hours and holds none of its own.
- `call_to_action`: a heading, an optional text, and an ordered list of one or two buttons, each a link to a page of the site or an external link.
- `testimonials`: an optional heading and an ordered list of testimonials, each with a quote, the person's name, an optional detail (such as how long they've been a customer), and an optional photo.

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

#### Scenario: Business blocks
- **WHEN** a page has a `contact` block and an `opening_hours` block, and the site has an address, a phone and opening hours
- **THEN** the document is valid

#### Scenario: Call to action and testimonials
- **WHEN** a page has a `call_to_action` with a heading and two buttons, and a `testimonials` block with two testimonials with quotes and names, one of them with a photo
- **THEN** the document is valid

## ADDED Requirements

### Requirement: Call to action and testimonial contents
- A `call_to_action` block SHALL have a non-empty heading and at most two buttons; a block without buttons SHALL be reported as a warning.
- Its buttons SHALL follow the rules of other links: a label, an existing page or an address allowed by the link safety rule.
- Every testimonial SHALL have a non-empty quote and a non-empty name, and at most one photo.
- A photo SHALL follow the image accessibility rule.
- A `testimonials` block without testimonials SHALL be reported as a warning.

Messages SHALL name the page, as other block messages do.

#### Scenario: Call to action without a heading
- **WHEN** the call to action on "Úvod" has an empty heading
- **THEN** validation reports an empty-heading error that names "Úvod"

#### Scenario: Three buttons
- **WHEN** a call to action has three buttons
- **THEN** validation reports a too-many-items error

#### Scenario: Call to action without buttons
- **WHEN** a call to action has no buttons
- **THEN** validation reports an empty-block warning, and the document stays valid

#### Scenario: Testimonial without a quote
- **WHEN** a testimonial on "Úvod" has an empty quote
- **THEN** validation reports an error that a testimonial on "Úvod" needs its quote

#### Scenario: Button to a removed page
- **WHEN** a call to action's button links to `page_gone`, which is not a page of the site
- **THEN** validation reports a missing-page error saying a button on that page points to a page that no longer exists
