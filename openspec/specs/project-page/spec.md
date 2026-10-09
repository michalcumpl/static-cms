# project-page Specification

## Purpose

The project's control panel, organised the way an owner thinks: an Overview of how the site stands, then the Business, What you offer, About you, Website and Publish sections, with the tools (pages and menu, languages, domain, versions) one level down.

## Requirements

### Requirement: Site settings
The Website section SHALL show the site's settings for one language, with:
- the site name;
- the site description;
- the favicon;
- the default share image, with its description;
- the switches "AI search and answers" and "AI training", each with a sentence explaining what it allows.

The favicon and default share image SHALL be chosen from the media library, shown as thumbnails (the favicon as the square icon it becomes), and be changeable and removable.

#### Scenario: Rename the site
- **WHEN** the owner changes the site name to "Anideti Brno" in the Website section and saves
- **THEN** the saved document's site name is "Anideti Brno", and the editor shows it in the canvas's header

#### Scenario: Choose a favicon
- **WHEN** the owner chooses a logo from the library as the favicon and saves
- **THEN** the saved site's favicon is that image, with its media key, width and height, and the section shows a square thumbnail

#### Scenario: Switch off AI training
- **WHEN** the owner switches "AI training" off and saves
- **THEN** the saved document has AI training not allowed, and the next export's `robots.txt` disallows the AI training crawlers

### Requirement: Business settings
The Business section SHALL show the business the site is for, with:
- the business name, with the site name shown as the placeholder;
- the type of business, as a list of names owners understand (such as "Bakery" and "Café");
- its locations, in order, each with:
  - its name;
  - the street, postal code, city and country;
  - the phone and email;
  - the map address;
  - the weekly opening hours, and the note;
- the social profiles;
- the "Show contact details in the footer" switch.

Locations SHALL be added with "Add a location", which adds an empty one at the end, and SHALL have buttons to remove one and to move one up or down, each one undoable step. The first location SHALL be marked as the main one. The only location SHALL NOT be removable, and its name field SHALL say that a name is needed once there are several. Removing a location that a contact or opening hours block chose SHALL say so first ("Shown on Kontakt") and set those blocks to all locations.

Text fields SHALL be applied when typed, except the phone. The phone SHALL be applied when the owner leaves the field, normalised to international form:
- spaces, dashes and brackets are removed;
- a leading `00` becomes `+`;
- a number without a country code gets the country's code (`+420` for `CZ`, `+421` for `SK`).

A number that can't be normalised SHALL be kept as typed and reported as a problem.

The opening hours SHALL list Monday to Sunday. Each day shows its ranges as pairs of time fields, with buttons to add and remove a range. A day without ranges SHALL read "Closed". An action SHALL copy Monday's hours to Tuesday to Friday, within one location.

The social profiles SHALL be a list of address fields, with buttons to add a profile, remove one, and move one up or down. Each filled-in field SHALL show the kind of profile it recognises ("Instagram"), or the host for other addresses. An address typed without a scheme (`instagram.com/pekarna`) SHALL get `https://` when the owner leaves the field.

#### Scenario: Normalise the phone
- **WHEN** the owner types `321 123 456` into the phone field of a business in `CZ` and leaves the field
- **THEN** the business's phone is `+420321123456`, and the field shows `+420 321 123 456`

#### Scenario: Lunch break
- **WHEN** the owner sets Monday to 08:00–12:00 and adds a range 13:00–17:00
- **THEN** Monday has two ranges, and after saving the editor's opening hours block shows "8:00–12:00, 13:00–17:00"

#### Scenario: Copy Monday to the weekdays
- **WHEN** Monday is 06:00–17:00 and the owner copies Monday's hours to Tuesday to Friday
- **THEN** Tuesday to Friday have one range 06:00–17:00 each, and one undo restores their previous hours

#### Scenario: Add an Instagram profile
- **WHEN** the owner adds a profile, types `instagram.com/pekarnaulipy` and leaves the field
- **THEN** the profile is `https://instagram.com/pekarnaulipy`, the field says "Instagram", and after saving the published footer links to it

