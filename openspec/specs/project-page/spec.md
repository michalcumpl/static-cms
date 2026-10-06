# project-page Specification

## Purpose

The project's page as a set of tabs, one for each thing an owner does with a project outside the editor: see how it stands, manage its pages and languages, publish it, look through its history and edit the site and business settings.

## Requirements

### Requirement: Project tabs
A project SHALL have a page with six tabs, shown under a header with the project's name, a link back to the project list, and the actions Preview and Open editor:
- **Overview** at `/p/<project>/`;
- **Pages** at `/p/<project>/pages`;
- **Languages** at `/p/<project>/languages`;
- **Publishing** at `/p/<project>/publishing`;
- **History** at `/p/<project>/history`;
- **Settings** at `/p/<project>/settings`.

Each tab SHALL be a page of its own with its own address, so it can be bookmarked, opened in a new window, and reached with the browser's Back button. The current tab SHALL be marked, in the way that assistive technology announces as the current page. The access rules are those of the project (see the accounts capability): members of the project's workspace see every tab, others get "not found". The tabs that show one language (Pages, History, Settings) SHALL take it from `?lang=`, the primary language without it, and SHALL offer a language choice when the project has more than one language.

#### Scenario: Open a tab
- **WHEN** a member opens the Pages tab of "Pekárna U Lípy"
- **THEN** the header shows the project's name, the Pages tab is marked as current, and the address is `/p/<project>/pages`

#### Scenario: Not a member
- **WHEN** someone who isn't a member of the workspace opens `/p/<project>/settings`
- **THEN** they get "not found", as for the other tabs

#### Scenario: Keep the language between tabs
- **WHEN** the owner chooses English on the Pages tab and then opens the History tab
- **THEN** the History tab shows the English history

### Requirement: Overview tab
The Overview tab SHALL show how the project stands:
- the site's address, as a link, or "Not published yet";
- the last publish: its state and when it happened, with a link to the Publishing tab;
- the Publish button, or, when the workspace isn't connected to hosting, the note and link the Publishing tab gives;
- whether the saved site is valid: the number of errors and warnings, each with its message;
- the languages, with "(hidden)" for unpublished ones;
- when the site was last saved, and by whom.

#### Scenario: Published and valid
- **WHEN** the project has been published and its saved site has no errors
- **THEN** the Overview shows its address, "Published" with the time, and that the site is valid

#### Scenario: Errors in the saved site
- **WHEN** the saved site has two errors
- **THEN** the Overview says so, lists them, and the Publish button is disabled

#### Scenario: Never published
- **WHEN** the project has never been published
- **THEN** the Overview says "Not published yet" instead of an address

### Requirement: Pages tab
The Pages tab SHALL list the pages of one language, in the order of the document, each with:
- its title and address;
- "Home" for the home page;
- whether it is in the menu;
- in a language other than the primary, whether it is not translated yet (see "Pages not translated yet" in the languages capability);
- links to edit it in the editor and to preview it.

For a language other than the primary, the tab SHALL also list the primary's pages that have no counterpart there, with a link to each in the primary language's editor.

#### Scenario: List the pages
- **WHEN** a site has the pages Domů (home), Služby and Kontakt, and Kontakt isn't in the menu
- **THEN** the tab lists the three in order, marks Domů as home and Kontakt as not in the menu

#### Scenario: Edit from the list
- **WHEN** the owner chooses Edit on Služby
- **THEN** the editor opens on that page

### Requirement: Languages tab
The Languages tab SHALL offer what the languages capability gives a project: adding a language, publishing and hiding one other than the primary, and removing one other than the primary, each with its confirmation. For each language other than the primary it SHALL list the pages not translated yet and the primary's pages missing there, as "Pages not translated yet" describes.

#### Scenario: Add a language
- **WHEN** the owner adds English on the Languages tab
- **THEN** English is listed as hidden, as a copy of the primary language

### Requirement: Publishing tab
The Publishing tab SHALL show what the publishing capability gives a project: the Publish button and its status, the site's address, the custom domain with its DNS records and state, and the publish history with "Make live again". It SHALL also offer to download the published languages as a ZIP archive of the static site, built in the browser from the saved documents, disabled while the saved site has errors.

