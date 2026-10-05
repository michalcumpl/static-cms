# Spec Delta

## ADDED Requirements

### Requirement: Collections
The site SHALL hold four collections, each an ordered list of items held once per site:
- **services:** service items, each with a name, a description (bold, italic and links) and an optional price text;
- **team:** people, each with a name, an optional role, an optional short text (bold, italic and links) and at most one portrait image;
- **testimonials:** testimonials, each with a quote, the person's name, an optional detail and at most one photo;
- **FAQs:** FAQ items, each with a question and an answer (bold, italic and links; line breaks allowed).

An item SHALL belong to exactly one collection and SHALL NOT appear inside a block. Every item SHALL have:
- a non-empty name (services, people, testimonials);
- a non-empty quote (testimonials);
- a non-empty question and answer (FAQ items).

Images SHALL follow the image accessibility rule. Messages about an item SHALL name the collection and the item's position, such as "Service 3" or "Question 2", never a node ID. Each message SHALL say where the item can be fixed. An empty collection SHALL be valid.

#### Scenario: Valid collections
- **WHEN** the site has two services with names, one person with a name and a described portrait, one testimonial with a quote and a name, and one FAQ item with a question and an answer
- **THEN** the document is valid

#### Scenario: Service without a name
- **WHEN** the third service in the collection has an empty name
- **THEN** validation reports an empty-name error for "Service 3"

#### Scenario: Question without an answer
- **WHEN** the second FAQ item has the question "Do you deliver?" and an empty answer
- **THEN** validation reports an error that question 2 needs its answer

#### Scenario: Item inside a block
- **WHEN** a `services` block's chosen list references a `service_item` node directly instead of an item reference
- **THEN** validation reports a disallowed-type error for that block

### Requirement: Collection blocks
The `services`, `team`, `testimonials` and `faq` blocks SHALL each show one collection: services, team, testimonials and FAQs. Each SHALL have:
- an optional heading;
- a mode, `all` (the default) or `chosen`;
- an ordered list of item references, used only in the `chosen` mode.

An item reference SHALL name an item of the block's own collection by its ID. One block SHALL NOT reference the same item twice. In the `all` mode the block SHALL show every item of the collection in collection order, and its reference list SHALL be empty. In the `chosen` mode it SHALL show the referenced items in the reference order.

These cases SHALL be reported as warnings naming the page:
- a block in the `all` mode whose collection is empty;
- a block in the `chosen` mode without references.

#### Scenario: Highlights on the home page
- **WHEN** the site has five services, and the home page's services block is in the `chosen` mode with references to services 4, 1 and 2
- **THEN** the document is valid and the block shows services 4, 1 and 2 in that order

#### Scenario: Reference to a deleted item
- **WHEN** a team block references a person that is not in the team collection
- **THEN** validation reports a missing-item error that names the block's page

#### Scenario: Reference to another collection
- **WHEN** a testimonials block references a service item
- **THEN** validation reports a wrong-collection error for that block

#### Scenario: Same item twice
- **WHEN** a services block in the `chosen` mode references the same service twice
- **THEN** validation reports a duplicate-item error for that block

#### Scenario: All of an empty collection
- **WHEN** the page "Úvod" has an FAQ block in the `all` mode and the site has no FAQ items
- **THEN** validation reports an empty-block warning naming "Úvod", and the document stays valid

### Requirement: Social profiles
The business SHALL have an ordered list of social profiles, each an `https` address. The kind of profile SHALL be derived from the address's host:
- `facebook.com`: Facebook;
- `instagram.com`: Instagram;
- `linkedin.com`: LinkedIn;
- `youtube.com`: YouTube;
- `x.com` or `twitter.com`: X;
- `tiktok.com`: TikTok;
- any other host: the host itself.

The host SHALL also match any subdomain of these (`m.facebook.com`, `cz.linkedin.com`). For other hosts, a `www.` or `m.` prefix SHALL be left out of the name. An address that isn't an `https` URL SHALL be reported as an error, as the map address is. The same address twice SHALL be reported as a warning.

#### Scenario: Instagram profile
- **WHEN** the business has the social profile `https://www.instagram.com/pekarnaulipy`
- **THEN** the document is valid and the profile is an Instagram profile

#### Scenario: Profile without https
- **WHEN** a social profile is `http://facebook.com/pekarna`
- **THEN** validation reports an error for that social profile