#### Scenario: Add a second shop
- **WHEN** the owner adds a location, names it "Kutná Hora", fills in its address and opening hours, and saves
- **THEN** the business has two locations, the first marked as the main one, and the published footer shows both

#### Scenario: Remove a chosen location
- **WHEN** a contact block on "Kontakt" chose "Kutná Hora" and the owner removes "Kutná Hora"
- **THEN** the settings say it is shown on "Kontakt", and after removing it that block shows all locations

### Requirement: Saving settings
The Business, What you offer and About you sections and the Website section's site settings SHALL each save explicitly, as the editor does: a Save button, enabled while there are unsaved changes, and a status that says saving, saved, or why saving failed. Each SHALL save the one language it shows, as one new version, and SHALL NOT touch other languages. Every change SHALL be undoable and redoable with buttons in the section. Leaving the section, the project or the window with unsaved changes SHALL ask first, as the editor does. When the language was changed elsewhere since the section loaded it, saving SHALL be refused with the editor's conflict message and nothing SHALL be overwritten.

Each section SHALL list the problems the saved document has about its own fields (see the site-document capability), each leading to its field.

#### Scenario: Save
- **WHEN** the owner changes the city and chooses Save
- **THEN** the status says saved, Save is disabled, and the editor opened afterwards shows the new city in its contact block

#### Scenario: Unsaved changes
- **WHEN** the owner changes the phone in the Business section and opens the dashboard without saving
- **THEN** they are asked whether to leave, and staying keeps the change

#### Scenario: Changed elsewhere
- **WHEN** the owner saves a change in the editor in another window, and then saves in the Business section, which was opened before
- **THEN** the Business section refuses with the conflict message, and the editor's change is kept

#### Scenario: Go to a problem
- **WHEN** the Business section lists that Wednesday's hours overlap and the owner selects the problem
- **THEN** Wednesday's first time field is focused

#### Scenario: Go to an item's problem
- **WHEN** the third service has no name and the owner selects the problem in What you offer
- **THEN** the third service's name field has the caret

### Requirement: Shared settings outside the primary language
In a language other than the primary, the shared fields of the Business and Website sections (see "Shared fields" in the languages capability) SHALL be read-only, with the note "Edited in <primary language name>" and a link to the same section in the primary language. Translatable fields stay editable:
- the site name and description;
- the default share image's description;
- the business name;
- each location's name and the note on its opening hours.

#### Scenario: Phone in English
- **WHEN** the owner opens the Business section in English
- **THEN** the phone field can't be edited and says it is edited in Čeština, and the note on the opening hours can be edited

### Requirement: Settings from the editor
Problems about the business's fields, and "Edit business details" on a business block, SHALL lead to the Business section of the language being edited, at the field concerned; problems about the site's settings SHALL lead to the Website section. When the editor has unsaved changes, it SHALL ask to save them first, as leaving the editor does. The editor's left column SHALL link to the dashboard.

#### Scenario: Edit business details
- **WHEN** the owner chooses "Edit business details" on a contact block in the editor
- **THEN** the Business section opens

#### Scenario: Unsaved changes on the way
- **WHEN** the editor has unsaved changes and the owner follows a problem about the phone number
- **THEN** the editor asks to save first, and then the Business section opens with the phone field focused

### Requirement: Project panel
A project SHALL have a panel (control-panel design decision 1): a dashboard and section pages, shown under a header with the project's name, a link back to the project list, and the actions Preview and Open editor. A section bar SHALL link to:
- **Overview**, the dashboard, at `/p/<project>/`;
- **Business** at `/p/<project>/business`;
- **What you offer** at `/p/<project>/offer`;
- **About you** at `/p/<project>/about`;
- **Website** at `/p/<project>/website`, with its subpages Pages and menu (`/website/pages`), Languages (`/website/languages`) and Domain (`/website/domain`);
- **Publish** at `/p/<project>/publish`, with its subpage Versions (`/publish/versions`).

