# Spec Delta

## ADDED Requirements

### Requirement: Page actions menu
Every entry of the editor's pages list SHALL have a "⋯" button, named for the entry ("Actions for “Kontakt”"), that opens a menu with the actions for it. Entries of the menu section and of the "Not in menu" section SHALL have it alike. The menu SHALL work as a menu button does: arrow keys move, Enter chooses, Escape closes and returns focus to the button.

For a page the menu SHALL offer:
- **Rename**, which asks for a new title and applies it as the title field does, including the slug and menu label that follow it;
- **Duplicate**;
- **Move up** and **Move down**, for a page in the menu, which move its menu item;
- **Show in menu** or **Remove from menu**;
- **Set as home**;
- **Delete**, which confirms and counts the links to the page as "Deleting pages" says.

For an external link of the menu it SHALL offer **Edit**, **Move up**, **Move down** and **Remove from menu**.

An action that can't be used SHALL be shown disabled with the reason: Move up on the first menu entry, Move down on the last, Set as home on the home page ("Already the home page"), Delete on the home page and on the only page. Each action SHALL be one undoable action. The pages list SHALL NOT have separate ↑ and ↓ buttons; dragging entries SHALL still work.

#### Scenario: Delete from the list
- **WHEN** the owner opens the "⋯" menu of the page "Kontakt" and chooses Delete, and confirms
- **THEN** the page and its menu item are gone, as when deleting from the page's settings before, and one undo brings them back

#### Scenario: Move in the menu
- **WHEN** the owner chooses Move up from the menu of "Kontakt", which is second in the menu
- **THEN** "Kontakt" is first in the menu, on the canvas's navigation too

#### Scenario: Home page can't be deleted
- **WHEN** the owner opens the menu of the home page
- **THEN** Delete is disabled and says another page must be set as home first, and Set as home is disabled and says "Already the home page"

#### Scenario: Rename
- **WHEN** the owner chooses Rename on "O nás" and enters "O firmě"
- **THEN** the page's title is "O firmě", and its slug and menu label follow as they do for the title field

#### Scenario: Keyboard
- **WHEN** the owner tabs to a page's "⋯" button, presses Enter, then the down arrow until Delete is focused, and Enter
- **THEN** the confirmation to delete the page opens

#### Scenario: Not in the menu
- **WHEN** the owner opens the menu of a page under "Not in menu"
- **THEN** it offers "Show in menu" and has no Move up or Move down

### Requirement: Business blocks in the editor
The canvas SHALL show the `contact` and `opening_hours` blocks, and the footer, as the published site will, from the saved business details. The heading of a business block SHALL be editable in place. The details themselves SHALL NOT be editable on the canvas; the block SHALL offer a link to the Settings tab ("Edit business details"), as "Settings from the editor" says (see the project-page capability). The contact block's switches SHALL be shown in a panel for the selected block.

#### Scenario: Details follow the settings
- **WHEN** the owner changes the city to "Kolín 2" on the Settings tab, saves, and opens the editor
- **THEN** the canvas's contact block and footer show "Kolín 2"

#### Scenario: Edit details from a block
- **WHEN** the owner chooses "Edit business details" on a contact block
- **THEN** the Settings tab opens, at the business settings

### Requirement: Design outside the primary language
In a language other than the primary, the Design tab SHALL show the theme and the logo read-only, with the note "Edited in <primary language name>" and a link to the Design tab in the primary language. The whole tab, presets and logo included, SHALL be read-only there. The shared fields of the site and the business are read-only in the same way on the Settings tab (see the project-page capability).

#### Scenario: Design in English
- **WHEN** the owner opens the Design tab in English
- **THEN** no preset, colour, font, radius, width, logo or switch can be changed, and the tab says it is edited in Čeština with a link to the Czech Design tab

## MODIFIED Requirements

### Requirement: Problems panel
The editor SHALL list the document's validation problems after each save and whenever the document changes, and clicking a problem SHALL select the node it concerns when that node is on the current page, or switch to the page containing it. A problem about a page's own settings (title, slug, SEO description, home page) SHALL switch to that page and focus the matching field in the page settings panel. A problem about a theme field or the logo SHALL open the Design tab at the field. A problem about a link inside text SHALL switch to the page containing that text and select exactly the linked words. A problem about the site's or the business's fields SHALL open the Settings tab, as "Settings from the editor" says (see the project-page capability).

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
- **THEN** the Settings tab opens with the phone field focused

