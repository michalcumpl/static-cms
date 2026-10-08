# site-document Specification

## Purpose

Defines the site document: the single, Svedit-compatible JSON structure that describes a whole website (settings, theme, pages, navigation, content blocks, images). It also defines the validation rules a document must pass before it can be rendered or exported.

## Requirements

### Requirement: Document structure
A site document SHALL be a JSON object with a `document_id` naming the root node and a `nodes` object mapping node IDs to nodes. Every node SHALL have an `id` equal to its key in `nodes` and a `type` naming a known node type. Text values SHALL use the shape `{ content, marks, annotations }`, and node-list values SHALL use the shape `{ nodes, marks, annotations }`, so that the same document can be loaded unchanged by the Svedit editor.

#### Scenario: Well-formed document is accepted
- **WHEN** a document has a `document_id` pointing at a `site` node and every node's `id` matches its key
- **THEN** validation reports no structural errors

#### Scenario: Key and id mismatch
- **WHEN** a node stored under key `hero_1` has `id: "hero_2"`
- **THEN** validation reports an error identifying `hero_1`

#### Scenario: Unknown node type
- **WHEN** a node has `type: "carousel"`
- **THEN** validation reports an unknown-type error for that node

### Requirement: Node identifiers
Node IDs SHALL be non-empty strings that start with a letter or underscore, contain only letters, digits, underscores and dashes, and do not contain `__`.

#### Scenario: Invalid identifier
- **WHEN** a node ID is `1_page`, `page.1` or `page__1`
- **THEN** validation reports an invalid-ID error for that node

### Requirement: References and reachability
Every node reference SHALL point to an existing node of an allowed type. All nodes SHALL be reachable from the root node, and references SHALL NOT form cycles.

#### Scenario: Dangling reference
- **WHEN** a page's block list references `services_9`, which is not in `nodes`
- **THEN** validation reports a missing-reference error naming `services_9`

#### Scenario: Disallowed child type
- **WHEN** a page's block list references a `nav_item` node
- **THEN** validation reports a disallowed-type error

#### Scenario: Unreachable node
- **WHEN** a `hero` node exists in `nodes` but no page references it
- **THEN** validation reports a warning that the node is unreachable and will not be rendered

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`10`);
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
- **WHEN** a document has schema version 9
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

#### Scenario: Two logos
- **WHEN** the site's logo list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Pages and slugs
Every page SHALL have a title, a slug, optional SEO description text, and an ordered list of blocks. Every page's slug, the home page's included, SHALL be non-empty, lowercase, ASCII, dash-separated (the output of slugifying itself), and unique within the site. The home page's slug SHALL NOT be used for its address while it is the home page.

#### Scenario: Duplicate slug
- **WHEN** two pages both have slug `kontakt`
- **THEN** validation reports a duplicate-slug error naming both pages

#### Scenario: Non-normalized slug
- **WHEN** a page has slug `Kontakt Us`
- **THEN** validation reports an invalid-slug error suggesting `kontakt-us`

#### Scenario: Home page needs a slug
- **WHEN** the home page's slug is empty
- **THEN** validation reports an invalid-slug error for the home page

#### Scenario: Home slug clashes with another page
- **WHEN** the home page has slug `uvod` and another page also has slug `uvod`
- **THEN** validation reports a duplicate-slug error naming both pages

### Requirement: Navigation
The navigation SHALL be an ordered list of navigation items. Each item SHALL have a label and SHALL link either to a page node in the document (by reference) or to an external URL. A page that has more than one navigation item SHALL be reported as a warning.

#### Scenario: Link to a page by reference
- **WHEN** a navigation item references `page_contact` and that page's slug later changes
- **THEN** the item still links to that page without editing the navigation