Each page SHALL have its own address, so it can be bookmarked, opened in a new window, and reached with the browser's Back button. The current section SHALL be marked in the way assistive technology announces as the current page, and a subpage SHALL also mark its subpage. The access rules are those of the project (see the accounts capability): members of the project's workspace see every page, others get "not found". The pages that show one language (Business, What you offer, About you, Website, Pages and menu, Versions) SHALL take it from `?lang=`, the primary language without it, SHALL offer a language choice when the project has more than one language, and SHALL keep the language when the owner moves between them.

#### Scenario: Open a section
- **WHEN** a member opens the Business section of "Pekárna U Lípy"
- **THEN** the header shows the project's name, Business is marked as current in the section bar, and the address is `/p/<project>/business`

#### Scenario: Not a member
- **WHEN** someone who isn't a member of the workspace opens `/p/<project>/offer`
- **THEN** they get "not found", as for the other pages

#### Scenario: Keep the language between sections
- **WHEN** the owner chooses English in the Business section and then opens What you offer
- **THEN** What you offer shows the English services

### Requirement: Website section
The Website section's main page SHALL show, for one language:
- the site settings (see "Site settings"), saved as "Saving a section" says;
- a Design card showing the site's template by name with its description, the theme's colours as swatches, the heading and body fonts by name, and the logo, with "Change design", which opens the editor on the home page with the Design tab open;
- a Home page sections card (see "Home page sections");
- links to its subpages Pages and menu, Languages and Domain, each with a one-line summary.

#### Scenario: Change design
- **WHEN** the owner chooses "Change design" in the Website section
- **THEN** the editor opens with the Design tab selected

#### Scenario: Template named
- **WHEN** the owner opens the Website section of a site using Standard, with the interface in English
- **THEN** the Design card says "Template: Standard" with Standard's English description

### Requirement: Pages and menu
The Pages and menu page SHALL list the pages of one language, in the order of the document, each with:
- its title and address;
- "Home" for the home page;
- whether it is in the menu;
- in a language other than the primary, whether it is not translated yet (see "Pages not translated yet" in the languages capability);
- links to edit it in the editor and to preview it.

For a language other than the primary, the page SHALL also list the primary's pages that have no counterpart there, with a link to each in the primary language's editor.

#### Scenario: List the pages
- **WHEN** a site has the pages Domů (home), Služby and Kontakt, and Kontakt isn't in the menu
- **THEN** the page lists the three in order, marks Domů as home and Kontakt as not in the menu

#### Scenario: Edit from the list
- **WHEN** the owner chooses Edit on Služby
- **THEN** the editor opens on that page

### Requirement: Languages page
The Languages page SHALL offer what the languages capability gives a project: adding a language, publishing and hiding one other than the primary, and removing one other than the primary, each with its confirmation. For each language other than the primary it SHALL list the pages not translated yet and the primary's pages missing there, as "Pages not translated yet" describes.

#### Scenario: Add a language
- **WHEN** the owner adds English on the Languages page
- **THEN** English is listed as hidden, as a copy of the primary language

### Requirement: Domain page
The Domain page SHALL show the site's address, and the custom domain with its DNS records and state, as the publishing capability describes, with setting, checking and removing the domain.

#### Scenario: Set a domain
- **WHEN** the owner sets the domain `pekarna.cz` on the Domain page
- **THEN** the page shows the DNS records to create and the domain's state

### Requirement: Publish section
The Publish section SHALL show what the publishing capability gives a project: the Publish button and its status, and the publish history with "Make live again". It SHALL link to the Domain page for the address and domain, and to the Versions page. It SHALL also offer to download the published languages as a ZIP archive of the static site, built in the browser from the saved documents, disabled while the saved site has errors.

#### Scenario: Download the site
- **WHEN** the owner chooses to download the ZIP in the Publish section
- **THEN** the browser receives `website.zip` with the published languages' files

#### Scenario: Download refused
- **WHEN** the saved site has errors
- **THEN** the download button is disabled and the section says why

### Requirement: Versions page
The Versions page SHALL show the history of one language, as the version-history capability describes: its versions, previewing them and restoring them. Its language choice SHALL be the panel's.