### Requirement: Page settings panel
The editor SHALL show a settings panel for the current page with:
- its title, slug and SEO description;
- its share image;
- a "show in menu" switch.

The actions to duplicate, delete and set the page as home are in the page's menu in the pages list (see "Page actions menu"), not in this panel.

Changes to the title and SEO description SHALL apply to the document as the owner types. The slug field SHALL apply its value when the owner leaves the field or confirms it, normalised by slugifying; while typing, the panel SHALL show the slug that will be applied and the page's resulting address. For the home page, the panel SHALL explain that the page is served at the site root and that its slug is used only if it stops being home. An empty title or an empty slug after normalising SHALL be reported as a problem rather than refused.

The share image SHALL be:
- chosen from the media library;
- shown as a thumbnail with its description, which the owner can edit;
- changeable and removable.

When the page has none, the panel SHALL say that the site's default share image is used, or that there is none. Choosing, changing and removing the share image SHALL each be one undoable action.

#### Scenario: Edit the title
- **WHEN** the owner types "O nás" into the title field of a page without a hero
- **THEN** the page title on the canvas and in the sidebar shows "O nás"

#### Scenario: Normalise the slug
- **WHEN** the owner types `O Nás!` into the slug field and leaves it
- **THEN** the page's slug is `o-nas`

#### Scenario: Choose a share image
- **WHEN** the owner chooses a photo from the library as the share image of "Kontakt"
- **THEN** the page's share image list holds one image node with that photo's media key, width and height, and the panel shows its thumbnail

#### Scenario: Undo removing the share image
- **WHEN** the owner removes the page's share image and then undoes
- **THEN** the share image is back

### Requirement: Adding blocks on the canvas
The canvas SHALL offer a "+ Add block" button at every place a block can go: above the first block, between two blocks, and after the last. A page without blocks SHALL show one "+ Add block" button at all times. The buttons of a place SHALL show while the pointer is near it, and the ones above and below the block holding the caret or selection SHALL also show, so they can be reached without hovering. They SHALL not cover the page's text.

Activating a "+ Add block" button, or Add block above or below in a block's handle menu, SHALL open a block picker for that place. The picker SHALL show every block type, in a fixed order, as a grid of cards. Each card SHALL have:
- a simple drawing of the block: a wireframe sketch of its layout, with its buttons and accents in the site's primary colour. The drawing is decorative and hidden from assistive technology, since the name and description say the same;
- its standard name, as used elsewhere in the editor;
- a one-line description of what it shows;
- when it can't go at that place, a disabled state and the reason, such as "Only at the top of a page without a hero".

The picker SHALL be operable with the keyboard: arrow keys move between cards, Enter chooses, Escape closes. Escape SHALL close it without inserting and return focus to where it was opened from. Choosing a block SHALL insert it at that place as one undoable step.

After a block is inserted, the editor SHALL:
- scroll it into view when it isn't fully visible;
- highlight it briefly;
- put the caret in its first text, as inserting does today.

#### Scenario: Add between two blocks
- **WHEN** the owner points between the services block and the text block, clicks "+ Add block" and picks Opening hours
- **THEN** an opening hours block appears between them, scrolled into view and briefly highlighted, with the caret in its heading
- **AND** one undo removes it

#### Scenario: Add below from the handle
- **WHEN** the owner opens the services block's handle menu and chooses Add block below, then picks Gallery
- **THEN** a gallery block appears right after the services block

#### Scenario: Hero greyed out with a reason
- **WHEN** the owner opens the picker between two blocks
- **THEN** Hero is disabled and says it only goes at the top of a page without a hero, and every other block is enabled

#### Scenario: Pictures in the picker
- **WHEN** the picker is open
- **THEN** every block is a card with a drawing of the block, its name and its description, such as "Opening hours" with "Your weekly hours, from the business settings"

#### Scenario: Empty page
- **WHEN** the owner opens a page without blocks
- **THEN** one "+ Add block" button is shown, and choosing Text in its picker gives the page a text block with the caret in it

#### Scenario: No Add block buttons in the left column
- **WHEN** the editor is open
- **THEN** the left column has the pages and no buttons for adding blocks

