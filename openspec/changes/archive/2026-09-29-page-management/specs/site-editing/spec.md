# Spec Delta

## MODIFIED Requirements

### Requirement: Editor per page
The editor SHALL be available per project, at `/p/<project>/edit/<page-id>/` for every page, to signed-in members of the project's workspace. `/p/<project>/edit/` SHALL open the home page. The editor's address for a page SHALL NOT change when the page's title or slug changes, or when it becomes or stops being the home page. It SHALL show the page's navigation and blocks laid out and styled like the published page, using the site's stylesheet. An address naming a page that isn't in the site SHALL show a not-found page.

#### Scenario: Open the home page
- **WHEN** a member opens `/p/<project>/edit/`
- **THEN** the home page's blocks are shown in edit mode with the site's theme applied

#### Scenario: Open a page by ID
- **WHEN** a member opens `/p/<project>/edit/<id of the Kontakt page>/`
- **THEN** the Kontakt page is shown in edit mode

#### Scenario: Unknown page
- **WHEN** a member opens `/p/<project>/edit/does-not-exist/`
- **THEN** a not-found page is shown

#### Scenario: Address survives a slug change
- **WHEN** the owner is editing the Kontakt page and changes its slug
- **THEN** the editor stays on the Kontakt page at the same address

#### Scenario: Someone else's project
- **WHEN** a signed-in person who isn't a member of the project's workspace opens its editor
- **THEN** a not-found page is shown

### Requirement: Page switching
The editor SHALL show a sidebar with two sections: "Menu", listing the site's navigation items in menu order (pages and external links), and "Not in menu", listing the pages that have no navigation item. The home page SHALL be marked as home. Choosing a page in either section SHALL switch the canvas to it. The sidebar SHALL reflect the current document, including unsaved changes. Switching pages SHALL keep unsaved edits made on other pages, and saving SHALL save the whole site.

#### Scenario: Edits survive switching pages
- **WHEN** the owner edits the home page hero, switches to the `kontakt` page, and switches back without saving
- **THEN** the hero edit is still shown and still unsaved

#### Scenario: Page outside the menu
- **WHEN** a site has a page "Děkujeme" with no navigation item
- **THEN** the sidebar lists it under "Not in menu", and choosing it opens it on the canvas

#### Scenario: Renamed page in the sidebar
- **WHEN** the owner changes a page's title without saving
- **THEN** the sidebar shows the new title

### Requirement: Undo and redo
Every editing action SHALL be undoable and redoable, with the usual keyboard shortcuts and with toolbar buttons. This includes page and menu actions and changes made in the page settings panel. Undo and redo shortcuts pressed while a field of the page settings panel has focus SHALL act on the editor's history, not only on that field. Consecutive typing in one panel field SHALL be undone together rather than one character at a time.

#### Scenario: Undo a deletion
- **WHEN** the owner deletes a block and then undoes
- **THEN** the block is back in its place with its content

#### Scenario: Undo a page deletion
- **WHEN** the owner deletes the Kontakt page and then undoes
- **THEN** the Kontakt page, its blocks and its menu item are back in their places

#### Scenario: Undo from a panel field
- **WHEN** the owner types a new page title in the page settings panel and presses Ctrl/Cmd+Z while the title field has focus
- **THEN** the title, and the slug and menu label that followed it, return to their previous values

### Requirement: Problems panel
The editor SHALL list the document's validation problems after each save and whenever the document changes, and clicking a problem SHALL select the node it concerns when that node is on the current page, or switch to the page containing it. A problem about a page's own settings (title, slug, SEO description, home page) SHALL switch to that page and focus the matching field in the page settings panel.

#### Scenario: Empty heading reported
- **WHEN** the owner inserts a rich text block and leaves its subheading empty
- **THEN** the problems panel lists an empty-heading problem for that subheading

#### Scenario: Go to a problem
- **WHEN** the owner clicks a problem that concerns a node on the current page
- **THEN** that node is selected in the editor

#### Scenario: Go to a slug problem
- **WHEN** the owner clicks a duplicate-slug problem for the Kontakt page
- **THEN** the editor switches to the Kontakt page and focuses its slug field

## ADDED Requirements

### Requirement: Adding pages
The owner SHALL be able to add a page by giving it a title. The new page SHALL get a slug made from the title, made unique within the site with a numeric suffix when taken. It SHALL start with one text block with placeholder content, SHALL get a navigation item at the end of the menu labelled with its title, and the editor SHALL switch to it. The whole addition SHALL be one undoable action.

#### Scenario: Add a page
- **WHEN** the owner adds a page titled "Ceník"
- **THEN** a page "Ceník" with slug `cenik` and one text block exists, it is last in the menu, and the canvas shows it

#### Scenario: Slug already taken
- **WHEN** the owner adds a page titled "Kontakt" and a page with slug `kontakt` already exists
- **THEN** the new page gets slug `kontakt-2`

#### Scenario: Empty title
- **WHEN** the owner tries to add a page with an empty title
- **THEN** no page is added and the owner is asked for a title