#### Scenario: Open a version
- **WHEN** the owner chooses Preview on a version on the Versions page
- **THEN** that version opens read-only, with a link back to the Versions page

### Requirement: Old addresses
The addresses of the former tabs SHALL redirect permanently to their new places, keeping `?lang=`:
- `/p/<project>/settings` to the Business section, or, when `?focus=` names a site settings field, to the Website section with that `?focus=`; a business field's `?focus=` is kept;
- `/p/<project>/pages` to `/website/pages`;
- `/p/<project>/languages` to `/website/languages`;
- `/p/<project>/publishing` to `/publish`;
- `/p/<project>/history` to `/publish/versions`, and `/history/<version>/` to `/publish/versions/<version>/`.

#### Scenario: A bookmarked History tab
- **WHEN** the owner opens `/p/<project>/history?lang=en`
- **THEN** they land on `/p/<project>/publish/versions?lang=en`

#### Scenario: A site field from an old link
- **WHEN** someone opens `/p/<project>/settings?focus=site-settings-description`
- **THEN** they land in the Website section with the description field focused

### Requirement: What you offer section
The What you offer section (`/p/<project>/offer`) SHALL show, for one language, three lists:
- **Services:** each with its name, description and price, and when services have their own pages, its address and page text (see "Item pages in What you offer");
- **Projects:** each with its name, category, summary, text (paragraphs, subheadings, lists, bold, italic and links), facts (a label and a value each, added, moved and removed in the form), cover image, photos with their captions (added several at once, moved and removed), video address, and when projects have their own pages, its address. The list SHALL also hold the project categories: added, renamed, moved and deleted there. Deleting a category SHALL leave its projects without a category and its blocks showing all categories, in the same undoable step, after saying how many projects and blocks use it;
- **Questions:** each with its question and answer.

Each list SHALL be edited as "List forms" says, and SHALL say which pages show it (see "Where a list is shown"). The section SHALL save as "Saving settings" says.

#### Scenario: Change a price
- **WHEN** the owner changes the price of "Chléb" in What you offer and chooses Save
- **THEN** the editor opened afterwards shows the new price on every page that shows "Chléb"

#### Scenario: First question
- **WHEN** the site has no questions and the owner chooses "Add a question"
- **THEN** an empty question appears with the caret in it, and Save is enabled

#### Scenario: Add a project
- **WHEN** the owner chooses "Add a project", types "PETROF 160", picks the category "Výstavy", adds the facts "Rok: 2024" and "Klient: Národní technické muzeum", a cover and seven photos, and saves
- **THEN** the project is the last of the collection, and every block showing all projects of all categories or of "Výstavy" shows its tile

#### Scenario: Delete a category
- **WHEN** the owner deletes the category "Eventy", which 24 projects and one block use, and confirms
- **THEN** the 24 projects have no category, the block shows all categories, and one Undo brings everything back

### Requirement: About you section
The About you section (`/p/<project>/about`) SHALL show, for one language, two lists:
- **People:** each with a portrait, name, role and short text;
- **Testimonials:** each with a photo, quote, the person's name and a detail.

Each list SHALL be edited as "List forms" says, and SHALL say which pages show it (see "Where a list is shown"). The section SHALL save as "Saving settings" says.

#### Scenario: Add a person with a portrait
- **WHEN** the owner adds a person, types the name "Jana Nováková", chooses a portrait from the media library, describes it and chooses Save
- **THEN** the team blocks showing all people show Jana with her portrait

### Requirement: List forms
Each list of the What you offer and About you sections SHALL show its items in collection order, each as a group of labelled fields named after the item ("Service 2: Rohlíky", "Question 1"). The fields SHALL be edited through the editor's session (control-panel design decision "a"):
- the description, the short text and the answer SHALL keep bold, italic and links, set with a formatting toolbar and the editor's shortcuts;
- the other texts SHALL be plain, on one line.

