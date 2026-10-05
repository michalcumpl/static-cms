# Spec Delta

## ADDED Requirements

### Requirement: Locations
A location SHALL be a `location` node with:
- a name, which MAY be empty while it is the business's only location;
- the street, the postal code and the city;
- the country, as a two-letter ISO code (default `CZ`);
- the phone, stored in international form: `+`, then 7 to 15 digits, without spaces (for example `+420321123456`);
- the email;
- a map address (an optional `https` URL, such as the location's Google Maps or Mapy.com listing);
- the opening hours (see "Opening hours") and their note.

Every field except the country MAY be empty. Validation SHALL report these as errors:
- a phone that isn't in international form;
- an email that isn't an address (text, `@`, a domain with a dot);
- a map address that isn't an `https` URL;
- a country that isn't two capital letters;
- with two or more locations, a location without a name.

Messages SHALL name the field as the business settings do ("the phone number"), never the property, and, with several locations, the location by its name, or "Location 2" when it has none.

#### Scenario: Two shops
- **WHEN** the business has the locations "Kolín – Lipová" and "Kutná Hora", each with an address and a phone
- **THEN** the document is valid

#### Scenario: Second location without a name
- **WHEN** the business has two locations and the second has an empty name
- **THEN** validation reports an error that location 2 needs a name

#### Scenario: Phone of a branch
- **WHEN** the location "Kutná Hora" has the phone `321 123 456`
- **THEN** validation reports an error that names "Kutná Hora" and says the phone number must be in international form

### Requirement: Location of a business block
A `contact` block and an `opening_hours` block SHALL each have a location choice: empty, meaning all locations (the default), or the node ID of one of the business's locations, meaning that location only. A choice naming a location the business doesn't have SHALL be reported as an error naming the block's page.

#### Scenario: Contact block for one shop
- **WHEN** the page "Kutná Hora" has a `contact` block whose location is the location "Kutná Hora"
- **THEN** the document is valid, and the block shows that location only

#### Scenario: Location removed
- **WHEN** a contact block on "Kontakt" names a location that is no longer in the business's list
- **THEN** validation reports a missing-location error that names "Kontakt"

### Requirement: Upgrading version-7 documents
A version-7 document SHALL be upgradable to version 8 without changing what its pages show. The upgrade SHALL:
- create one location from the business's street, postal code, city, country, phone, email, map address, opening hours and their note, with an empty name, as the business's only location;
- remove those fields from the business node;
- give every `contact` and `opening_hours` block an empty location choice (all locations);
- set the schema version to 8.

#### Scenario: Upgrade the bakery
- **WHEN** a version-7 document whose business is at "Lipová 12", "Kolín", phone `+420321123456`, open Monday to Friday 06:00–17:00, is upgraded
- **THEN** the business has one location with those details and hours, the business node has no address of its own, and every page renders exactly as before the upgrade

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`8`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon, a default share image and a logo, each a list of at most one `image` node;
- a switch "show the site name in the header", `true` or `false`;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme, a reference to the navigation, and a reference to the business details;
- the four collections (services, team, testimonials, FAQs), each an ordered list of items;
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
- **WHEN** a document has schema version 7
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

#### Scenario: Two logos
- **WHEN** the site's logo list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Business details
The site SHALL reference exactly one `business` node with:
- the business name (empty: the site name is used);
- an ordered list of at least one location (see "Locations"); the first is the main location;
- the type of business, one of `LocalBusiness`, `Bakery`, `CafeOrCoffeeShop`, `Restaurant`, `Store`, `HairSalon`, `BeautySalon`, `ProfessionalService`, `MedicalBusiness` and `SportsActivityLocation`, defaulting to `LocalBusiness`;
- the social profiles (see "Social profiles");
- the "show in the footer" switch (default on).

The name MAY be empty. A business without locations SHALL be reported as a structural error.

#### Scenario: Valid business details
- **WHEN** the business's only location has street "Lipová 12", postal code "280 02", city "Kolín", phone `+420321123456` and email `objednavky@pekarna-ulipy.example`
- **THEN** the document is valid

#### Scenario: Phone with spaces
- **WHEN** a location's phone is stored as `321 123 456`
- **THEN** validation reports an error that the phone number must be in international form

#### Scenario: Map address over plain HTTP
- **WHEN** a location's map address is `http://maps.example/pekarna`
- **THEN** validation reports an error for the map address

#### Scenario: Empty business details
- **WHEN** the business has no name and one location whose fields are all empty
- **THEN** the document is valid

### Requirement: Opening hours
Each location SHALL hold exactly seven `opening_day` nodes, one for each day from Monday to Sunday, in that order. Each day SHALL have an ordered list of `time_range` nodes; a day without ranges is closed.
- Each range has an opening and a closing time as `HH:MM` in 24-hour time (`00:00` to `23:59`). A closing time of `24:00` is also allowed and means midnight.
- A range SHALL close after it opens.
- The ranges of one day SHALL NOT overlap, and SHALL be in time order.

Violations SHALL be reported as errors that name the day ("Monday's hours: …"), and, when the business has several locations, the location first ("Kolín – Lipová: Monday's hours …"). Each location's opening hours note is free text and MAY be empty.

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
A `contact` block whose shown details are empty for every location it shows, or an `opening_hours` block whose locations all have every day closed and an empty note, SHALL be reported as a warning naming its page, which says that the business details are filled in in the business settings. A `contact` block with every switch off SHALL be reported the same way.

#### Scenario: Contact block before the details are filled in
- **WHEN** the page "Kontakt" has a `contact` block and the business's only location has no address, phone, email or map address
- **THEN** validation reports a warning that the contact block on "Kontakt" has nothing to show yet, and that the details are filled in in the business settings
