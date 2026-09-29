# site-editing Specification

## Purpose

Lets a site owner edit their website directly on the page in the browser (text, formatting, links, blocks and image descriptions) while the result stays a valid site document that renders to the published site.

## Requirements

### Requirement: Editor per page
The editor SHALL be available at `/edit/` for the home page and at `/edit/<slug>/` for every other page of the site. It SHALL show the page's navigation and blocks laid out and styled like the published page, using the site's stylesheet. An unknown slug SHALL show a not-found page.

#### Scenario: Open the home page
- **WHEN** the owner opens `/edit/`
- **THEN** the home page's blocks are shown in edit mode with the site's theme applied

#### Scenario: Unknown page
- **WHEN** the owner opens `/edit/does-not-exist/`
- **THEN** a not-found page is shown

### Requirement: Page switching
The editor SHALL list the site's pages and let the owner switch between them. Switching pages SHALL keep unsaved edits made on other pages, and saving SHALL save the whole site.

#### Scenario: Edits survive switching pages
- **WHEN** the owner edits the home page hero, switches to the `kontakt` page, and switches back without saving
- **THEN** the hero edit is still shown and still unsaved

### Requirement: Text editing in place
The owner SHALL be able to edit every visible text of the page in place: the hero heading, text and call-to-action label; paragraphs, subheadings and list items; the services heading and each service's name, description and price; and the navigation labels. Pressing Enter in a paragraph or list item SHALL split it into two; single-line texts (headings, labels, names, prices) SHALL NOT accept line breaks.

#### Scenario: Edit a heading
- **WHEN** the owner types in the hero heading
- **THEN** the heading shows the new text and the document's hero heading contains it

#### Scenario: Split a list item
- **WHEN** the caret is in the middle of a list item and the owner presses Enter
- **THEN** the list has one more item, holding the text after the caret

### Requirement: Inline formatting
The owner SHALL be able to make selected text bold or italic, and remove that formatting again, wherever the document allows those marks.

#### Scenario: Make text bold
- **WHEN** the owner selects a word in a paragraph and applies bold
- **THEN** the word is shown bold and the paragraph has a bold mark over that word

### Requirement: Links
The owner SHALL be able to turn selected text into a link to a page of the site, or to an external address. External addresses SHALL be accepted only when they are http(s), mailto or tel URLs; anything else SHALL be refused in the link dialog with an explanation. Links to pages SHALL be stored by page ID. While editing, links SHALL NOT navigate when clicked.

#### Scenario: Link to a page
- **WHEN** the owner selects "stránce Kontakt" and links it to the Kontakt page
- **THEN** the text is marked as an internal link to that page's ID

#### Scenario: Unsafe address refused
- **WHEN** the owner enters `javascript:alert(1)` as a link address
- **THEN** the link is not created and the dialog explains which addresses are allowed

### Requirement: Block structure
The owner SHALL be able to insert, delete and reorder the blocks of a page. Inserting SHALL offer hero, rich text and services blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero.

#### Scenario: Insert a services block
- **WHEN** the owner inserts a services block after the hero
- **THEN** a services block with a heading and one service item appears after the hero

#### Scenario: Hero only at the top
- **WHEN** the owner opens the inserter below the first block
- **THEN** the hero is not offered

#### Scenario: Reorder blocks
- **WHEN** the owner moves the rich text block above the services block
- **THEN** the page and the document show the new order

### Requirement: Item structure
The owner SHALL be able to insert, delete and reorder list items and service items within their list.

#### Scenario: Add a service
- **WHEN** the owner adds a service item after the last one
- **THEN** a new, empty service item appears at the end of the services list

### Requirement: Image description
For the hero image, the owner SHALL be able to edit the alt text and mark the image as decorative. Marking it decorative SHALL clear the alt text.

#### Scenario: Mark as decorative
- **WHEN** the owner marks the hero image as decorative
- **THEN** the image's decorative flag is set and its alt text is empty

### Requirement: Undo and redo
Every editing action SHALL be undoable and redoable, with the usual keyboard shortcuts and with toolbar buttons.

#### Scenario: Undo a deletion
- **WHEN** the owner deletes a block and then undoes
- **THEN** the block is back in its place with its content

### Requirement: Preview width
The editor SHALL let the owner switch between a desktop and a mobile preview width while editing.

#### Scenario: Mobile width
- **WHEN** the owner selects the mobile preview
- **THEN** the page is laid out at a phone width, using the site's responsive styles

### Requirement: Unsaved changes
The editor SHALL indicate when there are unsaved changes and SHALL warn before the owner leaves the editor with unsaved changes.

#### Scenario: Leaving with unsaved edits
- **WHEN** the owner has unsaved edits and tries to close the tab or leave the editor
- **THEN** the browser asks for confirmation before leaving

### Requirement: Problems panel
The editor SHALL list the document's validation problems after each save and whenever the document changes, and clicking a problem SHALL select the node it concerns when that node is on the current page, or switch to the page containing it.

#### Scenario: Empty heading reported
- **WHEN** the owner inserts a rich text block and leaves its subheading empty
- **THEN** the problems panel lists an empty-heading problem for that subheading

#### Scenario: Go to a problem
- **WHEN** the owner clicks a problem that concerns a node on the current page
- **THEN** that node is selected in the editor
