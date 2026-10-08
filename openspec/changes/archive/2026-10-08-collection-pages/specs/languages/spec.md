## MODIFIED Requirements

### Requirement: Shared fields
These fields SHALL be shared, and come from the primary language:
- the theme, fonts included;
- the logo and the switch "show the site name in the header";
- the favicon;
- the default share image's image (not its description);
- the AI crawler switches;
- the business data: type of business, social profiles and the footer switch, which locations exist and their order, and each location's street, postal code, city, country, phone, email, map address and opening hours;
- the collections' structure: which services, people, testimonials, FAQ items and projects exist and their order, and each item's image (not its description);
- the project categories that exist and their order, and each project's category, cover image, photos and their order (not their descriptions or captions), which facts it has and their order, and its video address.

Whenever a document in another language is read (for the editor, the preview, the ZIP download or a publish), its shared fields SHALL be replaced by the primary's current ones. The primary's changes SHALL apply to every language without saving the other languages. All other fields SHALL be per language:
- the site name and description (the site name is also the logo's description when the name is hidden);
- the default share image's description, while it describes the same image as the primary's; otherwise the primary's description is used, so publishing never waits for a new translation;
- the business name, and each location's name and the note on its opening hours. A location the language doesn't have yet SHALL take the primary's name and note;
- the texts of collection items: service names, descriptions, prices and page texts; people's names, roles and texts; testimonials' quotes, names and details; questions and answers; project names, summaries, texts, fact labels and values, and photo captions; category names. An item the language doesn't have yet SHALL take the primary's texts. An item's image description SHALL follow the share image's rule;
- the addresses of services and projects, and which page lists them (see "Item pages" in the site-document capability). An item the language doesn't have yet SHALL take the primary's address;
- the menu, the pages and their contents, including which items a block showing chosen items shows.

A block in another language that chose an item the primary no longer has SHALL stop showing it.

#### Scenario: Change the phone once
- **WHEN** the Czech phone number is changed and saved
- **THEN** the English editor, preview and the next publish show the new number, while the English document's version is unchanged

#### Scenario: English description of the opening hours
- **WHEN** the English note on the opening hours is "Closed on public holidays" and the Czech one is "Ve svátky zavřeno"
- **THEN** each language's published opening hours show its own note

#### Scenario: Logo in every language
- **WHEN** the Czech site "Pekárna Kolín" gets a logo with the name hidden and is saved, and the English site is named "Kolín Bakery"
- **THEN** the English editor, preview and next publish show the same logo, described as "Kolín Bakery", while the English document's version is unchanged

#### Scenario: New service in Czech
- **WHEN** the owner adds the service "Vánočka" in Czech and saves
- **THEN** the English blocks showing all services show "Vánočka" with its Czech texts, while the English document's version is unchanged

#### Scenario: Translated service keeps its translation
- **WHEN** the English document names the service "Chléb" as "Bread", and the Czech owner moves "Chléb" to the end of the collection and saves
- **THEN** the English page lists "Bread" last

#### Scenario: Service deleted in Czech
- **WHEN** the English home page's chosen block shows "Bread", and "Chléb" is deleted in Czech and saved
- **THEN** the English home page no longer shows it, and no validation error is reported for English

#### Scenario: Second shop in English
- **WHEN** the Czech owner adds the location "Kutná Hora" and saves, and the English document names no locations of its own
- **THEN** the English footer shows "Kutná Hora" with the Czech address, and the English Business section lets the owner rename it, while its address can't be edited there

#### Scenario: Project translated to English
- **WHEN** the Czech project "Poslední závod" has the address `posledni-zavod`, and the English document names it "The Last Race" with the address `the-last-race` and the fact label "Director" for "Režie"
- **THEN** the English project page is at `/en/work/the-last-race/` with the English name and fact label, and the same cover and photos as the Czech page

#### Scenario: New project in Czech
- **WHEN** the owner adds the project "Mustang" in Czech with the address `mustang` and saves, and the English document has a projects listing page
- **THEN** the English site has a page for "Mustang" at `/en/work/mustang/` with the Czech texts, while the English document's version is unchanged