#### Scenario: Page in the menu twice
- **WHEN** two navigation items both reference `page_contact`
- **THEN** validation reports a duplicate-menu-item warning, and the document stays valid

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
- `figures`: an optional heading and an ordered list of one to six figures, each a short value and a label (see "Key figures and steps contents").
- `steps`: a heading and an ordered list of steps, each a title and an optional text that supports bold, italic and link marks.
- `projects`: shows the site's projects (see "Collection blocks" and "Projects block").
- `cards`: an optional heading, a look, and an ordered list of one to twelve cards (see "Cards").

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

### Requirement: Hero placement
A `hero` block SHALL only appear as the first block of a page.

#### Scenario: Hero not first
- **WHEN** a page's blocks are `rich_text_1`, `hero_1`
- **THEN** validation reports an error that the hero must be the first block

### Requirement: Image accessibility
Every `image` node SHALL either have non-empty alt text or be explicitly marked decorative. Three kinds of image are exempt:
- the image of a logo item, whose alt text is the partner's name;
- the site's favicon, which is never shown as an image on a page;
- the site's logo, whose alt text is the site name, or empty when the name is shown next to it.

An image marked decorative SHALL have empty alt text.

#### Scenario: Missing alt text
- **WHEN** an image has empty alt text and is not marked decorative
- **THEN** validation reports an error asking for a description or the decorative flag

#### Scenario: Decorative image
- **WHEN** an image is marked decorative with empty alt text
- **THEN** the document is valid

#### Scenario: Gallery photo without description
- **WHEN** a gallery item's image has empty alt text and is not decorative
- **THEN** validation reports a missing-alt error for that image

#### Scenario: Logo described by its name
- **WHEN** a logo item named "Nadace Harmonie" has an image with empty alt text that is not marked decorative
- **THEN** the document is valid

#### Scenario: Favicon without description
- **WHEN** the site's favicon image has empty alt text and is not marked decorative
- **THEN** the document is valid

#### Scenario: Site logo without description
- **WHEN** the site's logo image has empty alt text and is not marked decorative
- **THEN** the document is valid

#### Scenario: Share image without description
- **WHEN** a page's share image has empty alt text and is not marked decorative
- **THEN** validation reports a missing-alt error saying that the share image of that page needs a description

### Requirement: Link safety
Links in marks, navigation items and calls-to-action SHALL either reference a page node or use one of the schemes `http`, `https`, `mailto` or `tel`, or be a root-relative path.

#### Scenario: Script URL rejected
- **WHEN** a link mark has `href: "javascript:alert(1)"`
- **THEN** validation reports an unsafe-link error

### Requirement: Theme
The theme SHALL define colors (primary, secondary, background, text), a heading font and a body font, a corner radius, and a content width. Color values SHALL be hex colors (`#rgb` or `#rrggbb`). Each font SHALL be an ID from the font catalog (see the theming capability). The radius and content width SHALL be CSS lengths. The colors SHALL meet the contrast rules of the theming capability: text on background, primary on background, text on secondary and primary on secondary, each at least 4.5:1.

#### Scenario: Low-contrast theme
- **WHEN** the theme's text color is `#999999` on background `#ffffff`
- **THEN** validation reports a contrast error with the measured ratio

#### Scenario: Font list instead of an ID
- **WHEN** the theme's body font is `Georgia, serif`
- **THEN** validation reports an invalid-theme-value error saying the body font must be chosen from the catalog

#### Scenario: Low-contrast links
- **WHEN** the theme's primary color is `#7fb2e5` on background `#ffffff`
- **THEN** validation reports a contrast error for links and buttons

### Requirement: Validation result
Validation SHALL return all problems found, not only the first. Each problem SHALL have a severity (`error` or `warning`), a category, a machine-readable code, a human-readable message, and the ID of the node (and property, when applicable) it concerns. The category SHALL be `structure` for problems with the document's shape (identifiers, node types, property values, references, mark ranges, cycles, reachability) and `site` for problems with the site rules (pages, home page, slugs, menu, links, headings, images, theme). Messages about a page, or about a link to a page, SHALL name the page by its title rather than by its node ID. Messages of `site` problems about pages, links, images, headings and blocks SHALL NOT contain node IDs or internal property names; a problem about an image or a link SHALL say which page it is on, by title. A document with any error SHALL be considered invalid. Warnings alone SHALL NOT make a document invalid.

