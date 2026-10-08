## ADDED Requirements

### Requirement: Key figures and steps contents
- A `figure` SHALL have a non-empty value and a non-empty label. A value longer than 24 characters SHALL be reported as a warning, since figures are meant to be read at a glance.
- A `figures` block SHALL hold at most six figures; a block without figures SHALL be reported as a warning.
- A `steps` block SHALL have a non-empty heading, since its steps' titles are the headings under it. Each `step` SHALL have a non-empty title; its text is optional. A block without steps SHALL be reported as a warning.

Messages SHALL name the page and the item's position, as other block messages do ("Figure 2 on "Úvod" needs its label.").

#### Scenario: Valid figures and steps
- **WHEN** the home page has a figures block with three figures, each with a value and a label, and a steps block with a heading and three steps with titles
- **THEN** the document is valid

#### Scenario: Figure without a label
- **WHEN** the second figure on "Úvod" has the value "40+" and an empty label
- **THEN** validation reports an empty-label error for figure 2 that names "Úvod"

#### Scenario: Seven figures
- **WHEN** a figures block has seven figures
- **THEN** validation reports a too-many-items error

#### Scenario: Long value
- **WHEN** a figure's value is "více než tři sta milionů korun českých"
- **THEN** validation reports a long-figure warning, and the document stays valid

#### Scenario: Steps without a heading
- **WHEN** the steps block on "Služby" has an empty heading
- **THEN** validation reports an empty-heading error that names "Služby"

## MODIFIED Requirements

### Requirement: Content blocks
Pages SHALL support exactly these block types:
- `hero`: a heading, optional supporting text, an optional image, and an optional call-to-action (label and link).
- `rich_text`: an ordered list of paragraphs, subheadings (level 2 or 3) and bulleted lists. Text supports bold, italic and link marks.
- `services`: shows the site's services (see "Collection blocks").
- `text_with_image`: an optional heading, an ordered list of paragraphs and bulleted lists (text supports bold, italic and link marks), an optional image, and the side the image is on (`left` or `right`, default `right`).
- `gallery`: an optional heading and an ordered list of gallery items, each with an image and an optional caption.
- `team`: shows the site's team (see "Collection blocks").
- `logos`: an optional heading and an ordered list of logo items, each with an image, the partner's name, and an optional link to a page of the site or an external URL.
- `contact`: an optional heading and four switches, for showing the address, the phone, the email and the map link. It shows the site's business details and holds none of its own.
- `opening_hours`: an optional heading. It shows the site's opening hours and holds none of its own.
- `call_to_action`: a heading, an optional text, and an ordered list of one or two buttons, each a link to a page of the site or an external link.
- `testimonials`: shows the site's testimonials (see "Collection blocks").
- `faq`: shows the site's FAQs (see "Collection blocks").
- `figures`: an optional heading and an ordered list of one to six figures, each a short value and a label (see "Key figures and steps contents").
- `steps`: a heading and an ordered list of steps, each a title and an optional text that supports bold, italic and link marks.

#### Scenario: Block content with marks
- **WHEN** a `rich_text` paragraph has text `Call us today` with a bold mark on offsets 0–7
- **THEN** the document is valid

#### Scenario: Mark out of range
- **WHEN** a mark's end offset exceeds the length of its text
- **THEN** validation reports an error for that property

#### Scenario: Image blocks
- **WHEN** a page's blocks are a `text_with_image` with one image on the left, a `gallery` with three photos, a `team` block showing a team of two people, and a `logos` block with two logos, all with the required texts filled in
- **THEN** the document is valid

#### Scenario: Unknown image side
- **WHEN** a `text_with_image` block's image side is `top`
- **THEN** validation reports an invalid-value error for that block

#### Scenario: Business blocks
- **WHEN** a page has a `contact` block and an `opening_hours` block, and the site has an address, a phone and opening hours
- **THEN** the document is valid

#### Scenario: Call to action and testimonials
- **WHEN** a page has a `call_to_action` with a heading and two buttons, and a `testimonials` block showing two testimonials with quotes and names, one of them with a photo
- **THEN** the document is valid

#### Scenario: FAQ block
- **WHEN** a page has an `faq` block in the `all` mode and the site has two FAQ items with questions and answers
- **THEN** the document is valid