### Requirement: Duplicating pages
The owner SHALL be able to duplicate a page. The copy SHALL have the same blocks and content under new node IDs, the title `<title> (copy)` and a unique slug made from that title. When the original has a navigation item, the copy SHALL get one right after it. The editor SHALL switch to the copy. Links in the copy SHALL keep pointing where the original's did. The duplication SHALL be one undoable action.

#### Scenario: Duplicate a page
- **WHEN** the owner duplicates the page "Služby" (slug `sluzby`), which is second in the menu
- **THEN** a page "Služby (copy)" with slug `sluzby-copy` and the same blocks exists, it is third in the menu, and editing it does not change "Služby"

### Requirement: Deleting pages
The owner SHALL be able to delete a page other than the home page, after confirming. Deleting SHALL remove the page, its blocks and its navigation items as one undoable action. Before deleting, the editor SHALL say how many links elsewhere in the site point to the page. Those links SHALL stay in place and be reported as problems. When the deleted page is the one being edited, the editor SHALL switch to the home page. The home page SHALL NOT be deletable, and the editor SHALL explain that another page must be set as home first.

#### Scenario: Delete a page with links to it
- **WHEN** the owner deletes the page "Kontakt", which two text links on other pages point to, and confirms
- **THEN** the page and its menu item are gone, the canvas shows the home page, and the problems panel lists two links to a page that no longer exists

#### Scenario: Home page can't be deleted
- **WHEN** the owner looks at the delete action for the home page
- **THEN** it is disabled with an explanation to set another page as home first

#### Scenario: Cancel deletion
- **WHEN** the owner starts deleting a page and cancels the confirmation
- **THEN** nothing changes

### Requirement: Setting the home page
The owner SHALL be able to make any page the home page. Setting the home page SHALL NOT change any page's slug, the menu, or the order of pages, and SHALL be one undoable action. The previous home page SHALL keep its slug and become reachable at that slug.

#### Scenario: Set as home
- **WHEN** the owner sets the page "Služby" (slug `sluzby`) as home
- **THEN** "Služby" is marked as home in the sidebar, the previous home page is not, and both pages keep their slugs

### Requirement: Page settings panel
The editor SHALL show a settings panel for the current page with its title, slug, SEO description, a "show in menu" switch, and the actions to duplicate, delete, and set it as home. Changes to the title and SEO description SHALL apply to the document as the owner types. The slug field SHALL apply its value when the owner leaves the field or confirms it, normalised by slugifying; while typing, the panel SHALL show the slug that will be applied and the page's resulting address. For the home page, the panel SHALL explain that the page is served at the site root and that its slug is used only if it stops being home. An empty title or an empty slug after normalising SHALL be reported as a problem rather than refused.

#### Scenario: Edit the title
- **WHEN** the owner types "O nás" into the title field of a page without a hero
- **THEN** the page title on the canvas and in the sidebar shows "O nás"

#### Scenario: Normalise the slug
- **WHEN** the owner types `O Nás!` into the slug field and leaves it
- **THEN** the page's slug is `o-nas`

### Requirement: Slug and menu label follow the title
When the owner changes a page's title, the page's slug SHALL change to the slugified new title if it was equal to the slugified old title, and each navigation item for the page SHALL change its label to the new title if it was equal to the old title. Otherwise they SHALL keep their values. These follow-up changes SHALL be part of the same undoable action as the title change.

#### Scenario: Slug and label follow
- **WHEN** a page titled "O nás" has slug `o-nas` and menu label "O nás", and the owner changes the title to "O firmě"
- **THEN** the slug becomes `o-firme` and the menu label becomes "O firmě"

#### Scenario: Customised slug and label are kept
- **WHEN** a page titled "O nás" has slug `about` and menu label "Kdo jsme", and the owner changes the title to "O firmě"
- **THEN** the slug stays `about` and the menu label stays "Kdo jsme"

### Requirement: Menu management
The owner SHALL be able to reorder the menu, to add a page to the menu or remove it (the "show in menu" switch, or moving it between the sidebar's sections), and to add, edit and remove external links in the menu. A page added to the menu SHALL get a navigation item at the end of the menu labelled with its title. A page SHALL have at most one navigation item created by the editor. External link addresses SHALL be checked with the same rules as the link dialog. Menu labels SHALL stay editable in place on the canvas, but the canvas SHALL NOT add, remove or reorder menu items. Every menu action SHALL be one undoable action. Menu items SHALL NOT have sub-items.

#### Scenario: Reorder the menu
- **WHEN** the owner moves "Kontakt" above "Služby" in the sidebar's Menu section
- **THEN** the navigation on the canvas shows "Kontakt" before "Služby", and the document's navigation has the new order

#### Scenario: Hide a page from the menu
- **WHEN** the owner turns off "show in menu" for the page "Děkujeme"
- **THEN** its navigation item is removed, the page is listed under "Not in menu", and the page itself is unchanged

#### Scenario: Add an external link
- **WHEN** the owner adds a menu link labelled "Facebook" with address `https://facebook.com/anideti`
- **THEN** the menu ends with a "Facebook" item linking to that address

#### Scenario: Unsafe external link refused
- **WHEN** the owner enters `javascript:alert(1)` as a menu link address
- **THEN** the link is not added and the owner is told which addresses are allowed