### Requirement: Upgrading version-6 documents
A version-6 document SHALL be upgradable to version 7 without changing what its pages show. The upgrade SHALL:
1. Lift the items of every `services`, `team` and `testimonials` block into the matching collection, in page order (the site's list of pages) and then block order. Items keep their node IDs.
2. Merge an item that equals an item already lifted (the same texts, marks and image) into it.
3. Set each block's mode: `all` when its items, after merging, are exactly the whole collection in order; otherwise `chosen`, with references to its former items in their former order.
4. Give the site an empty FAQ collection and the business an empty list of social profiles.
5. Set the schema version to 7.

#### Scenario: One services block
- **WHEN** a version-6 document whose only services block has three service items is upgraded
- **THEN** the site's services collection holds those three items in order, the block is in the `all` mode, and the rendered page is identical to the one rendered before the upgrade

#### Scenario: Highlights and a full list
- **WHEN** the home page's services block holds "Chléb" and "Rohlíky", and the "Služby" page's services block holds identical "Chléb" and "Rohlíky" and also "Dorty"
- **THEN** the collection holds "Chléb", "Rohlíky" and "Dorty" once each
- **AND** the home page's block is `chosen` with "Chléb" and "Rohlíky", the "Služby" block is `all`, and both pages render as before

#### Scenario: Same name, different text
- **WHEN** two services blocks each hold a service named "Chléb" with different descriptions
- **THEN** both are kept as separate items, and each block references its own

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`7`);
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
- **WHEN** a document has schema version 6
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

#### Scenario: Two logos
- **WHEN** the site's logo list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Content blocks
Pages SHALL support exactly these block types:
- `hero`: a heading, optional supporting text, an optional image, and an optional call-to-action (label and link).
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

### Requirement: Image block contents
Each gallery item and each logo item SHALL have exactly one image; a `text_with_image` block SHALL have at most one. Every logo item SHALL have a non-empty name. A `gallery` or `logos` block without any items SHALL be reported as a warning. A logo item's link SHALL be either a page of the site or a URL allowed by the link safety rule, and not both. People are validated as items of the team collection (see "Collections").

#### Scenario: Person without a name
- **WHEN** the first person in the team collection has an empty name
- **THEN** validation reports an empty-name error for "Person 1", as an item of the team collection

#### Scenario: Logo without a name
- **WHEN** a logo item has an empty name
- **THEN** validation reports an empty-name error for that logo item, because the name is its image's description

#### Scenario: Empty gallery
- **WHEN** a gallery has no items
- **THEN** validation reports an empty-block warning, and the document stays valid

#### Scenario: Gallery item without an image
- **WHEN** a gallery item's image list is empty
- **THEN** validation reports an error that the item needs an image

#### Scenario: Logo linked to a removed page
- **WHEN** a logo item links to `page_gone`, which is not a page of the site
- **THEN** validation reports a missing-page error for that logo item

#### Scenario: Unsafe logo link
- **WHEN** a logo item's URL is `javascript:alert(1)`
- **THEN** validation reports an unsafe-link error for that logo item

### Requirement: Call to action and testimonial contents
- A `call_to_action` block SHALL have a non-empty heading and at most two buttons; a block without buttons SHALL be reported as a warning.
- Its buttons SHALL follow the rules of other links: a label, an existing page or an address allowed by the link safety rule.
- Testimonials are validated as items of the testimonials collection (see "Collections"), and `testimonials` blocks as collection blocks (see "Collection blocks").

Messages SHALL name the page, as other block messages do.

#### Scenario: Call to action without a heading
- **WHEN** the call to action on "Úvod" has an empty heading
- **THEN** validation reports an empty-heading error that names "Úvod"

#### Scenario: Three buttons
- **WHEN** a call to action has three buttons
- **THEN** validation reports a too-many-items error

#### Scenario: Call to action without buttons
- **WHEN** a call to action has no buttons
- **THEN** validation reports an empty-block warning, and the document stays valid

#### Scenario: Testimonial without a quote
- **WHEN** the first testimonial in the collection has an empty quote
- **THEN** validation reports an error that testimonial 1 needs its quote

#### Scenario: Button to a removed page
- **WHEN** a call to action's button links to `page_gone`, which is not a page of the site
- **THEN** validation reports a missing-page error saying a button on that page points to a page that no longer exists

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
- the social profiles (see "Social profiles");
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
