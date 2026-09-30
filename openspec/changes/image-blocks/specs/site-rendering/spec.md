# Spec Delta

## MODIFIED Requirements

### Requirement: Heading hierarchy
Each page SHALL contain exactly one `<h1>`. When the first block is a `hero`, the hero heading SHALL be the `<h1>`; otherwise the page title SHALL render as an `<h1>` at the start of `<main>`. Block headings (the heading of `services`, `text_with_image`, `gallery`, `team` and `logos` blocks, and `rich_text` subheadings) SHALL render at level 2 or 3, never skipping a level. A person's name SHALL render as an `<h3>` when its team has a heading, and as an `<h2>` otherwise.

#### Scenario: Page with hero
- **WHEN** a page's first block is a hero with heading "Welcome"
- **THEN** the page's only `<h1>` is "Welcome"

#### Scenario: Page without hero
- **WHEN** a page titled "Services" starts with a `services` block
- **THEN** the page has `<h1>Services</h1>` followed by the block, whose heading is an `<h2>`

#### Scenario: Team names
- **WHEN** a team block with heading "Kdo jsme" has people "Kateřina" and "Martina"
- **THEN** "Kdo jsme" renders as an `<h2>` and the two names as `<h3>` elements

#### Scenario: Team without a heading
- **WHEN** a team block without a heading has a person "Kateřina"
- **THEN** "Kateřina" renders as an `<h2>`

### Requirement: Block rendering
Blocks SHALL render in document order as semantic HTML:
- `hero` as a `<section>` containing its heading, text, image and call-to-action link.
- `rich_text` as a `<section>` containing `<p>`, `<h2>`/`<h3>` and `<ul><li>` elements. Bold, italic and link marks render as `<strong>`, `<em>` and `<a>`.
- `services` as a `<section>` with an optional heading and a `<ul>` of service items, each with its name, description and price when present.
- `text_with_image` as a `<section>` with its heading, its paragraphs and lists, and its image, carrying a class that names the image side (`image-left` or `image-right`).
- `gallery` as a `<section>` with an optional heading and a `<ul>` of photos, each a `<figure>` holding a link to the photo's largest variant around its image, and a `<figcaption>` when it has a caption.
- `team` as a `<section>` with an optional heading and a `<ul>` of people, each with the portrait (when present), the name, the role and the text (when present).
- `logos` as a `<section>` with an optional heading and a `<ul>` of logos, each an image whose alt text is the partner's name, wrapped in a link when the logo has one.

Each block's root element SHALL carry a class naming its block type, for styling. Optional texts that are empty SHALL NOT produce empty elements.

#### Scenario: Marked text
- **WHEN** a paragraph "Call us today" has bold on offsets 0–7
- **THEN** it renders as `<p><strong>Call us</strong> today</p>`

#### Scenario: Services without price
- **WHEN** a service item has no price text
- **THEN** its rendered item contains no empty price element

#### Scenario: Image on the left
- **WHEN** rendering a `text_with_image` block whose image side is `left`
- **THEN** its section carries the classes `text-with-image` and `image-left`

#### Scenario: Gallery photo enlarges
- **WHEN** rendering a gallery item whose image has media key `dilna-1a2b3c4d` and width 3000, at the default base path
- **THEN** the image is wrapped in `<a href="/assets/images/dilna-1a2b3c4d-2400.webp">`

#### Scenario: Logo alt text and link
- **WHEN** rendering a logo item named "Nadace Harmonie" with a link to `https://harmonie.example`
- **THEN** it renders an `<a href="https://harmonie.example">` around an `<img>` with `alt="Nadace Harmonie"`

## ADDED Requirements

### Requirement: Image sizes per block
Each block SHALL give its images a fixed `sizes` value and a loading behaviour:
- hero: `(min-width: 48rem) 40vw, 100vw`, loaded eagerly;
- text with image: `(min-width: 48rem) 50vw, 100vw`, lazy;
- gallery: `(min-width: 48rem) 33vw, 50vw`, lazy;
- team portrait: `10rem`, lazy;
- logo: `12rem`, lazy.

The stylesheet SHALL crop gallery photos to 4:3 and portraits to a circle (1:1), without changing the image files, and SHALL limit logos to at most 4rem in height.

#### Scenario: Gallery image
- **WHEN** rendering a gallery photo
- **THEN** its `<img>` has `sizes="(min-width: 48rem) 33vw, 50vw"` and `loading="lazy"`