#### Scenario: Multiple problems reported together
- **WHEN** a document has a duplicate slug and an image without alt text
- **THEN** validation returns both errors in one result

#### Scenario: Warnings only
- **WHEN** a document's only problem is an unreachable node
- **THEN** the document is considered valid and the warning is returned

#### Scenario: Problem categories
- **WHEN** a document has a dangling reference and an empty subheading
- **THEN** the dangling reference is reported with category `structure` and the empty subheading with category `site`

#### Scenario: Readable page problem
- **WHEN** two pages titled "Kontakt" and "Contact us" both have slug `kontakt`
- **THEN** the duplicate-slug message names "Kontakt" and "Contact us", not their node IDs

#### Scenario: Link to a deleted page
- **WHEN** a paragraph's link references a page that is no longer in the site
- **THEN** validation reports a missing-page error with category `site`, saying the link points to a page that no longer exists

#### Scenario: Image without a description
- **WHEN** an image on the page "Galerie" has no alt text and is not decorative
- **THEN** the message says that an image on "Galerie" needs a description (alt text) or must be marked decorative, and contains no node ID

#### Scenario: Button without a label
- **WHEN** the call to action of the hero on the page "Úvod" has an empty label
- **THEN** the message says that a button on "Úvod" needs a label, and contains no node ID

#### Scenario: Owners' words
- **WHEN** a document has an invalid slug, a level 3 subheading before any level 2 heading, an image without a description, and a link without a label
- **THEN** none of the messages contains a node ID, the word "slug", or an internal property name such as `seo_description`, `page_id`, `href` or `src` (the words the editor shows owners, such as "alt text" and "label", are fine)

### Requirement: Upgrading version-1 documents
A version-1 document SHALL be upgradable to the current version without losing content. The upgrade SHALL:
- set the home page ID to the first page in the list;
- give that page a slug made from its title (or `home` when the title gives none), made unique with a numeric suffix when another page uses it;
- then upgrade the result as a version-2 document.

Upgrading a document of the current version SHALL return it unchanged.

#### Scenario: Upgrade a two-page site
- **WHEN** a version-1 document with pages "Úvod" (slug empty) and "Kontakt" (slug `kontakt`) is upgraded
- **THEN** the result has schema version 5, the home page ID points at "Úvod", and "Úvod" has slug `uvod`
- **AND** its other content is unchanged apart from the fields and nodes the later upgrades add

#### Scenario: Title slug is taken
- **WHEN** a version-1 document's first page is titled "Kontakt" and another page already has slug `kontakt`
- **THEN** the first page gets slug `kontakt-2`

#### Scenario: Already upgraded
- **WHEN** a version-5 document is upgraded
- **THEN** the same document is returned

### Requirement: Image source and dimensions
Every `image` node's `src` SHALL be a media key: a plain file name of letters, digits, dots, dashes and underscores that starts with a letter or digit. Its `width` and `height` SHALL be the pixel dimensions of the image and SHALL be greater than zero, because the image's variants and its layout space are derived from them.

#### Scenario: Unknown dimensions
- **WHEN** an image node has width 0
- **THEN** validation reports a missing-image-size error for that image, with category `site`

#### Scenario: Path in source
- **WHEN** an image node's `src` is `../secret.png`
- **THEN** validation reports an invalid-media-key error

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

### Requirement: Upgrading version-2 documents
A version-2 document SHALL be upgradable to the current version without losing content. The upgrade SHALL add to the site:
- an empty description;
- no favicon and no default share image;
- AI search and AI training both allowed.

It SHALL give every page no share image, and then upgrade the result as a version-3 document.

#### Scenario: Upgrade a version-2 site
- **WHEN** a version-2 document with pages "Úvod" and "Kontakt" is upgraded
- **THEN** the result has schema version 5, an empty site description, empty favicon and share image lists, both AI switches on, and each page has an empty share image list
- **AND** every other node and property is unchanged apart from the business details and translation keys the later upgrades add

