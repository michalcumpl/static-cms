# Spec Delta

## MODIFIED Requirements

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

Messages SHALL name the field as the business settings do ("the phone number"), never the property.

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

### Requirement: Business blocks with nothing to show
A `contact` block whose shown details are all empty, or an `opening_hours` block on a site whose days are all closed and whose note is empty, SHALL be reported as a warning naming its page, which says that the business details are filled in in the business settings. A `contact` block with every switch off SHALL be reported the same way.

#### Scenario: Contact block before the details are filled in
- **WHEN** the page "Kontakt" has a `contact` block and the business has no address, phone, email or map address
- **THEN** validation reports a warning that the contact block on "Kontakt" has nothing to show yet, and that the details are filled in in the business settings
