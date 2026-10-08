## ADDED Requirements

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

## MODIFIED Requirements

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
