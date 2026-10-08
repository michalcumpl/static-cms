## ADDED Requirements

### Requirement: Jobs
A `jobs` block SHALL hold an optional heading (one line), a "no openings" note (text with bold, italic and link marks, may be empty) and an ordered list of zero to twelve `job` items. A job SHALL have:
- a title (one line), required;
- a summary (one line, may be empty);
- a description: an ordered list of paragraphs, subheadings and bulleted lists (text with bold, italic and link marks), may be empty;
- a contact: a name (one line), an email and a phone, each may be empty.

Validation SHALL report a job without a title (`empty-title`, error), a contact email or phone that breaks the business details' rules (`invalid-email`, `invalid-phone`, errors), more than twelve jobs (`too-many-items`, error), and a block with no jobs and an empty note (`no-jobs`, warning: the block isn't shown).

#### Scenario: Two job ads
- **WHEN** a jobs block holds "Zámečník/svářeč" with a summary, a description with two subheadings and lists, and the contact "Matěj Palouš", `+420777294579`; and "Projektant/konstruktér" with the contact email `pavel.boruvka@scenografie.cz`
- **THEN** the document is valid with no problems

#### Scenario: Job without a title
- **WHEN** a job's title is empty
- **THEN** validation reports `empty-title` naming the job ("Job 2 on "Kontakty" needs a title.")

#### Scenario: Not an email
- **WHEN** a job's contact email is `pavel.boruvka`
- **THEN** validation reports `invalid-email`

#### Scenario: No openings
- **WHEN** a jobs block has no jobs and the note "Momentálně nikoho nehledáme."
- **THEN** the document is valid with no problems
- **WHEN** the note is empty too
- **THEN** validation reports a `no-jobs` warning, and the document stays valid

## MODIFIED Requirements

### Requirement: Content blocks
Pages SHALL support exactly these block types:
- `hero`: a heading, optional supporting text, an optional image, an optional call-to-action (label and link), and an ordered list of slides (see "Hero slides").
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
- `jobs`: an optional heading, a "no openings" note, and an ordered list of up to twelve jobs (see "Jobs").

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

#### Scenario: Jobs block
- **WHEN** a page has a `jobs` block with the heading "Volné pozice" and two jobs with titles
- **THEN** the document is valid
