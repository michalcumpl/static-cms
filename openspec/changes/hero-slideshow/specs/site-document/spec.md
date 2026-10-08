## ADDED Requirements

### Requirement: Hero slides
A `hero` block SHALL have an ordered list of slides, empty by default. A slide SHALL have at most one image, a title (one line, no formatting), a clip address, empty or the `https` address of an MP4 file on Vimeo (`player.vimeo.com/progressive_redirect/…`, `player.vimeo.com/external/…mp4` or `*.vimeocdn.com/…mp4`), and at most one link target: a page of the site, a service or project with its own page, or an outside address, checked as a card's link is (see "Cards").

While the hero's look is `slideshow`, these cases SHALL be reported, naming the page and the slide's position ("Slide 2 on Úvod"):
- fewer than two slides, as a warning: the hero then shows as `cover` with its own image (or as `beside` without one);
- more than eight slides, as an error;
- a slide without an image, or without a title, as an error;
- a link that leads nowhere, as a warning, and an unsafe address, as an error;
- a clip address that isn't a Vimeo MP4 file, as an error.

In the other looks the slides SHALL be kept and not checked, so switching back and forth loses nothing.

#### Scenario: Latest work
- **WHEN** the home page's hero has the look `slideshow` and six slides, each with a described image, a title and a link to a project with its own page
- **THEN** the document is valid

#### Scenario: One slide
- **WHEN** a hero in the `slideshow` look has one slide
- **THEN** validation reports a warning that the slideshow needs at least two slides and shows as a full photo, and the document stays valid

#### Scenario: Slide without a photo
- **WHEN** slide 3 of the slideshow on "Úvod" has no image
- **THEN** validation reports a missing-image error for slide 3 on "Úvod"

#### Scenario: Clip that isn't a Vimeo file
- **WHEN** slide 2 on "Úvod" has the clip address `https://www.youtube.com/watch?v=wNdrFte2T4w`
- **THEN** validation reports an unsupported-clip error for slide 2 on "Úvod"

#### Scenario: Slides kept in another look
- **WHEN** a hero with two slides, one without a title, has the look `cover`
- **THEN** no problem is reported about its slides

### Requirement: Upgrading version-10 documents
A version-10 document SHALL be upgradable to version 11 without changing what its pages show. The upgrade SHALL give every `hero` an empty list of slides and set the schema version to 11. Stored documents SHALL be upgraded when read and stored at their next save, as for earlier versions.

#### Scenario: Upgrade the bakery
- **WHEN** the version-10 demo site is upgraded
- **THEN** its hero has no slides, the schema version is 11, and every page renders exactly as before

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`11`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon, a default share image and a logo, each a list of at most one `image` node;
- a switch "show the site name in the header", `true` or `false`;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme, a reference to the navigation, and a reference to the business details;
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
- **WHEN** a document has schema version 10
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

#### Scenario: Two logos
- **WHEN** the site's logo list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Block variants
Four blocks SHALL carry a choice of how they look, with today's look as the default:
- a `hero` block's `layout`: `beside` (the text next to the image), `cover` (the image fills the block, the text over it) or `slideshow` (its slides, one at a time; see "Hero slides");
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
