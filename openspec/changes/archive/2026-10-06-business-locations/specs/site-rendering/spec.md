# Spec Delta

## ADDED Requirements

### Requirement: Business blocks for several locations
A `contact` or `opening_hours` block SHALL show the locations its location choice names: all of the business's locations in list order, or the one it chose.
- **One location shown:** the block renders as described in "Contact details" and "Opening hours table", without the location's name.
- **Several shown:** each location renders in its own group, in list order, headed by its name one heading level below the block's heading (`<h3>` under a block heading, `<h2>` without one), followed by its contact details or opening hours.

A location with nothing to show for the block (a contact block's shown parts all empty, or every day closed and no note) SHALL be left out.

#### Scenario: Contact block for all shops
- **WHEN** rendering a contact block headed "Kde nás najdete" with all locations, for the locations "Kolín – Lipová" and "Kutná Hora", each with an address
- **THEN** the section has `<h2>Kde nás najdete</h2>`, then `<h3>Kolín – Lipová</h3>` with its `<address>`, then `<h3>Kutná Hora</h3>` with its `<address>`

#### Scenario: One shop chosen
- **WHEN** rendering an opening hours block whose location is "Kutná Hora"
- **THEN** it shows Kutná Hora's opening hours table only, without a location heading

#### Scenario: A single location, as before
- **WHEN** rendering a contact block with all locations, for a business with one location
- **THEN** the block's HTML is the same as for the business details of format 7

## MODIFIED Requirements

### Requirement: Footer contact details
When the business's "show in the footer" switch is on, every page's footer (the not-found page included) SHALL show the business's details before the copyright line, and the business name above them when it differs from the site name:
- **one location:** when it has any of a street, city, phone, email, open day or note, its contact details and opening hours, with the same markup rules as "Contact details" and "Opening hours table";
- **several locations:** each location that has a street, city or phone, in list order, as a compact entry: its name in `<strong>`, then its street, postal code and city, and its phone, with the same markup rules as "Contact details", without the email, the map link or the opening hours.

Otherwise the footer SHALL be unchanged.

#### Scenario: Footer with details
- **WHEN** rendering any page of a site whose business has a phone and opening hours, with the switch on
- **THEN** the page's `<footer>` contains an `<address>` with the phone link and the opening hours table, followed by the copyright line

#### Scenario: Switch off
- **WHEN** the business has details and the switch is off
- **THEN** the footer contains only the copyright line

#### Scenario: Nothing filled in
- **WHEN** the business has no details
- **THEN** the footer contains only the copyright line

#### Scenario: Two shops in the footer
- **WHEN** rendering any page of a site with the locations "Kolín – Lipová" and "Kutná Hora", each with an address and a phone, and opening hours, with the switch on
- **THEN** the footer shows both names, each with its address and phone link, and no opening hours table

### Requirement: Structured data
When rendering is given the site's address, the home page SHALL contain one `<script type="application/ld+json">` with a schema.org `WebSite` and an organization:
- **`WebSite`** has the site name, the site's address with a trailing slash, the site language, and the site description when there is one.
- **The organization** has the business name (or the site name) and the site's address. When the site has a logo, it also has the absolute URL of the logo's `src` file as its logo; otherwise, when the site has a favicon, `icon-512.png`'s absolute URL.
  - When the business has social profiles, it has their addresses, in order, as `sameAs`.
  - When the site has services, it has an `hasOfferCatalog`: an `OfferCatalog` named after the site's language ("Služby", "Services"), with one `Offer` per service in collection order, each offering a `Service` with the service's name and, when it has one, its description as plain text. The price text is not included.
  - **With one location:** its type is `Organization` while that location has no street, city or phone. Once it has one of them, its type is the business's type, and it also has the location's:
    - the postal address (street, postal code, city, country), each part when filled in;
    - the phone and the email, when filled in;
    - the map address as `hasMap`, when filled in;
    - `openingHoursSpecification` with one entry for each distinct time range, listing the days that have it (as `Monday` to `Sunday`) and its opening and closing times.
  - **With several locations:** its type is `Organization`, and the graph also has one entry per location that has a street, city or phone. Each is of the business's type, with an `@id` of the site's address followed by `#location-` and its position (from 1), the business name and the location's name joined by " – ", the location's details as listed above, and `parentOrganization` pointing at the organization's `@id`.

The JSON SHALL be escaped so that no text in it can end the script element. Other pages, and every page rendered without the site's address, SHALL have no structured data.

#### Scenario: Home page structured data
- **WHEN** rendering the home page of site "Anideti" in language `cs` with site address `https://anideti.cz`
- **THEN** it contains JSON-LD with a `WebSite` named "Anideti", URL `https://anideti.cz/` and language `cs`, and an `Organization` named "Anideti"

#### Scenario: A bakery with opening hours
- **WHEN** the business is a `Bakery` with one location at "Lipová 12", "280 02" "Kolín", country `CZ`, phone `+420321123456`, open Monday to Friday 06:00–17:00 and Saturday 07:00–11:00
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

#### Scenario: Two shops
- **WHEN** rendering the home page with site address `https://pekarna.cz` of a `Bakery` "Pekárna U Lípy" with the locations "Kolín – Lipová" and "Kutná Hora", each with an address
- **THEN** the JSON-LD has an `Organization` "Pekárna U Lípy" and two `Bakery` entries, "Pekárna U Lípy – Kolín – Lipová" with `@id` `https://pekarna.cz/#location-1` and "Pekárna U Lípy – Kutná Hora" with `@id` `https://pekarna.cz/#location-2`, each with its own address and `parentOrganization` `{"@id": "https://pekarna.cz/#organization"}`