Each item SHALL offer Move up, Move down, Duplicate and Delete, and each list SHALL end with "Add a service" (and likewise "Add a question", "Add a person", "Add a testimonial"). They SHALL act on the collection as the editor's item actions do in a block showing all items (see "Items in collection blocks" in the site-editing capability):
- a new or duplicated item SHALL NOT be added to blocks showing chosen items;
- moving SHALL change the collection's order and so every block showing all items, and SHALL NOT change the order of blocks showing chosen items;
- deleting SHALL remove the item from its collection and from every block that chose it. When pages show the item, Delete SHALL say on how many ("Shown on 2 pages") and ask first.

Portraits and photos SHALL be chosen from the media library, with a description field, and SHALL be removable. Every action SHALL be one undoable step.

#### Scenario: Move a service
- **WHEN** the owner moves "Dorty" up in What you offer
- **THEN** "Dorty" comes before the service that preceded it, in the list and on every page showing all services

#### Scenario: Delete a highlighted service
- **WHEN** the owner deletes "Rohlíky", which the home page's block chose and the "Služby" page shows with all services
- **THEN** they are asked first, with "Shown on 2 pages", and after confirming "Rohlíky" is gone from the list and from both pages; one Undo brings it back everywhere

#### Scenario: Bold in an answer
- **WHEN** the owner selects a word in an answer and chooses Bold
- **THEN** the word is bold in the form and on the published FAQ

#### Scenario: Duplicate a person
- **WHEN** the owner duplicates "Jana Nováková"
- **THEN** a copy with the same texts and portrait appears right after her, and blocks showing chosen people don't show it

### Requirement: Where a list is shown
Each list SHALL say which pages show any of its items: through a block showing all of the collection, or one that chose items. Each page SHALL be a link to the editor on that page, which asks to save first when the section has unsaved changes. When no page shows the list, it SHALL say so, and that a block showing it is added in the editor.

#### Scenario: Services on two pages
- **WHEN** the home page chose two services and the "Služby" page shows all of them
- **THEN** the Services list says it is shown on "Úvod" and "Služby", each a link to the editor on that page

#### Scenario: Questions on no page
- **WHEN** the site has questions but no page has a questions block
- **THEN** the Questions list says no page shows it yet

### Requirement: Lists outside the primary language
In a language other than the primary, the What you offer and About you sections SHALL let the owner edit the items' texts, and SHALL NOT let them add, delete, duplicate or move items, or change portraits and photos: those actions SHALL be disabled with the reason "Services are added and removed in <primary language name>" (and likewise for the other lists), and a link to the same section in the primary language. Image descriptions stay editable while the image is the primary's.

#### Scenario: Translate a service
- **WHEN** the owner opens What you offer in English, changes "Chléb" to "Bread" and chooses Save
- **THEN** the English pages show "Bread", the Czech ones "Chléb", and Add, Delete and the move buttons are disabled with the reason "Services are added and removed in Čeština"

### Requirement: Overview
The dashboard, "Overview", SHALL show at the top:
- the site's name;
- its state: "Live" with the site's address as a link, or "Not published yet";
- the Publish button, or, when the workspace isn't connected to hosting, the note and link the Publish section gives;
- the problems of the saved site: the number of errors and warnings, and each problem's message as a link to where it is fixed (a section field, an item's field in What you offer or About you, or the editor at the node).

Below it, the dashboard SHALL show one card per section, each with a short summary and a link to it:
- **Business:** the business name (or the site name), the main location's city, and the number of locations when there are several;
- **What you offer:** the number of services and of questions;
- **About you:** the number of people and of testimonials;
- **Website:** the number of pages, the languages, the domain (or the address without one), and the design: its colours as swatches, the heading and body fonts by name, and the logo when there is one;
- **Publish:** the last publish, its state and when it happened, or "Not published yet".

The dashboard SHALL show the primary language.

#### Scenario: Published and valid
- **WHEN** the project has been published and its saved site has no errors
- **THEN** the dashboard shows "Live" with the address, the Publish button enabled, no problems, and the Publish card with the last publish

