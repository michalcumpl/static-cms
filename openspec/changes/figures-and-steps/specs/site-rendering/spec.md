## ADDED Requirements

### Requirement: Key figures and steps layout
The site's stylesheet SHALL show figures as a row of large values in the theme's primary colour with their labels beneath, wrapping to two per row on narrow screens, and steps as a numbered sequence whose numbers are drawn from the list's order in the primary colour. Both SHALL pass the site's HTML validation and contrast rules like other blocks.

#### Scenario: Figures on a phone
- **WHEN** a figures block with four figures is shown 375 pixels wide
- **THEN** the figures show two per row, each value above its label

#### Scenario: Steps markup
- **WHEN** a steps block "Jak to funguje" has three steps
- **THEN** it renders an `<h2>` "Jak to funguje" and an `<ol>` with three items, each with an `<h3>` title

## MODIFIED Requirements

### Requirement: Block rendering
Blocks SHALL render in document order as semantic HTML:
- `hero` as a `<section>` containing its heading, text, image and call-to-action link.
- `rich_text` as a `<section>` containing `<p>`, `<h2>`/`<h3>` and `<ul><li>` elements. Bold, italic and link marks render as `<strong>`, `<em>` and `<a>`.
- `services` as a `<section>` with an optional heading and a `<ul>` of the service items it shows, each with its name, description and price when present.
- `text_with_image` as a `<section>` with its heading, its paragraphs and lists, and its image, carrying a class that names the image side (`image-left` or `image-right`).
- `gallery` as a `<section>` with an optional heading and a `<ul>` of photos, each a `<figure>` holding a link to the photo's largest variant around its image, and a `<figcaption>` when it has a caption.
- `team` as a `<section>` with an optional heading and a `<ul>` of the people it shows, each with the portrait (when present), the name, the role and the text (when present).
- `logos` as a `<section>` with an optional heading and a `<ul>` of logos, each an image whose alt text is the partner's name, wrapped in a link when the logo has one.
- `contact` as a `<section>` with an optional heading and the site's contact details (see "Contact details").
- `opening_hours` as a `<section>` with an optional heading and the site's opening hours (see "Opening hours table").
- `call_to_action` as a `<section>` with its heading, its text when present, and its buttons as links in one paragraph. The first button has the class `button`, and the second the classes `button` and `button-secondary`.
- `testimonials` as a `<section>` with an optional heading and a `<ul>` of the testimonials it shows. Each is a `<figure>` holding a `<blockquote>` with the quote and a `<figcaption>` with the photo (when present, decorative or described), the name and the detail (when present).
- `faq` as a `<section>` with an optional heading and one `<details>` element per question it shows. Each has a `<summary>` with the question and the answer's paragraphs after it. The questions start closed, and opening them needs no JavaScript.
- `figures` as a `<section>` with an optional heading and a `<ul>` of figures, each with its value and its label in separate elements, so templates can show the value large.
- `steps` as a `<section>` with its heading and an `<ol>` of steps, each with its title as an `<h3>` and its text as a paragraph when present. The numbers come from the list's order.

Each block's root element SHALL carry a class naming its block type, for styling. Optional texts that are empty SHALL NOT produce empty elements. A collection block that shows no items SHALL render nothing.

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

#### Scenario: Call to action with two buttons
- **WHEN** rendering a call to action headed "Upečeme vám dort" with buttons "Objednat" (to the page `kontakt`) and "Zavolat" (to `tel:+420321123456`)
- **THEN** its section has `<h2>Upečeme vám dort</h2>`, `<a class="button" href="/kontakt/">Objednat</a>` and `<a class="button button-secondary" href="tel:+420321123456">Zavolat</a>`

#### Scenario: Testimonial
- **WHEN** rendering a testimonial "Nejlepší chleba v Kolíně." by "Jana Nováková", detail "zákaznice od roku 2015", without a photo
- **THEN** it renders as a `<figure>` with `<blockquote><p>Nejlepší chleba v Kolíně.</p></blockquote>` and a `<figcaption>` holding "Jana Nováková" and "zákaznice od roku 2015", and no image

#### Scenario: Question and answer
- **WHEN** rendering an FAQ block headed "Časté dotazy" showing the question "Rozvážíte?" with the answer "Ano, po Kolíně zdarma."
- **THEN** its section has `<h2>Časté dotazy</h2>` and `<details><summary>Rozvážíte?</summary><p>Ano, po Kolíně zdarma.</p></details>`

#### Scenario: Nothing to show
- **WHEN** a team block is in the `all` mode and the team collection is empty
- **THEN** the page contains no element for that block