### Requirement: Share images
Every page SHALL have a share image: a list of at most one `image` node, used when the page is shared as a link. When a page has none, the site's default share image SHALL be used. A share image narrower than 600 pixels SHALL be reported as a warning, because link previews show it blurred.

#### Scenario: Small share image
- **WHEN** the page "Kontakt" has a share image 400 pixels wide
- **THEN** validation reports a warning that the share image of "Kontakt" is too small for link previews

#### Scenario: Two share images
- **WHEN** a page's share image list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Favicon size
A favicon image whose longer side is under 180 pixels (the whole image is fitted into the square icons) SHALL be reported as a warning, because the icon for phones' home screens would be blurred.

#### Scenario: Small favicon
- **WHEN** the site's favicon image is 64 × 64 pixels
- **THEN** validation reports a warning that the favicon is too small

### Requirement: Description for search engines
A page with an empty description, on a site with an empty description, SHALL be reported as a warning naming the page by its title. A page without its own description, on a site with a description, SHALL NOT be reported.

#### Scenario: No description anywhere
- **WHEN** the page "Kontakt" has an empty description and so does the site
- **THEN** validation reports a warning that "Kontakt" has no description for search engines and link previews

#### Scenario: Site description as fallback
- **WHEN** the page "Kontakt" has an empty description and the site's description is "Rodinná školka v Brně"
- **THEN** validation reports no description warning

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

### Requirement: Upgrading version-3 documents
A version-3 document SHALL be upgradable to the current version without losing content. The upgrade SHALL add:
- a `business` node with every field empty except the country (`CZ`), the type `LocalBusiness` and the footer switch on;
- seven closed `opening_day` nodes;
- the site's reference to the business node.

It SHALL then upgrade the result as a version-4 document. New node IDs SHALL NOT collide with existing ones.

#### Scenario: Upgrade a version-3 site
- **WHEN** a version-3 document is upgraded
- **THEN** the result has schema version 5, and its site references a business node with empty details, the country `CZ`, the type `LocalBusiness`, the footer switch on, and seven days from Monday to Sunday without ranges
- **AND** every other node and property is unchanged apart from the pages' translation keys

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

### Requirement: Page translation keys
Every page SHALL have a translation key: a non-empty identifier that pairs it with its counterparts in the project's other languages. Pages with the same translation key in two languages SHALL be treated as the same page in those languages. Within one document, no two pages SHALL share a translation key; a duplicate SHALL be reported as an error naming both pages.

#### Scenario: Duplicate key
- **WHEN** the pages "Kontakt" and "Napište nám" of one document have the same translation key
- **THEN** validation reports a duplicate-translation-key error naming both pages

#### Scenario: Empty key
- **WHEN** a page's translation key is empty
- **THEN** validation reports an invalid-value error for that page

### Requirement: Upgrading version-4 documents
A version-4 document SHALL be upgradable to version 5 without losing content. The upgrade SHALL give every page its own node ID as its translation key, and set the schema version to 5.

#### Scenario: Upgrade a version-4 site
- **WHEN** a version-4 document with pages `page_home` and `page_contact` is upgraded
- **THEN** the result has schema version 5, `page_home` has the translation key `page_home` and `page_contact` has `page_contact`
- **AND** every other node and property is unchanged

### Requirement: Site name in the header without a logo
The switch "show the site name in the header" SHALL only be off when the site has a logo. A site with the switch off and no logo SHALL get a warning, and its header SHALL show the name.

#### Scenario: Name hidden without a logo
- **WHEN** a site has no logo and the switch "show the site name in the header" is off
- **THEN** validation reports a warning that the header shows the name until a logo is chosen, and the document is valid

### Requirement: Upgrading version-5 documents
A version-5 document SHALL be upgradable to version 6 without losing content. The upgrade SHALL:
- replace each theme font list with a catalog ID: a list whose first font is Georgia, or that ends in the generic family `serif`, becomes `georgia`; any other list becomes `system-sans`;
- give the site an empty logo list and the switch "show the site name in the header" on;
- set the schema version to 6.

