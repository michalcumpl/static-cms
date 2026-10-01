# Spec Delta

## MODIFIED Requirements

### Requirement: Block rendering
Blocks SHALL render in document order as semantic HTML:
- `hero` as a `<section>` containing its heading, text, image and call-to-action link.
- `rich_text` as a `<section>` containing `<p>`, `<h2>`/`<h3>` and `<ul><li>` elements. Bold, italic and link marks render as `<strong>`, `<em>` and `<a>`.
- `services` as a `<section>` with an optional heading and a `<ul>` of service items, each with its name, description and price when present.
- `text_with_image` as a `<section>` with its heading, its paragraphs and lists, and its image, carrying a class that names the image side (`image-left` or `image-right`).
- `gallery` as a `<section>` with an optional heading and a `<ul>` of photos, each a `<figure>` holding a link to the photo's largest variant around its image, and a `<figcaption>` when it has a caption.
- `team` as a `<section>` with an optional heading and a `<ul>` of people, each with the portrait (when present), the name, the role and the text (when present).
- `logos` as a `<section>` with an optional heading and a `<ul>` of logos, each an image whose alt text is the partner's name, wrapped in a link when the logo has one.
- `contact` as a `<section>` with an optional heading and the site's contact details (see "Contact details").
- `opening_hours` as a `<section>` with an optional heading and the site's opening hours (see "Opening hours table").

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

### Requirement: Structured data
When rendering is given the site's address, the home page SHALL contain one `<script type="application/ld+json">` with a schema.org `WebSite` and an organization:
- **`WebSite`** has the site name, the site's address with a trailing slash, the site language, and the site description when there is one.
- **The organization** has the business name (or the site name) and the site's address. When the site has a favicon, it also has `icon-512.png`'s absolute URL as its logo.
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

#### Scenario: Script-ending text in the name
- **WHEN** the site name contains `</script>`
- **THEN** the JSON-LD contains no literal `</script>` before its own closing tag

#### Scenario: Other pages
- **WHEN** rendering the page "Kontakt" with a site address
- **THEN** it has no structured data

## ADDED Requirements

### Requirement: Contact details
Wherever contact details are shown (a `contact` block, or the footer), they SHALL render in an `<address>` element, each part only when it is filled in:
- the street on one line, and the postal code and city on the next;
- the phone as a `tel:` link to the stored number. Czech and Slovak numbers (`+420`, `+421`) with nine digits show as `+420 321 123 456`, with non-breaking spaces so the number stays on one line; other numbers show as stored.
- the email as a `mailto:` link.
- a "Show on map" link in the site's language (Czech: "Zobrazit na mapě"):
  - when the address has a street or city, or a map address is filled in;
  - pointing to the map address when there is one;
  - otherwise to `https://www.google.com/maps/search/?api=1&query=` followed by the URL-encoded "street, postal code city, country".

A `contact` block SHALL show only the parts its switches allow. A `contact` block with nothing to show SHALL render its heading only.

#### Scenario: Contact block
- **WHEN** rendering a `contact` block headed "Kde nás najdete" for a business at "Lipová 12", "280 02" "Kolín", with phone `+420321123456` and email `objednavky@pekarna-ulipy.example`, on a Czech site
- **THEN** the section has `<h2>Kde nás najdete</h2>`, and an `<address>` with "Lipová 12", "280 02 Kolín", `<a href="tel:+420321123456">` showing "+420 321 123 456" and `<a href="mailto:objednavky@pekarna-ulipy.example">`
- **AND** it has "Zobrazit na mapě" linking to `https://www.google.com/maps/search/?api=1&query=Lipov%C3%A1%2012%2C%20280%2002%20Kol%C3%ADn%2C%20CZ`

#### Scenario: Map address given
- **WHEN** the business's map address is `https://maps.app.goo.gl/abc`
- **THEN** "Zobrazit na mapě" links to `https://maps.app.goo.gl/abc`

#### Scenario: Phone hidden
- **WHEN** a `contact` block's phone switch is off
- **THEN** it has no `tel:` link

### Requirement: Opening hours table
Opening hours SHALL render as a `<table>` with one row per group of consecutive days that have the same ranges:
- a `<th scope="row">` with the day, or the first and last day of the group joined by an en dash;
- a `<td>` with the ranges, each as `H:MM–H:MM` (hours without a leading zero, an en dash between), separated by a comma and a space, or the word for closed.

Day names and the word for closed come in the site's language: Czech `Po Út St Čt Pá So Ne` and "zavřeno"; English, the fallback for other languages, `Mon Tue Wed Thu Fri Sat Sun` and "Closed". The note SHALL follow the table in a `<p>` when it isn't empty. When every day is closed, there SHALL be no table, only the note.

#### Scenario: Weekdays grouped
- **WHEN** rendering opening hours with Monday to Friday 06:00–17:00, Saturday 07:00–11:00 and Sunday closed, on a Czech site
- **THEN** the table's rows are "Po–Pá" "6:00–17:00", "So" "7:00–11:00", and "Ne" "zavřeno"

#### Scenario: Lunch break
- **WHEN** Monday alone has 08:00–12:00 and 13:00–17:00, on an English site
- **THEN** Monday's row reads "Mon" "8:00–12:00, 13:00–17:00"

#### Scenario: Only a note
- **WHEN** every day is closed and the note is "Po domluvě"
- **THEN** the hours render as `<p>Po domluvě</p>` without a table

### Requirement: Footer contact details
When the business's "show in the footer" switch is on and the business has any of a street, city, phone, email, open day or note, every page's footer (the not-found page included) SHALL show the contact details and the opening hours before the copyright line. They SHALL be shown with the same markup rules as "Contact details" and "Opening hours table", and the business name SHALL be shown above them when it differs from the site name. Otherwise the footer SHALL be unchanged.

#### Scenario: Footer with details
- **WHEN** rendering any page of a site whose business has a phone and opening hours, with the switch on
- **THEN** the page's `<footer>` contains an `<address>` with the phone link and the opening hours table, followed by the copyright line

#### Scenario: Switch off
- **WHEN** the business has details and the switch is off
- **THEN** the footer contains only the copyright line

#### Scenario: Nothing filled in
- **WHEN** the business has no details
- **THEN** the footer contains only the copyright line
