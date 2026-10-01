# Spec Delta

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`4`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon and a default share image, each a list of at most one `image` node;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme, a reference to the navigation, and a reference to the business details;
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
- **WHEN** a document has schema version 3
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Content blocks
Pages SHALL support exactly these block types:
- `hero`: a heading, optional supporting text, an optional image, and an optional call-to-action (label and link).
- `rich_text`: an ordered list of paragraphs, subheadings (level 2 or 3) and bulleted lists. Text supports bold, italic and link marks.
- `services`: an optional heading and an ordered list of service items, each with a name, a description and an optional price text.
- `text_with_image`: an optional heading, an ordered list of paragraphs and bulleted lists (text supports bold, italic and link marks), an optional image, and the side the image is on (`left` or `right`, default `right`).
- `gallery`: an optional heading and an ordered list of gallery items, each with an image and an optional caption.
- `team`: an optional heading and an ordered list of people, each with a name, an optional role, an optional short text, and an optional portrait image.
- `logos`: an optional heading and an ordered list of logo items, each with an image, the partner's name, and an optional link to a page of the site or an external URL.
- `contact`: an optional heading and four switches, for showing the address, the phone, the email and the map link. It shows the site's business details and holds none of its own.
- `opening_hours`: an optional heading. It shows the site's opening hours and holds none of its own.

#### Scenario: Block content with marks
- **WHEN** a `rich_text` paragraph has text `Call us today` with a bold mark on offsets 0–7
- **THEN** the document is valid

#### Scenario: Mark out of range
- **WHEN** a mark's end offset exceeds the length of its text
- **THEN** validation reports an error for that property

#### Scenario: Image blocks
- **WHEN** a page's blocks are a `text_with_image` with one image on the left, a `gallery` with three photos, a `team` with two people, and a `logos` block with two logos, all with the required texts filled in
- **THEN** the document is valid

#### Scenario: Unknown image side
- **WHEN** a `text_with_image` block's image side is `top`
- **THEN** validation reports an invalid-value error for that block

#### Scenario: Business blocks
- **WHEN** a page has a `contact` block and an `opening_hours` block, and the site has an address, a phone and opening hours
- **THEN** the document is valid

### Requirement: Upgrading version-1 documents
A version-1 document SHALL be upgradable to the current version without losing content. The upgrade SHALL:
- set the home page ID to the first page in the list;
- give that page a slug made from its title (or `home` when the title gives none), made unique with a numeric suffix when another page uses it;
- then upgrade the result as a version-2 document.

Upgrading a document of the current version SHALL return it unchanged.

#### Scenario: Upgrade a two-page site
- **WHEN** a version-1 document with pages "Úvod" (slug empty) and "Kontakt" (slug `kontakt`) is upgraded
- **THEN** the result has schema version 4, the home page ID points at "Úvod", and "Úvod" has slug `uvod`
- **AND** its other content is unchanged apart from the fields and nodes the later upgrades add

#### Scenario: Title slug is taken
- **WHEN** a version-1 document's first page is titled "Kontakt" and another page already has slug `kontakt`
- **THEN** the first page gets slug `kontakt-2`

#### Scenario: Already upgraded
- **WHEN** a version-4 document is upgraded
- **THEN** the same document is returned

### Requirement: Upgrading version-2 documents
A version-2 document SHALL be upgradable to the current version without losing content. The upgrade SHALL add to the site:
- an empty description;
- no favicon and no default share image;
- AI search and AI training both allowed.

It SHALL give every page no share image, and then upgrade the result as a version-3 document.

#### Scenario: Upgrade a version-2 site
- **WHEN** a version-2 document with pages "Úvod" and "Kontakt" is upgraded
- **THEN** the result has schema version 4, an empty site description, empty favicon and share image lists, both AI switches on, and each page has an empty share image list
- **AND** every other node and property is unchanged apart from the business details the upgrade of version-3 documents adds

## ADDED Requirements