#### Scenario: Download the site
- **WHEN** the owner chooses to download the ZIP on the Publishing tab
- **THEN** the browser receives `website.zip` with the published languages' files

#### Scenario: Download refused
- **WHEN** the saved site has errors
- **THEN** the download button is disabled and the tab says why

### Requirement: History tab
The History tab SHALL show the history of one language, as the version-history capability describes: its versions, previewing them and restoring them. Its language choice SHALL be the tab's.

#### Scenario: Open a version
- **WHEN** the owner chooses Preview on a version in the History tab
- **THEN** that version opens read-only, with a link back to the History tab

### Requirement: Site settings
The Settings tab SHALL show the site's settings for one language, with:
- the site name;
- the site description;
- the favicon;
- the default share image, with its description;
- the switches "AI search and answers" and "AI training", each with a sentence explaining what it allows.

The favicon and default share image SHALL be chosen from the media library, shown as thumbnails (the favicon as the square icon it becomes), and be changeable and removable.

#### Scenario: Rename the site
- **WHEN** the owner changes the site name to "Anideti Brno" on the Settings tab and saves
- **THEN** the saved document's site name is "Anideti Brno", and the editor shows it in the canvas's header

#### Scenario: Choose a favicon
- **WHEN** the owner chooses a logo from the library as the favicon and saves
- **THEN** the saved site's favicon is that image, with its media key, width and height, and the tab shows a square thumbnail

#### Scenario: Switch off AI training
- **WHEN** the owner switches "AI training" off and saves
- **THEN** the saved document has AI training not allowed, and the next export's `robots.txt` disallows the AI training crawlers

### Requirement: Business settings
The Settings tab SHALL show the business the site is for, with:
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
The Settings tab SHALL save explicitly, as the editor does: a Save button, enabled while there are unsaved changes, and a status that says saving, saved, or why saving failed. It SHALL save the one language it shows, as one new version, and SHALL NOT touch other languages. Every change SHALL be undoable and redoable with buttons in the tab. Leaving the tab, the project or the window with unsaved changes SHALL ask first, as the editor does. When the language was changed elsewhere since the tab loaded it, saving SHALL be refused with the editor's conflict message and nothing SHALL be overwritten.

The tab SHALL list the problems the saved settings have (see the site-document capability), each leading to its field.

#### Scenario: Save
- **WHEN** the owner changes the city and chooses Save
- **THEN** the status says saved, Save is disabled, and the editor opened afterwards shows the new city in its contact block

#### Scenario: Unsaved changes
- **WHEN** the owner changes the phone and follows the Overview tab without saving
- **THEN** they are asked whether to leave, and staying keeps the change

#### Scenario: Changed elsewhere
- **WHEN** the owner saves a change in the editor in another window, and then saves on the Settings tab, which was opened before
- **THEN** the Settings tab refuses with the conflict message, and the editor's change is kept

#### Scenario: Go to a problem
- **WHEN** the tab lists that Wednesday's hours overlap and the owner selects the problem
- **THEN** Wednesday's first time field is focused

### Requirement: Shared settings outside the primary language
In a language other than the primary, the shared fields of the Settings tab (see "Shared fields" in the languages capability) SHALL be read-only, with the note "Edited in <primary language name>" and a link to the Settings tab in the primary language. Translatable fields stay editable:
- the site name and description;
- the default share image's description;
- the business name;
- each location's name and the note on its opening hours.

#### Scenario: Phone in English
- **WHEN** the owner opens the Settings tab in English
- **THEN** the phone field can't be edited and says it is edited in Čeština, and the note on the opening hours can be edited

### Requirement: Settings from the editor
Problems about the site's or the business's fields, and "Edit business details" on a business block, SHALL lead to the Settings tab of the language being edited, at the field concerned. When the editor has unsaved changes, it SHALL ask to save them first, as leaving the editor does. The editor's left column SHALL link to the Settings tab.

#### Scenario: Edit business details
- **WHEN** the owner chooses "Edit business details" on a contact block in the editor
- **THEN** the Settings tab opens, at the business settings

#### Scenario: Unsaved changes on the way
- **WHEN** the editor has unsaved changes and the owner follows a problem about the phone number
- **THEN** the editor asks to save first, and then the Settings tab opens with the phone field focused
