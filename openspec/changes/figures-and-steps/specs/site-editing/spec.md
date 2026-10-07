## MODIFIED Requirements

### Requirement: Block structure
The owner SHALL be able to insert, delete, duplicate and reorder the blocks of a page. A block SHALL be inserted at a place the owner chose on the canvas: between two blocks, above the first, after the last, above or below a given block, or on an empty page. The left column SHALL NOT offer inserting blocks. Inserting SHALL offer hero, rich text, services, text with image, gallery, team, partner logos, contact, opening hours, call to action, testimonials, questions, key figures and steps blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero, and no block SHALL be offered above an existing hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them. A new contact block SHALL start with every switch on, and a new contact or opening hours block SHALL start with a placeholder heading. A new call to action SHALL start with a placeholder heading, an empty text and one button to the home page labelled "Tlačítko". A new testimonials block SHALL start with a placeholder heading and one empty testimonial. A new key figures block SHALL start with an empty heading and three empty figures; a new steps block with a placeholder heading and three empty steps.

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

#### Scenario: Insert key figures
- **WHEN** the owner inserts a key figures block after the hero
- **THEN** a block with three empty figures appears, with the caret in the first figure's value

### Requirement: Item structure
The owner SHALL be able to insert, delete, duplicate and reorder list items, gallery items, logo items, figures and steps within their list, and service items, people, testimonials and FAQ items within the collection blocks that show them (see "Items in collection blocks"). Duplicating an item SHALL insert a copy right after it, with its texts, marks and image, under new node IDs, select the copy, and be one undoable step.

#### Scenario: Add a service
- **WHEN** the owner adds a service item after the last one in a block showing all services
- **THEN** a new, empty service item appears at the end of the services list and of the site's services collection

#### Scenario: Reorder gallery photos
- **WHEN** the owner moves the third photo of a gallery to the first place
- **THEN** the gallery and the document show the new order

#### Scenario: Duplicate a person
- **WHEN** the owner duplicates a person "Jana Nováková" with a portrait
- **THEN** a second person "Jana Nováková" with the same portrait image (media key and description) appears right after her

#### Scenario: Add a step
- **WHEN** the caret is at the end of the second step's title and the owner adds an item
- **THEN** an empty step appears as the third, the steps after it move down, and their numbers follow

### Requirement: Selection named in the toolbar
While a block or an item is selected as a whole, the toolbar SHALL say what is selected, in words owners use: the block's name ("Services block", "Gallery block", "Call to action block"), or the item's name and position in its list ("Photo 3 of 6", "Service 2 of 3", "Person 1 of 4", "Logo 2 of 5", "Testimonial 1 of 2", "Figure 2 of 4", "Step 1 of 3", "List item 4 of 4"). Nothing SHALL be said for a text selection or the caret. The toolbar's Delete button SHALL say in its description that Escape selects the paragraph, item or block around the caret.

#### Scenario: Photo selected
- **WHEN** the owner selects the third photo of a six-photo gallery with its handle
- **THEN** the toolbar says "Photo 3 of 6 selected"

#### Scenario: Escape reaches the block
- **WHEN** the caret is in a service's name and the owner presses Escape until the services block is selected
- **THEN** the toolbar first says "Service 1 of 3 selected" and then "Services block selected"

#### Scenario: Typing
- **WHEN** the caret is in a paragraph
- **THEN** the toolbar names no selection
