# languages Specification

## Purpose

A project's site in several languages: the primary language and the others added as copies of it, which of them are published, and the business and site settings they share with the primary.

## Requirements

### Requirement: Primary language
Every project SHALL have a primary language, its first: Czech for existing projects, and for new projects the language they are created with. The primary language SHALL always be published and SHALL NOT be removed or hidden. It is served at the site's root.

#### Scenario: Existing project
- **WHEN** a project created before languages existed is opened
- **THEN** its languages are Czech, primary and published

### Requirement: Languages offered
A project SHALL be able to have, besides its primary language, any of Czech (`cs`), Slovak (`sk`), English (`en`), German (`de`) and Polish (`pl`), each at most once. Each language SHALL be named in its own language: Čeština, Slovenčina, English, Deutsch and Polski.

#### Scenario: Adding a language twice
- **WHEN** a member adds English to a project that already has English
- **THEN** it is refused with a message that the project already has English

### Requirement: Adding a language
A member of the project's workspace SHALL be able to add a language. The new language's document SHALL be a copy of the primary's current document, with:
- the language tag set to the new language;
- the same nodes and node IDs, so its pages keep their translation keys and are paired with the primary's.

The new language SHALL start hidden. Adding SHALL be recorded as the new document's first version.

#### Scenario: Add English
- **WHEN** a member adds English to a Czech project with the pages "Úvod" and "Kontakt"
- **THEN** the project has an English document, hidden, with the pages "Úvod" and "Kontakt" (still in Czech) paired with the Czech ones, and its language tag is `en`

### Requirement: Publishing and hiding a language
A member SHALL be able to publish a hidden language and hide a published one other than the primary. Only published languages SHALL be part of a publish, the ZIP download, alternates and the language switcher. The preview SHALL show all languages, hidden ones included, so they can be checked before publishing. Publishing or hiding a language SHALL take effect on the next publish.

#### Scenario: Hidden in the preview only
- **WHEN** English is hidden
- **THEN** the preview has the English pages at `/en/`, and the next publish and the ZIP download don't

### Requirement: Removing a language
A member SHALL be able to remove a language other than the primary, after confirming. Removing SHALL delete the language's document and its versions. The language's addresses SHALL no longer be part of the next publish, and they SHALL NOT be redirected.

#### Scenario: Remove German
- **WHEN** a member removes German and confirms
- **THEN** the project no longer has a German document, and the next publish has no `/de/` pages

#### Scenario: Primary can't be removed
- **WHEN** a member tries to remove the primary language
- **THEN** it is refused

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

### Requirement: Access to languages
Managing languages (adding, publishing, hiding, removing) SHALL be available to members of the project's workspace, owners and editors alike. Others SHALL get "not found", or 401 when not signed in. Changes SHALL be refused when the request comes from another site's page.

#### Scenario: Another workspace
- **WHEN** a member of another workspace tries to add a language to the project
- **THEN** the response is "not found"

### Requirement: Linking a page to another language
In the language being edited, a member SHALL be able to link a page to a page of another language that has no counterpart in this language. Linking SHALL:
- give the page that page's translation key, so the two are counterparts;
- change only the document of the language being edited;
- be one undoable action, saved with the document.

A member SHALL be able to unlink a page from its counterparts. The page then gets a translation key of its own again.

#### Scenario: Link a separately built page
- **WHEN** the owner edits the English page "Our story", which has no Czech counterpart, and links it to the Czech page "O nás"
- **THEN** after saving, "Our story" and "O nás" are counterparts: the published "O nás" has an English alternate pointing at "Our story"

#### Scenario: Only unpaired pages offered
- **WHEN** the owner links an English page to a Czech page
- **THEN** Czech pages that already have an English counterpart aren't offered

#### Scenario: Unlink
- **WHEN** the owner unlinks the English "Contact" from its Czech counterpart
- **THEN** "Contact" has a translation key of its own, and the published Czech "Kontakt" has no English alternate

### Requirement: Copying a page into another language
A member SHALL be able to copy a page, as last saved, into another language that has no counterpart of it. The copy SHALL:
- have the page's blocks, images and texts under new node IDs;
- have the page's translation key, so it is the page's counterpart;
- get a slug that is unique in the target language: the page's slug, with a numeric suffix when it is taken;
- get a menu item at the end of the target language's menu, outside any group, when the page has one in its own menu, inside a group or not;
- have links to other pages of the site pointing to their counterparts in the target language, where those exist; links to pages without a counterpart there SHALL stay, and be reported as problems as for a removed page.

Copying SHALL be saved as one new version of the target language's document, and SHALL be refused when the target language already has a counterpart.

#### Scenario: Copy "Ceník" to English
- **WHEN** the owner copies the Czech page "Ceník" (slug `cenik`, in the menu) into English, which doesn't have it
- **THEN** English has a page "Ceník" with slug `cenik`, at the end of its menu, paired with the Czech "Ceník", and its blocks are copies under new IDs

#### Scenario: Copy a page from a menu group
- **WHEN** the owner copies the Czech page "Eventy", which is in the Czech menu's group "Projekty", into English
- **THEN** the English menu ends with a link to the copy, outside any group

#### Scenario: Slug taken
- **WHEN** the English document already has a page with slug `cenik` and the owner copies the Czech "Ceník" into English
- **THEN** the copy's slug is `cenik-2`

#### Scenario: Links follow the language
- **WHEN** the copied page has a text link to the Czech "Kontakt", whose English counterpart is "Contact"
- **THEN** the link in the English copy points to "Contact"

#### Scenario: Already translated
- **WHEN** the owner tries to copy a page into a language that already has its counterpart
- **THEN** copying is refused with a message naming the counterpart

### Requirement: Pages not translated yet
In a language other than the primary, a page SHALL count as not translated yet while its title, or (except for the home page, whose slug isn't part of its address) its slug, is the same as its primary counterpart's. The Website section's Languages page SHALL list, for each language other than the primary:
- its pages not translated yet;
- the primary's pages that have no counterpart in that language;

each with a link that opens it in the editor (the primary's missing pages open in the primary language). The Pages and menu page SHALL mark the pages not translated yet in its list. When there is nothing to list, the Languages page SHALL say the language is fully translated. These are hints: they SHALL NOT be validation problems and SHALL NOT prevent publishing.

#### Scenario: Copied and untouched
- **WHEN** English was added as a copy and the owner has changed only the English home page's title
- **THEN** the Languages page lists "Kontakt" (title and slug unchanged) as not translated yet in English, and doesn't list the home page
- **AND** English can still be published

#### Scenario: Title translated, slug not
- **WHEN** the English "Kontakt" is retitled "Contact" but keeps the slug `kontakt`
- **THEN** it is still listed as not translated yet

#### Scenario: Missing page
- **WHEN** Czech has the page "Ceník" and English has no counterpart
- **THEN** the Languages page lists "Ceník" as missing in English, with a link to it in the Czech editor

#### Scenario: Marked in the page list
- **WHEN** the owner opens the Pages and menu page for English and "Kontakt" isn't translated yet
- **THEN** the list marks "Kontakt" as not translated yet