### Requirement: Business details
The site SHALL reference exactly one `business` node with:
- the business name (empty: the site name is used);
- the street, the postal code and the city;
- the country, as a two-letter ISO code (default `CZ`);
- the phone, stored in international form: `+`, then 7 to 15 digits, without spaces (for example `+420321123456`);
- the email;
- a map address (an optional `https` URL, such as the business's Google Maps or Mapy.com listing);
- the type of business, one of `LocalBusiness`, `Bakery`, `CafeOrCoffeeShop`, `Restaurant`, `Store`, `HairSalon`, `BeautySalon`, `ProfessionalService`, `MedicalBusiness` and `SportsActivityLocation`, defaulting to `LocalBusiness`;
- the opening hours and their note;
- the "show in the footer" switch (default on).

Every field except the type and the switch MAY be empty. Validation SHALL report these as errors:
- a phone that isn't in international form;
- an email that isn't an address (text, `@`, a domain with a dot);
- a map address that isn't an `https` URL;
- a country that isn't two capital letters.

Messages SHALL name the field as the Business tab does ("the phone number"), never the property.

#### Scenario: Valid business details
- **WHEN** the business has street "Lipová 12", postal code "280 02", city "Kolín", phone `+420321123456` and email `objednavky@pekarna-ulipy.example`
- **THEN** the document is valid

#### Scenario: Phone with spaces
- **WHEN** the business's phone is stored as `321 123 456`
- **THEN** validation reports an error that the phone number must be in international form

#### Scenario: Map address over plain HTTP
- **WHEN** the business's map address is `http://maps.example/pekarna`
- **THEN** validation reports an error for the map address

#### Scenario: Empty business details
- **WHEN** every field of the business is empty
- **THEN** the document is valid

### Requirement: Opening hours
The business SHALL hold exactly seven `opening_day` nodes, one for each day from Monday to Sunday, in that order. Each day SHALL have an ordered list of `time_range` nodes; a day without ranges is closed.
- Each range has an opening and a closing time as `HH:MM` in 24-hour time (`00:00` to `23:59`). A closing time of `24:00` is also allowed and means midnight.
- A range SHALL close after it opens.
- The ranges of one day SHALL NOT overlap, and SHALL be in time order.

Violations SHALL be reported as errors that name the day ("Monday's hours: …"). The opening hours note is free text and MAY be empty.

#### Scenario: Lunch break
- **WHEN** Monday has ranges 08:00–12:00 and 13:00–17:00
- **THEN** the document is valid

#### Scenario: Closing before opening
- **WHEN** Tuesday has the range 17:00–08:00
- **THEN** validation reports an error that Tuesday's hours close before they open

#### Scenario: Overlapping ranges
- **WHEN** Wednesday has ranges 08:00–13:00 and 12:00–17:00
- **THEN** validation reports an error that Wednesday's hours overlap

#### Scenario: Invalid time
- **WHEN** a range opens at `25:00`
- **THEN** validation reports an invalid-value error for that range

### Requirement: Business blocks with nothing to show
A `contact` block whose shown details are all empty, or an `opening_hours` block on a site whose days are all closed and whose note is empty, SHALL be reported as a warning naming its page, which says that the business details are filled in on the Business tab. A `contact` block with every switch off SHALL be reported the same way.

#### Scenario: Contact block before the details are filled in
- **WHEN** the page "Kontakt" has a `contact` block and the business has no address, phone, email or map address
- **THEN** validation reports a warning that the contact block on "Kontakt" has nothing to show yet

### Requirement: Upgrading version-3 documents
A version-3 document SHALL be upgradable to version 4 without losing content. The upgrade SHALL add:
- a `business` node with every field empty except the country (`CZ`), the type `LocalBusiness` and the footer switch on;
- seven closed `opening_day` nodes;
- the site's reference to the business node.

It SHALL set the schema version to 4. New node IDs SHALL NOT collide with existing ones.

#### Scenario: Upgrade a version-3 site
- **WHEN** a version-3 document is upgraded
- **THEN** the result has schema version 4, and its site references a business node with empty details, the country `CZ`, the type `LocalBusiness`, the footer switch on, and seven days from Monday to Sunday without ranges
- **AND** every other node and property is unchanged