#### Scenario: A problem leads to its field
- **WHEN** the saved site has an error about the main location's phone and the owner chooses it on the dashboard
- **THEN** the Business section opens with that location's phone field focused

#### Scenario: An item's problem leads to its field
- **WHEN** the saved site's second question has no answer and the owner chooses the problem on the dashboard
- **THEN** What you offer opens with the caret in the second question's answer

#### Scenario: Errors disable publishing
- **WHEN** the saved site has two errors
- **THEN** the dashboard says so, lists them, and the Publish button is disabled

#### Scenario: Offer card
- **WHEN** the site has five services and the owner chooses the What you offer card
- **THEN** the What you offer section opens

### Requirement: Delete website
For workspace owners, the Website section's main page SHALL end with a "Delete website" area, apart from the settings and not part of what Save saves. Choosing **Delete website** SHALL open a confirmation that:
- says the website can be restored, with its pages, versions and images, from "Deleted websites" in the project list;
- when the website is published, says it goes offline at once, and names its address and custom domain;
- when it was published but the workspace is no longer connected to Netlify, says the old site stays on Netlify until it is removed there;
- enables its Delete button only once the website's name has been typed exactly.

When the website has unsaved changes, deleting SHALL discard them without asking to save. After deleting, the owner SHALL see the project list with a note that the website was deleted and can be restored there. Editors SHALL NOT see the area.

#### Scenario: Confirm with the name
- **WHEN** an owner chooses Delete website on "Pekárna U Lípy" and types "Pekárna U Lípy"
- **THEN** the Delete button is enabled, and choosing it deletes the website and shows the project list with the note

#### Scenario: Published website
- **WHEN** an owner opens the confirmation for a website published at `pekarna-u-lipy.netlify.app`
- **THEN** it says the website goes offline at once at that address

#### Scenario: Editor
- **WHEN** an editor opens the Website section
- **THEN** there is no Delete website area

### Requirement: Item pages in What you offer
The Services and Projects lists SHALL each start with the choice "Each service has its own page" ("Each project has its own page"), off or on, and when on, the page that lists them, chosen from the language's pages other than the home page. Turning it on SHALL give every item without an address one made from its name, unique within the collection, in the same undoable step. Turning it off SHALL keep the addresses.

While the collection has a listing page, every item SHALL show its address as a field with the full path before it (`/prace/`), and a link "Open page" to its page in the preview. A service SHALL then also show its page text, edited with paragraphs, subheadings, lists, bold, italic and links. A new item's address SHALL follow its name as it is typed, until the owner changes the address.

#### Scenario: Give the practice areas pages
- **WHEN** the owner turns on "Each service has its own page" for Mareš Partners, chooses "Specializace" and saves
- **THEN** each of the eight services has an address made from its name, a page text field, and an "Open page" link to `/specializace/<address>/` in the preview

#### Scenario: Address already taken
- **WHEN** two projects are both named "Designblok" when pages are turned on
- **THEN** they get the addresses `designblok` and `designblok-2`

#### Scenario: Home page not offered
- **WHEN** the owner chooses the projects' listing page
- **THEN** the home page is not among the choices

### Requirement: Home page sections
The Website section's Home page sections card SHALL list the blocks of the language's home page in page order, each by the name the editor uses for it ("Hero", "Services block") followed by its heading when it has one, with a "Show on website" switch that hides or shows the block (see "Hidden blocks" in the site-document capability). The switches SHALL be part of what the section's Save saves. The card SHALL link to the editor on the home page ("Edit home page"), which asks to save first when the section has unsaved changes.

In a language other than the primary, the card SHALL list that language's home page, and its switches SHALL work there, since each language has its own pages.

#### Scenario: Turn off the testimonials
- **WHEN** the owner turns off "Show on website" for "Testimonials block · Co říkají zákazníci" and saves
- **THEN** the published home page, after the next publish, has no testimonials, and the block is still in the editor, marked "Hidden"

#### Scenario: Unsaved switch
- **WHEN** the owner turns a switch off and chooses "Edit home page" without saving
- **THEN** the panel asks to save first
