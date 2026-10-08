## ADDED Requirements

### Requirement: Cards
A `cards` block SHALL have an optional heading, a look, `below` (the default: the image, then the title and the text) or `over` (the title over the image, the text under it), and an ordered list of one to twelve cards. A card SHALL have:
- at most one image;
- a non-empty title (one line, no formatting);
- an optional text (bold, italic and links; line breaks allowed);
- at most one link target: a page of the site, a service or project that has its own page (see "Item pages"), or an outside address, which follows "Link safety".

These cases SHALL be reported:
- a card without a title, as an error naming the page and the card's position ("Card 2 on Úvod needs a title");
- more than twelve cards, or none, as an error;
- a link to a page, service or project that no longer exists, or to a service or project whose collection has no listing page, as a warning; the card then renders without its link;
- both a page and an address on one card, as an error.

#### Scenario: Category tiles
- **WHEN** the home page has a `cards` block in the `over` look with four cards, each with a described image, a title and a link to a category page
- **THEN** the document is valid

#### Scenario: Card without a title
- **WHEN** the second card of a cards block on "Úvod" has an empty title
- **THEN** validation reports an empty-title error for card 2 on "Úvod"

#### Scenario: Link to a project without a page
- **WHEN** a card links to a project and the projects have no listing page
- **THEN** validation reports a warning that the card's link leads nowhere, and the document stays valid

#### Scenario: Unsafe address
- **WHEN** a card's address is `javascript:alert(1)`
- **THEN** validation reports an unsafe-link error

#### Scenario: Thirteen cards
- **WHEN** a cards block has thirteen cards
- **THEN** validation reports a too-many-items error for that block

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
- `projects`: shows the site's projects (see "Collection blocks" and "Projects block").
- `cards`: an optional heading, a look, and an ordered list of one to twelve cards (see "Cards").

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

#### Scenario: Cards block
- **WHEN** a page has a `cards` block with three cards, each with a title, one with an image and a link to a page
- **THEN** the document is valid

