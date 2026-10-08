## ADDED Requirements

### Requirement: Projects block rendering
A `projects` block SHALL render the projects it shows (see "Projects block" in the site-document capability) as a list of tiles, each with the project's cover image and its name over it, and its category and summary when it has them. A project without a cover SHALL show its name on the theme's secondary colour. Cover images SHALL be lazy-loaded and sized for the tile.

When the projects have a listing page, each tile SHALL be a link to the project's page. When the block shows fewer projects than its mode and category would (because of its number), it SHALL end with a link to the listing page, labelled in the site's language ("Všechny projekty", "All projects"); without a listing page there SHALL be no such link.

#### Scenario: Tiles that link
- **WHEN** the projects' listing page is "Práce" (`prace`) and a block shows "Poslední závod" with the address `posledni-zavod`
- **THEN** its tile is a link to `/prace/posledni-zavod/` holding the cover image and the name

#### Scenario: Latest four with a link to all
- **WHEN** the home page's projects block has the number 4, the site has thirty projects and a listing page "Work"
- **THEN** the block renders four tiles and a link "All projects" to `/work/`

#### Scenario: No listing page
- **WHEN** the projects have no listing page
- **THEN** the tiles are not links, and no link to all projects is rendered

### Requirement: Item page rendering
When services or projects have a listing page, rendering SHALL produce a page for each of their items, at the listing page's address followed by the item's address, in every language the site publishes. An item page SHALL be a complete page of the site, as "Page document structure" describes, with:
- the item's name as its only `<h1>` and as its title, with the site name as for pages;
- as its description for search engines and share previews: a project's summary, or a service's description, as plain text;
- as its share image: a project's cover, or else the site's default share image;
- a canonical link to its own address, and language alternates to the same item's page in the site's other published languages that have item pages for that collection;
- the menu marking its listing page as the current page;
- a link back to its listing page, named after it.

A **project page** SHALL show, in this order: the name, the category, the summary, the cover image (not lazy-loaded, sized for the full width), the facts as a description list, the text, the photos with their captions as a gallery, and, when the project has a video address, a link "Watch the video" ("Přehrát video") to it. A **service page** SHALL show the name, the price, and the page text, or the description when the page text is empty.

Item pages SHALL pass the site's HTML validation, and their headings SHALL follow "Heading hierarchy".

#### Scenario: Project page
- **WHEN** the project "Poslední závod" with the category "Film & TV", the facts "Director: Tomáš Hodan" and "DOP: Jan Baset Střítežský", nine photos and a Vimeo address is rendered under the listing page "Work"
- **THEN** `/work/posledni-zavod/` has the `<h1>` "Poslední závod", a `<dl>` with the two facts, nine images in a gallery, a link to the Vimeo address, a link back to "Work", and the menu item "Work" marked as the current page

#### Scenario: Service page with a scope list
- **WHEN** the service "Pracovní právo" has a page text with a paragraph and a list of six points, and the services' listing page is "Specializace"
- **THEN** `/specializace/pracovni-pravo/` shows the paragraph and a `<ul>` of six items, and its description for search engines is the service's description

#### Scenario: Alternates between languages
- **WHEN** the project "Poslední závod" has the Czech address `posledni-zavod` under "Práce" and the English address `the-last-race` under "Work", and both languages are published
- **THEN** each page names the other as its alternate, with its own language

#### Scenario: Language without a listing page
- **WHEN** the Czech document has a projects listing page and the English one doesn't
- **THEN** the projects have Czech pages only, and the Czech pages have no English alternate

### Requirement: Links to item pages from cards
When the services have a listing page, every service card in a `services` block SHALL link to the service's page through its name, in each of the block's layouts. In the accordion layout the link SHALL follow the description inside the opened row ("Více o službě", "More about this service"), since the summary opens the row. Without a listing page, services SHALL render as before.

#### Scenario: Card links to its page
- **WHEN** the services have the listing page "Služby" and a services block in the `cards` layout shows "Kváskový chléb" with the address `kvaskovy-chleb`
- **THEN** the card's name is a link to `/sluzby/kvaskovy-chleb/`

#### Scenario: Unchanged without pages
- **WHEN** the services have no listing page
- **THEN** the services block renders exactly as before format 10