#### Scenario: Close the picker
- **WHEN** the owner opens the picker and presses Escape
- **THEN** the picker closes, nothing is inserted, and focus returns to the button that opened it

#### Scenario: Touch
- **WHEN** the caret is in the services block and the pointer isn't over the canvas
- **THEN** the "+ Add block" buttons above and below the services block are shown

## RENAMED Requirements

- FROM: `### Requirement: Theme tab`
- TO: `### Requirement: Design tab`

## MODIFIED Requirements

### Requirement: Design tab
The editor's settings column SHALL have a Design tab next to Page, with:
- **Presets:** each preset shown by its name, a swatch of its colours and a sample in its heading font. Choosing one applies it (see "Theme presets" in the theming capability).
- **Colours:** primary, secondary, background and text, each with a colour picker and a hex text field. A hex value SHALL be applied as soon as it is a valid colour; an incomplete value SHALL not change the document.
- **Contrast:** each contrast pair (see "Theme colour contrast" in the theming capability) with a sample, its measured ratio and whether it passes, updated as the colours change.
- **Fonts:** a heading font and a body font, each chosen from the catalog, every option shown in its own typeface and labelled with its name and kind.
- **Corner radius:** Square (`0`), Soft (`0.5rem`) and Round (`1rem`).
- **Content width:** Narrow (`56rem`), Standard (`64rem`) and Wide (`76rem`).
- **Logo:** chosen from the media library, shown as a thumbnail, changeable and removable.
- **The switch "Show the site name next to the logo"**, available only while there is a logo.

A radius or width that isn't one of the named choices SHALL be shown as "Custom" and kept until another choice is made. Every change SHALL be one undoable step (typing a hex value batches into one step) and SHALL mark the site as having unsaved changes. Problems about the theme or the logo, when selected in the problems panel, SHALL open the Design tab at the field concerned (for a contrast problem, at the first colour of the pair).

#### Scenario: Apply a preset
- **WHEN** the owner chooses a preset on a site with content width `76rem`
- **THEN** the theme has the preset's colours, fonts and radius, the content width stays `76rem`, and one undo restores the previous theme

#### Scenario: Type a hex colour
- **WHEN** the owner types `#8b` into the primary colour field, then continues to `#8b2f2f`
- **THEN** the document's primary colour is unchanged after `#8b` and is `#8b2f2f` after the last character, and the contrast list updates

#### Scenario: Failing contrast shown
- **WHEN** the owner sets the primary colour to `#7fb2e5` on a white background
- **THEN** the pair "Links and buttons" shows 2.23:1 and that it fails, and the problems panel lists a contrast error

#### Scenario: Go to a contrast problem
- **WHEN** the owner selects the problem about text on panels
- **THEN** the Design tab opens with the text colour field focused

#### Scenario: Choose a logo
- **WHEN** the owner chooses a logo from the library
- **THEN** the site's logo list holds one image node with the logo's media key, width and height, the canvas header shows the logo next to the site name, and the switch "Show the site name next to the logo" is on

#### Scenario: Hide the name
- **WHEN** the site has a logo and the owner switches "Show the site name next to the logo" off
- **THEN** the canvas header shows only the logo

## REMOVED Requirements

### Requirement: Site settings panel
**Reason**: The site's name, description, favicon, share image and AI switches are set once and have nothing to do with the page being edited, so they leave the editor's narrow settings column.
**Migration**: The same settings are on the project's Settings tab (see "Site settings" in the project-page capability), saved from there. Problems about them open that tab.

### Requirement: Business tab
**Reason**: The business details are set once and shown by several blocks; they leave the editor's settings column with the site settings.
**Migration**: The same fields, with the same rules, are on the project's Settings tab (see "Business settings" in the project-page capability). The editor's business blocks link to that tab.

### Requirement: Business blocks on the canvas
**Reason**: Renamed "Business blocks in the editor": the details are now edited on the Settings tab, which the blocks link to.
**Migration**: See "Business blocks in the editor".

### Requirement: Shared fields outside the primary language
**Reason**: The Site and Business tabs left the editor, so this splits by where the fields are.
**Migration**: The theme and logo are covered by "Design outside the primary language"; the site's and business's shared fields by "Shared settings outside the primary language" in the project-page capability.