#### Scenario: Upgrade the starter theme
- **WHEN** a version-5 document with heading font `Georgia, 'Times New Roman', serif` and body font `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` is upgraded
- **THEN** the result has schema version 6, heading font `georgia`, body font `system-sans`, no logo and the site name shown in the header
- **AND** every other node and property is unchanged

### Requirement: Collections
The site SHALL hold five collections, each an ordered list of items held once per site:
- **services:** service items, each with a name, a description (bold, italic and links), an optional price text, and for its page an address and a page text (see "Item pages");
- **team:** people, each with a name, an optional role, an optional short text (bold, italic and links) and at most one portrait image;
- **testimonials:** testimonials, each with a quote, the person's name, an optional detail and at most one photo;
- **FAQs:** FAQ items, each with a question and an answer (bold, italic and links; line breaks allowed);
- **projects:** projects (see "Projects").

An item SHALL belong to exactly one collection and SHALL NOT appear inside a block. Every item SHALL have:
- a non-empty name (services, people, testimonials, projects);
- a non-empty quote (testimonials);
- a non-empty question and answer (FAQ items).

Images SHALL follow the image accessibility rule. Messages about an item SHALL name the collection and the item's position, such as "Service 3" or "Question 2", never a node ID. Each message SHALL say where the item can be fixed: the What you offer section for services, projects and questions, the About you section for people and testimonials (see the project-page capability). An empty collection SHALL be valid.

#### Scenario: Valid collections
- **WHEN** the site has two services with names, one person with a name and a described portrait, one testimonial with a quote and a name, and one FAQ item with a question and an answer
- **THEN** the document is valid

#### Scenario: Service without a name
- **WHEN** the third service in the collection has an empty name
- **THEN** validation reports an empty-name error for "Service 3", which says to edit it in What you offer

#### Scenario: Question without an answer
- **WHEN** the second FAQ item has the question "Do you deliver?" and an empty answer
- **THEN** validation reports an error that question 2 needs its answer

#### Scenario: Item inside a block
- **WHEN** a `services` block's chosen list references a `service_item` node directly instead of an item reference
- **THEN** validation reports a disallowed-type error for that block

### Requirement: Collection blocks
The `services`, `team`, `testimonials`, `faq` and `projects` blocks SHALL each show one collection: services, team, testimonials, FAQs and projects. Each SHALL have:
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
- **THEN** the site's services collection holds those three items in order, the block is in the `all` mode, and the rendered services section is identical to the one rendered before the upgrade

#### Scenario: Highlights and a full list
- **WHEN** the home page's services block holds "Chléb" and "Rohlíky", and the "Služby" page's services block holds identical "Chléb" and "Rohlíky" and also "Dorty"
- **THEN** the collection holds "Chléb", "Rohlíky" and "Dorty" once each
- **AND** the home page's block is `chosen` with "Chléb" and "Rohlíky", the "Služby" block is `all`, and both pages render as before

#### Scenario: Same name, different text
- **WHEN** two services blocks each hold a service named "Chléb" with different descriptions
- **THEN** both are kept as separate items, and each block references its own

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

### Requirement: Key figures and steps contents
- A `figure` SHALL have a non-empty value and a non-empty label. A value longer than 24 characters SHALL be reported as a warning, since figures are meant to be read at a glance.
- A `figures` block SHALL hold at most six figures; a block without figures SHALL be reported as a warning.
- A `steps` block SHALL have a non-empty heading, since its steps' titles are the headings under it. Each `step` SHALL have a non-empty title; its text is optional. A block without steps SHALL be reported as a warning.

Messages SHALL name the page and the item's position, as other block messages do ("Figure 2 on "Úvod" needs its label.").

#### Scenario: Valid figures and steps
- **WHEN** the home page has a figures block with three figures, each with a value and a label, and a steps block with a heading and three steps with titles
- **THEN** the document is valid

