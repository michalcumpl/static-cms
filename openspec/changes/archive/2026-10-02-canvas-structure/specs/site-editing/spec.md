# Spec Delta

## MODIFIED Requirements

### Requirement: Block structure
The owner SHALL be able to insert, delete, duplicate and reorder the blocks of a page. A block SHALL be inserted at a place the owner chose on the canvas: between two blocks, above the first, after the last, above or below a given block, or on an empty page. The left column SHALL NOT offer inserting blocks. Inserting SHALL offer hero, rich text, services, text with image, gallery, team, partner logos, contact, opening hours, call to action and testimonials blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero, and no block SHALL be offered above an existing hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them. A new contact block SHALL start with every switch on, and a new contact or opening hours block SHALL start with a placeholder heading. A new call to action SHALL start with a placeholder heading, an empty text and one button to the home page labelled "Tlačítko". A new testimonials block SHALL start with a placeholder heading and one empty testimonial.

Duplicating a block SHALL insert a copy right after it, with everything it contains (texts with their marks, items, images with their descriptions, buttons and their targets) under new node IDs, and select the copy. It SHALL be one undoable step. A hero SHALL NOT be duplicated.

#### Scenario: Insert a services block
- **WHEN** the owner inserts a services block after the hero
- **THEN** a services block with a heading and one service item appears after the hero

#### Scenario: Hero only at the top
- **WHEN** the owner opens the inserter below the first block
- **THEN** the hero is not offered

#### Scenario: Reorder blocks
- **WHEN** the owner moves the rich text block above the services block
- **THEN** the page and the document show the new order

#### Scenario: Insert a text with image block
- **WHEN** the owner inserts a text with image block
- **THEN** a block with a placeholder heading, an empty paragraph and an "Add image" button appears

#### Scenario: Insert a contact block
- **WHEN** the owner inserts a contact block on a site whose business has a phone
- **THEN** a block with a placeholder heading appears, showing the phone

#### Scenario: Insert a call to action
- **WHEN** the owner inserts a call to action
- **THEN** a block with a placeholder heading and a button "Tlačítko" appears, and the button links to the home page

#### Scenario: Nothing above the hero
- **WHEN** the owner chooses a place above a page's hero
- **THEN** no block can be inserted there

#### Scenario: Insert at a chosen place
- **WHEN** the caret is in the hero, and the owner chooses "+ Add block" between the services and the text block and picks a gallery
- **THEN** the gallery is inserted between the services and the text block, not after the hero

#### Scenario: Duplicate a services block
- **WHEN** the owner duplicates a services block with three services, one description with a bold word
- **THEN** a second services block with the same heading, the same three services and the bold word appears right after it, selected, and none of its nodes share an ID with the original
- **AND** one undo removes the copy

#### Scenario: Edit the copy only
- **WHEN** the owner duplicates a text with image block and changes the copy's heading
- **THEN** the original's heading is unchanged

#### Scenario: Hero is not duplicated
- **WHEN** the hero is selected
- **THEN** duplicating it is not available

### Requirement: Item structure
The owner SHALL be able to insert, delete, duplicate and reorder list items, service items, gallery items, people and logo items within their list, and testimonials within a testimonials block. Duplicating an item SHALL insert a copy right after it, with its texts, marks and image, under new node IDs, select the copy, and be one undoable step.

#### Scenario: Add a service
- **WHEN** the owner adds a service item after the last one
- **THEN** a new, empty service item appears at the end of the services list

#### Scenario: Reorder gallery photos
- **WHEN** the owner moves the third photo of a gallery to the first place
- **THEN** the gallery and the document show the new order

#### Scenario: Duplicate a person
- **WHEN** the owner duplicates a person "Jana Nováková" with a portrait
- **THEN** a second person "Jana Nováková" with the same portrait image (media key and description) appears right after her

## ADDED Requirements

### Requirement: Block and item handles
Every block of the current page SHALL have a handle at its left edge, and so SHALL every item of the lists named in "Item structure". A handle SHALL show while the pointer is over its block or item, and while the caret or a selection is inside it, so it can be reached without hovering (touch screens). When the caret is in an item, the handles of the item and of its block SHALL both show.

A handle SHALL be a button named after what it acts on, such as "Services block" or "Photo 3". Activating it SHALL select that block or item as a whole and open a menu with:
- Move up;
- Move down;
- Duplicate;
- Delete;
- for a block only, Add block above and Add block below, which open the block picker (see "Adding blocks on the canvas") for that place.

Each entry SHALL do what the editor's existing commands do for the selected block or item, as one undoable step. Entries that can't apply SHALL be shown disabled: Move up for the first block or item of its list, Move down for the last, and Duplicate and Add block above for a hero.

The menu SHALL be operable with the keyboard: arrow keys move between entries, Enter activates one, and Escape closes the menu. Closing it without choosing SHALL keep the block or item selected and return focus to the canvas. After Delete, nothing SHALL stay selected; after Move or Duplicate, the moved block or item, or the copy, SHALL be selected.

The navigation, image slots, buttons, the page title, and the hero's fixed parts SHALL have no handle. Paragraphs and subheadings inside a text block SHALL have none either. Escape on the canvas SHALL still select the paragraph, item or block around the caret, as before.

#### Scenario: Delete a block with the mouse
- **WHEN** the owner points at the services block, clicks its handle and chooses Delete
- **THEN** the services block is gone from the page, and one undo brings it back

#### Scenario: Remove one gallery photo
- **WHEN** the owner clicks into the caption of the third photo of a six-photo gallery, clicks the photo's handle and chooses Delete
- **THEN** the gallery has five photos and the block is still there

#### Scenario: Handle without hovering
- **WHEN** the caret is in the description of a service, and the pointer is elsewhere
- **THEN** the handles of that service and of its services block are shown

#### Scenario: First block
- **WHEN** the owner opens the handle menu of the first block of the page
- **THEN** Move up is disabled, and Move down, Duplicate (unless it is the hero) and Delete are enabled

#### Scenario: Keyboard only
- **WHEN** the owner tabs to a block's handle, presses Enter, presses the down arrow until Duplicate is focused and presses Enter
- **THEN** the block is duplicated and the copy is selected

#### Scenario: Close the menu
- **WHEN** the owner opens a block's handle menu and presses Escape
- **THEN** the menu closes, the block stays selected and the canvas has focus

#### Scenario: No handle on the menu
- **WHEN** the owner points at the site's navigation
- **THEN** no handle is shown

### Requirement: Selection named in the toolbar
While a block or an item is selected as a whole, the toolbar SHALL say what is selected, in words owners use: the block's name ("Services block", "Gallery block", "Call to action block"), or the item's name and position in its list ("Photo 3 of 6", "Service 2 of 3", "Person 1 of 4", "Logo 2 of 5", "Testimonial 1 of 2", "List item 4 of 4"). Nothing SHALL be said for a text selection or the caret. The toolbar's Delete button SHALL say in its description that Escape selects the paragraph, item or block around the caret.

#### Scenario: Photo selected
- **WHEN** the owner selects the third photo of a six-photo gallery with its handle
- **THEN** the toolbar says "Photo 3 of 6 selected"

#### Scenario: Escape reaches the block
- **WHEN** the caret is in a service's name and the owner presses Escape until the services block is selected
- **THEN** the toolbar first says "Service 1 of 3 selected" and then "Services block selected"

#### Scenario: Typing
- **WHEN** the caret is in a paragraph
- **THEN** the toolbar names no selection

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
- **THEN** every block is a card with a drawing of the block, its name and its description, such as "Opening hours" with "Your weekly hours, from the Business tab"

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
