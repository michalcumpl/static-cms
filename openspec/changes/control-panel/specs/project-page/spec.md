# Spec Delta

## ADDED Requirements

### Requirement: Project panel
A project SHALL have a panel (control-panel design decision 1): a dashboard and section pages, shown under a header with the project's name, a link back to the project list, and the actions Preview and Open editor. A section bar SHALL link to:
- **Your website**, the dashboard, at `/p/<project>/`;
- **Business** at `/p/<project>/business`;
- **Website** at `/p/<project>/website`, with its subpages Pages and menu (`/website/pages`), Languages (`/website/languages`) and Domain (`/website/domain`);
- **Publish** at `/p/<project>/publish`, with its subpage Versions (`/publish/versions`).

Each page SHALL have its own address, so it can be bookmarked, opened in a new window, and reached with the browser's Back button. The current section SHALL be marked in the way assistive technology announces as the current page, and a subpage SHALL also mark its subpage. The access rules are those of the project (see the accounts capability): members of the project's workspace see every page, others get "not found". The pages that show one language (Business, Website, Pages and menu, Versions) SHALL take it from `?lang=`, the primary language without it, SHALL offer a language choice when the project has more than one language, and SHALL keep the language when the owner moves between them.

#### Scenario: Open a section
- **WHEN** a member opens the Business section of "Pekárna U Lípy"
- **THEN** the header shows the project's name, Business is marked as current in the section bar, and the address is `/p/<project>/business`

#### Scenario: Not a member
- **WHEN** someone who isn't a member of the workspace opens `/p/<project>/website/pages`
- **THEN** they get "not found", as for the other pages

#### Scenario: Keep the language between sections
- **WHEN** the owner chooses English in the Business section and then opens Website
- **THEN** the Website section shows the English site settings

### Requirement: Dashboard
The dashboard SHALL show, at the top, "Your website":
- the site's name;
- its state: "Live" with the site's address as a link, or "Not published yet";
- the Publish button, or, when the workspace isn't connected to hosting, the note and link the Publish section gives;
- the problems of the saved site: the number of errors and warnings, and each problem's message as a link to where it is fixed (a section field, or the editor at the node).

Below it, the dashboard SHALL show one card per section, each with a short summary and a link to it:
- **Business:** the business name (or the site name), the main location's city, and the number of locations when there are several;
- **What you offer:** the number of services and of questions. The card links to the editor, on the first page with a services or questions block, until that section exists;
- **About you:** the number of people and of testimonials. The card links to the editor, on the first page with a team or testimonials block, until that section exists;
- **Website:** the number of pages, the languages, the domain (or the address without one), and the design: its colours as swatches, the heading and body fonts by name, and the logo when there is one;
- **Publish:** the last publish, its state and when it happened, or "Not published yet".

The dashboard SHALL show the primary language.

#### Scenario: Published and valid
- **WHEN** the project has been published and its saved site has no errors
- **THEN** the dashboard shows "Live" with the address, the Publish button enabled, no problems, and the Publish card with the last publish

#### Scenario: A problem leads to its field
- **WHEN** the saved site has an error about the main location's phone and the owner chooses it on the dashboard
- **THEN** the Business section opens with that location's phone field focused

#### Scenario: Errors disable publishing
- **WHEN** the saved site has two errors
- **THEN** the dashboard says so, lists them, and the Publish button is disabled

#### Scenario: Offer card before its section exists
- **WHEN** the site has five services, shown on the page "Služby", and the owner chooses the What you offer card
- **THEN** the editor opens on "Služby"

### Requirement: Website section
The Website section's main page SHALL show, for one language:
- the site settings (see "Site settings"), saved as "Saving a section" says;
- a Design card showing the theme's colours as swatches, the heading and body fonts by name, and the logo, with "Change design", which opens the editor on the home page with the Design tab open;
- links to its subpages Pages and menu, Languages and Domain, each with a one-line summary.

#### Scenario: Change design
- **WHEN** the owner chooses "Change design" in the Website section
- **THEN** the editor opens with the Design tab selected

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

## MODIFIED Requirements

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
The Business section and the Website section's site settings SHALL each save explicitly, as the editor does: a Save button, enabled while there are unsaved changes, and a status that says saving, saved, or why saving failed. Each SHALL save the one language it shows, as one new version, and SHALL NOT touch other languages. Every change SHALL be undoable and redoable with buttons in the section. Leaving the section, the project or the window with unsaved changes SHALL ask first, as the editor does. When the language was changed elsewhere since the section loaded it, saving SHALL be refused with the editor's conflict message and nothing SHALL be overwritten.

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

## REMOVED Requirements

### Requirement: Project tabs
**Reason**: Replaced by "Project panel": a dashboard and section pages instead of six tabs.
**Migration**: `/p/<project>/` is the dashboard; Pages, Languages and the domain are under Website; Publishing and History are under Publish. "Old addresses" redirects the tab addresses.

### Requirement: Overview tab
**Reason**: Replaced by "Dashboard".
**Migration**: The address, live state, Publish button, problems and last publish are on the dashboard.

### Requirement: Pages tab
**Reason**: Replaced by "Pages and menu" in the Website section.
**Migration**: `/p/<project>/pages` redirects to `/p/<project>/website/pages`.

### Requirement: Languages tab
**Reason**: Replaced by "Languages page" in the Website section.
**Migration**: `/p/<project>/languages` redirects to `/p/<project>/website/languages`.

### Requirement: Publishing tab
**Reason**: Split into "Publish section" (publishing, history, ZIP download) and "Domain page" (address and custom domain).
**Migration**: `/p/<project>/publishing` redirects to `/p/<project>/publish`.

### Requirement: History tab
**Reason**: Replaced by "Versions page" in the Publish section.
**Migration**: `/p/<project>/history` redirects to `/p/<project>/publish/versions`, keeping `?lang=`.