#### Scenario: Figure without a label
- **WHEN** the second figure on "Úvod" has the value "40+" and an empty label
- **THEN** validation reports an empty-label error for figure 2 that names "Úvod"

#### Scenario: Seven figures
- **WHEN** a figures block has seven figures
- **THEN** validation reports a too-many-items error

#### Scenario: Long value
- **WHEN** a figure's value is "více než tři sta milionů korun českých"
- **THEN** validation reports a long-figure warning, and the document stays valid

#### Scenario: Steps without a heading
- **WHEN** the steps block on "Služby" has an empty heading
- **THEN** validation reports an empty-heading error that names "Služby"

### Requirement: Block variants
Four blocks SHALL carry a choice of how they look, with today's look as the default:
- a `hero` block's `layout`: `beside` (the text next to the image) or `cover` (the image fills the block, the text over it);
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

### Requirement: Upgrading version-8 documents
A version-8 document SHALL be upgradable to version 9 without changing what its pages show. The upgrade SHALL give every `hero` the layout `beside`, every `services` and `team` block the layout `cards`, and every `gallery` the image fit `fill`, and set the schema version to 9. Stored documents SHALL be upgraded when read and stored at their next save, as for earlier versions.

#### Scenario: Upgrade the bakery
- **WHEN** the version-8 demo site, with a hero and a services block on its home page, is upgraded
- **THEN** the hero has the layout `beside`, the services block `cards`, the schema version is 9, and every page renders exactly as before

### Requirement: Projects
The site SHALL hold a list of project categories and a projects collection, each ordered and held once per site.

A **project category** SHALL have a non-empty name.

A **project** SHALL have:
- a non-empty name;
- a category: one of the site's project categories, or none;
- a short summary (one line, no formatting), which may be empty;
- a text of paragraphs, subheadings and lists (bold, italic and links), which may be empty;
- an ordered list of facts, each a non-empty label and a non-empty value (such as "Client" and "Národní technické muzeum");
- at most one cover image;
- an ordered list of photos, each an image with an optional caption;
- a video address, `https` or empty;
- an address (see "Item pages").

A project without a cover image SHALL be reported as a warning, since its tile has no picture. A category that no project uses SHALL be valid. Messages about a project SHALL name it by position ("Project 3") and say to edit it in What you offer.

#### Scenario: A project with everything
- **WHEN** the project "PETROF 160" has the category "Výstavy", a summary, a text with a list, the facts "Rok: 2024" and "Klient: Národní technické muzeum", a described cover image, seven captioned photos and no video
- **THEN** the document is valid

#### Scenario: Category that doesn't exist
- **WHEN** a project's category names a category the site doesn't have
- **THEN** validation reports a missing-category error for that project

#### Scenario: Fact without a value
- **WHEN** project 2 has the fact "Director" with an empty value
- **THEN** validation reports an error that project 2's fact "Director" needs a value

#### Scenario: Project without a cover
- **WHEN** project 4 has no cover image
- **THEN** validation reports a missing-cover warning, and the document stays valid

#### Scenario: Video that isn't https
- **WHEN** a project's video address is `http://vimeo.com/697475416`
- **THEN** validation reports an unsafe-link error for that project

### Requirement: Projects block
A `projects` block SHALL show the projects collection, as the other collection blocks show theirs (see "Collection blocks"), and also have:
- a category: one of the site's project categories, or none for every category;
- a number of projects to show at most, `0` for all of them.

With a category, the block SHALL show only that category's projects, in its mode's order. With a number, it SHALL show only the first projects up to that number. A block whose category names a category the site doesn't have SHALL be reported as an error. A block with a category no shown project has SHALL be reported as an empty-block warning naming the page.

#### Scenario: One category
- **WHEN** the page "Výstavy" has a projects block in the `all` mode with the category "Výstavy", and three of the site's ten projects are in that category
- **THEN** the block shows those three, in collection order

