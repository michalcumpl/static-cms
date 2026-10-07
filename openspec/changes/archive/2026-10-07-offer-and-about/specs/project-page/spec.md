## ADDED Requirements

### Requirement: What you offer section
The What you offer section (`/p/<project>/offer`) SHALL show, for one language, two lists:
- **Services:** each with its name, description and price;
- **Questions:** each with its question and answer.

Each list SHALL be edited as "List forms" says, and SHALL say which pages show it (see "Where a list is shown"). The section SHALL save as "Saving settings" says.

#### Scenario: Change a price
- **WHEN** the owner changes the price of "Chléb" in What you offer and chooses Save
- **THEN** the editor opened afterwards shows the new price on every page that shows "Chléb"

#### Scenario: First question
- **WHEN** the site has no questions and the owner chooses "Add a question"
- **THEN** an empty question appears with the caret in it, and Save is enabled

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Dashboard
**Reason**: The dashboard is named Overview in the section bar, and its What you offer and About you cards no longer lead to the editor.
**Migration**: See "Overview", which keeps the dashboard's content with the cards leading to their sections.
