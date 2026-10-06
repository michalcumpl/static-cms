# Spec Delta

## MODIFIED Requirements

### Requirement: Problems panel
The editor SHALL list the document's validation problems after each save and whenever the document changes, and clicking a problem SHALL select the node it concerns when that node is on the current page, or switch to the page containing it. A problem about a page's own settings (title, slug, SEO description, home page) SHALL switch to that page and focus the matching field in the page settings panel. A problem about a theme field or the logo SHALL open the Design tab at the field. A problem about a link inside text SHALL switch to the page containing that text and select exactly the linked words. A problem about the business's fields SHALL open the Business section, and one about the site's settings the Website section, as "Settings from the editor" says (see the project-page capability).

The panel SHALL be in the editor's left column, under the pages list, with its own scrolling when the list is long, so the pages stay in view. It SHALL show the number of problems in its heading, and say when there are none. The details column SHALL hold only the settings of the Page and Design tabs and the panel of the selected block.

#### Scenario: Empty heading reported
- **WHEN** the owner inserts a rich text block and leaves its subheading empty
- **THEN** the problems panel lists an empty-heading problem for that subheading

#### Scenario: Go to a problem
- **WHEN** the owner clicks a problem that concerns a node on the current page
- **THEN** that node is selected in the editor

#### Scenario: Go to a slug problem
- **WHEN** the owner clicks a duplicate-slug problem for the Kontakt page
- **THEN** the editor switches to the Kontakt page and focuses its slug field

#### Scenario: Go to a broken text link
- **WHEN** the Kontakt page has been deleted, and the owner, while on another page, clicks the problem "This link points to a page that no longer exists" about the words "stránce Kontakt" on the home page
- **THEN** the editor switches to the home page and selects the words "stránce Kontakt"

#### Scenario: Under the pages
- **WHEN** the editor is open on a site with three problems
- **THEN** the left column shows the pages list and, under it, the problems panel with "3 problems", and the details column has no problems list

#### Scenario: Long list
- **WHEN** the site has thirty problems
- **THEN** the problems list scrolls inside its panel and the pages list stays fully visible above it

#### Scenario: Go to a business problem
- **WHEN** the owner clicks the problem that the phone number isn't in international form
- **THEN** the Business section opens with the phone field focused

### Requirement: Business blocks in the editor
The canvas SHALL show the `contact` and `opening_hours` blocks, and the footer, as the published site will, from the saved business details. The heading of a business block SHALL be editable in place. The details themselves SHALL NOT be editable on the canvas; the block SHALL offer a link to the Business section ("Edit business details"), as "Settings from the editor" says (see the project-page capability). The panel for a selected `contact` or `opening_hours` block SHALL offer its location choice when the business has several locations: "All locations" or one location by name, as one undoable step. The contact block's switches SHALL be shown in the same panel.

#### Scenario: Details follow the settings
- **WHEN** the owner changes the city to "Kolín 2" in the Business section, saves, and opens the editor
- **THEN** the canvas's contact block and footer show "Kolín 2"

#### Scenario: Edit details from a block
- **WHEN** the owner chooses "Edit business details" on a contact block
- **THEN** the Business section opens

#### Scenario: Choose a shop
- **WHEN** the business has the locations "Kolín – Lipová" and "Kutná Hora", and the owner selects a contact block and chooses "Kutná Hora" in its panel
- **THEN** the canvas shows Kutná Hora's details only, and one undo shows all locations again

### Requirement: Design outside the primary language
In a language other than the primary, the Design tab SHALL show the theme and the logo read-only, with the note "Edited in <primary language name>" and a link to the Design tab in the primary language. The whole tab, presets and logo included, SHALL be read-only there. The shared fields of the site and the business are read-only in the same way in the Website and Business sections (see the project-page capability).

#### Scenario: Design in English
- **WHEN** the owner opens the Design tab in English
- **THEN** no preset, colour, font, radius, width, logo or switch can be changed, and the tab says it is edited in Čeština with a link to the Czech Design tab