#### Scenario: Latest four
- **WHEN** the home page's projects block shows all projects with the number 4, and the site has thirty
- **THEN** the block shows the first four

#### Scenario: Negative number
- **WHEN** a projects block has the number -1
- **THEN** validation reports an invalid-value error for that block

### Requirement: Item pages
Services and projects SHALL each be able to have a page per item. The site SHALL hold, for each of the two collections, the ID of its **listing page**, or none:
- with none, the collection's items SHALL have no pages;
- with a listing page, every item of the collection SHALL have a page at the listing page's address followed by the item's address (`/prace/the-last-race/`).

A listing page SHALL be a page of the site other than the home page; otherwise validation SHALL report an error. While the collection has a listing page, every item's address SHALL be non-empty, lowercase, ASCII and dash-separated (the output of slugifying itself), and unique within the collection; otherwise validation SHALL report an invalid-slug or duplicate-slug error naming the item. Without a listing page the addresses SHALL NOT be checked.

A **service** SHALL also have a page text of paragraphs, subheadings and lists (bold, italic and links), which may be empty, shown on its page in place of its description.

#### Scenario: Practice areas with pages
- **WHEN** the services' listing page is "Specializace" (`specializace`) and the service "Pracovní právo" has the address `pracovni-pravo`
- **THEN** the document is valid and the service has a page at `/specializace/pracovni-pravo/`

#### Scenario: Two projects with one address
- **WHEN** the projects have a listing page and projects 2 and 5 both have the address `designblok`
- **THEN** validation reports a duplicate-slug error naming projects 2 and 5

#### Scenario: Home page as the listing page
- **WHEN** the projects' listing page is the home page
- **THEN** validation reports an error that item pages need a listing page other than the home page

#### Scenario: Addresses don't matter without pages
- **WHEN** the services have no listing page and every service's address is empty
- **THEN** the document is valid

### Requirement: Upgrading version-9 documents
A version-9 document SHALL be upgradable to version 10 without changing what its pages show. The upgrade SHALL give the site an empty projects collection, no project categories and no listing pages, give every service an empty address and an empty page text, and set the schema version to 10. Stored documents SHALL be upgraded when read and stored at their next save, as for earlier versions.

#### Scenario: Upgrade the bakery
- **WHEN** the version-9 demo site is upgraded
- **THEN** it has no projects and no item pages, its services have empty addresses and page texts, the schema version is 10, and every page renders exactly as before

### Requirement: Cards
A `cards` block SHALL have an optional heading, a look, `below` (the default: the image, then the title and the text) or `over` (the title over the image, the text under it), and an ordered list of one to twelve cards. A card SHALL have:
- at most one image;
- a non-empty title (one line, no formatting);
- an optional text (bold, italic and links; line breaks allowed);
- at most one link target: a page of the site, a service or project that has its own page (see "Item pages"), or an outside address, which follows "Link safety".

These cases SHALL be reported:
- a card without a title, as an error naming the page and the card's position ("Card 2 on Úvod needs a title");
- more than twelve cards, or none, as an error;
- a link to a page, service or project that no longer exists, or to a service or project whose collection has no listing page, as a warning; the card then renders without its link;
- both a page and an address on one card, as an error.

#### Scenario: Category tiles
- **WHEN** the home page has a `cards` block in the `over` look with four cards, each with a described image, a title and a link to a category page
- **THEN** the document is valid

#### Scenario: Card without a title
- **WHEN** the second card of a cards block on "Úvod" has an empty title
- **THEN** validation reports an empty-title error for card 2 on "Úvod"

#### Scenario: Link to a project without a page
- **WHEN** a card links to a project and the projects have no listing page
- **THEN** validation reports a warning that the card's link leads nowhere, and the document stays valid

#### Scenario: Unsafe address
- **WHEN** a card's address is `javascript:alert(1)`
- **THEN** validation reports an unsafe-link error

#### Scenario: Thirteen cards
- **WHEN** a cards block has thirteen cards
- **THEN** validation reports a too-many-items error for that block
