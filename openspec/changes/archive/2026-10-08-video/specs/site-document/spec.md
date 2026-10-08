## ADDED Requirements

### Requirement: Videos
A `videos` block SHALL have an optional heading and an ordered list of one to twelve videos. A video SHALL have:
- an address of a YouTube or Vimeo video: `https://www.youtube.com/watch?v=<id>`, `https://youtu.be/<id>`, `https://www.youtube.com/shorts/<id>`, `https://www.youtube.com/embed/<id>`, `https://vimeo.com/<id>` or `https://player.vimeo.com/video/<id>` (with or without `www.`, extra query parameters ignored);
- a non-empty title (one line, no formatting), which names the video for people who can't see it;
- an optional caption (one line);
- at most one poster image.

These cases SHALL be reported as errors naming the page and the video's position ("Video 2 on Filmy"): an empty address, an address that isn't a YouTube or Vimeo video, an empty title, no videos or more than twelve.

A project's video address that isn't a YouTube or Vimeo video SHALL be reported as a warning, since its page shows it as a link instead of a player.

#### Scenario: Films from YouTube
- **WHEN** the page "Filmy" has a videos block with three videos, each with a `youtu.be` or `youtube.com/watch` address and a title, one with a poster
- **THEN** the document is valid

#### Scenario: Address that isn't a video
- **WHEN** the second video on "Filmy" has the address `https://www.youtube.com/@anideti`
- **THEN** validation reports an unsupported-video error for video 2 on "Filmy"

#### Scenario: Video without a title
- **WHEN** a video has a Vimeo address and an empty title
- **THEN** validation reports an empty-title error for that video

#### Scenario: Trailer somewhere else
- **WHEN** a project's video address is `https://www.csfd.cz/film/123/`
- **THEN** validation reports a warning that the project's page shows the video as a link, and the document stays valid

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
- `videos`: an optional heading and an ordered list of one to twelve videos (see "Videos").

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

#### Scenario: Videos block
- **WHEN** a page has a `videos` block with one video, with a YouTube address and a title
- **THEN** the document is valid

