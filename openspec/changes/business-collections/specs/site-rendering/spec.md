# Spec Delta

## ADDED Requirements

### Requirement: Collection block rendering
A `services`, `team`, `testimonials` or `faq` block SHALL render the items it shows (see "Collection blocks" in the site-document capability): all items of its collection in collection order, or its chosen items in its own order. An item SHALL render the same way in every block that shows it. Changing an item SHALL change every page that shows it.

#### Scenario: One service on two pages
- **WHEN** the service "Chléb" is shown by the home page's chosen services block and by the "Služby" page's block showing all services, and its price text changes to "45 Kč"
- **THEN** both rendered pages show "45 Kč"

#### Scenario: Chosen order
- **WHEN** a services block in the `chosen` mode references services 3 and 1
- **THEN** its `<ul>` lists service 3 first and then service 1

### Requirement: Social links in the footer
When the business's "show in the footer" switch is on and the business has social profiles, every page's footer (the not-found page included) SHALL list them, in their order, as text links named by their kind ("Instagram", or the host for other addresses), inside a `<nav>` whose accessible name comes from the site's language ("Sociální sítě", "Social media"). The footer SHALL load no icons, scripts or other files from third parties.

#### Scenario: Two profiles
- **WHEN** rendering a page of a Czech site whose business has an Instagram and a Facebook profile, with the switch on
- **THEN** the footer has a `<nav aria-label="Sociální sítě">` with links "Instagram" and "Facebook" to the profiles' addresses

#### Scenario: Switch off
- **WHEN** the business has social profiles and the footer switch is off
- **THEN** the footer has no social links

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

### Requirement: Structured data
When rendering is given the site's address, the home page SHALL contain one `<script type="application/ld+json">` with a schema.org `WebSite` and an organization:
- **`WebSite`** has the site name, the site's address with a trailing slash, the site language, and the site description when there is one.
- **The organization** has the business name (or the site name) and the site's address. When the site has a logo, it also has the absolute URL of the logo's `src` file as its logo; otherwise, when the site has a favicon, `icon-512.png`'s absolute URL.
  - When the business has social profiles, it has their addresses, in order, as `sameAs`.
  - When the site has services, it has an `hasOfferCatalog`: an `OfferCatalog` named after the site's language ("Služby", "Services"), with one `Offer` per service in collection order, each offering a `Service` with the service's name and, when it has one, its description as plain text. The price text is not included.
  - Its type is `Organization` while the business has no street, city or phone.
  - Once it has one of them, its type is the business's type, and it also has:
    - the postal address (street, postal code, city, country), each part when filled in;
    - the phone and the email, when filled in;
    - the map address as `hasMap`, when filled in;
    - `openingHoursSpecification` with one entry for each distinct time range, listing the days that have it (as `Monday` to `Sunday`) and its opening and closing times.

The JSON SHALL be escaped so that no text in it can end the script element. Other pages, and every page rendered without the site's address, SHALL have no structured data.

#### Scenario: Home page structured data
- **WHEN** rendering the home page of site "Anideti" in language `cs` with site address `https://anideti.cz`
- **THEN** it contains JSON-LD with a `WebSite` named "Anideti", URL `https://anideti.cz/` and language `cs`, and an `Organization` named "Anideti"

#### Scenario: A bakery with opening hours
- **WHEN** the business is a `Bakery` at "Lipová 12", "280 02" "Kolín", country `CZ`, phone `+420321123456`, open Monday to Friday 06:00–17:00 and Saturday 07:00–11:00
- **THEN** the home page's JSON-LD has a `Bakery` with `telephone` `+420321123456` and a `PostalAddress` with `streetAddress` "Lipová 12", `postalCode` "280 02", `addressLocality` "Kolín" and `addressCountry` "CZ"
- **AND** it has two `OpeningHoursSpecification` entries: Monday to Friday 06:00–17:00, and Saturday 07:00–11:00

#### Scenario: Logo preferred over the favicon
- **WHEN** rendering the home page with site address `https://pekarna.cz` of a site with a favicon and a logo with media key `pekarna-7c1e` and width 600
- **THEN** the organization's logo is `https://pekarna.cz/assets/images/pekarna-7c1e-600.webp`

#### Scenario: Services and profiles
- **WHEN** rendering the home page with a site address, for a business with an Instagram profile and the services "Chléb" and "Dorty na zakázku"
- **THEN** the organization has `sameAs` with the Instagram address, and an `OfferCatalog` with two offers whose services are named "Chléb" and "Dorty na zakázku"

#### Scenario: Script-ending text in the name
- **WHEN** the site name contains `</script>`
- **THEN** the JSON-LD contains no literal `</script>` before its own closing tag

#### Scenario: Other pages
- **WHEN** rendering the page "Kontakt" with a site address
- **THEN** it has no structured data
