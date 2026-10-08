## ADDED Requirements

### Requirement: Cards in the editor
On the canvas a `cards` block SHALL show its cards as the published page will, in its look, with the titles and texts editable in place and each image in the usual image slot. Cards SHALL be added (Enter at the end of a card's text, or the item handle's Add), moved, duplicated and deleted as the items of other blocks are, each as one undoable step; a block SHALL keep at least one card and at most twelve, and the actions that would break that SHALL be disabled with the reason.

The block panel of a selected cards block SHALL offer its look: "Text under the photo" or "Title over the photo", as one undoable step.

While a card is selected or holds the caret, a Card panel SHALL offer its link: "No link", "A page of the site" (with the pages to choose from), "A project or service" (with the projects and services that have their own page), or "An address" (checked as in the link dialog, applied when it is valid). Each change SHALL be one undoable step. When the card links to something that no longer has a page, the panel SHALL say so.

#### Scenario: Category tile
- **WHEN** the owner adds an image to the first card, types "Výstavy" as its title, and links it to the page "Výstavy"
- **THEN** the canvas shows the photo with "Výstavy", and the preview's card is a link to `/vystavy/`

#### Scenario: Link to a project
- **WHEN** the projects are listed on "Realizace" and the owner links a card to the project "PETROF 160"
- **THEN** the preview's card links to `/realizace/petrof-160/`

#### Scenario: Last card can't be deleted
- **WHEN** a cards block has one card
- **THEN** its Delete action is disabled with the reason that a cards block needs at least one card

## MODIFIED Requirements

### Requirement: Block structure
The owner SHALL be able to insert, delete, duplicate and reorder the blocks of a page. A block SHALL be inserted at a place the owner chose on the canvas: between two blocks, above the first, after the last, above or below a given block, or on an empty page. The left column SHALL NOT offer inserting blocks. Inserting SHALL offer hero, rich text, services, text with image, gallery, team, partner logos, contact, opening hours, call to action, testimonials, questions, key figures, steps, projects and cards blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero, and no block SHALL be offered above an existing hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them. A new contact block SHALL start with every switch on, and a new contact or opening hours block SHALL start with a placeholder heading. A new call to action SHALL start with a placeholder heading, an empty text and one button to the home page labelled "Tlačítko". A new testimonials block SHALL start with a placeholder heading and one empty testimonial. A new key figures block SHALL start with an empty heading and three empty figures; a new steps block with a placeholder heading and three empty steps. A new projects block SHALL show every project of every category. A new cards block SHALL start with an empty heading, the look `below`, and three cards with empty titles and no images or links.

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

#### Scenario: Insert cards
- **WHEN** the owner inserts a cards block after the hero
- **THEN** a block with three empty cards appears, each with an "Add image" button, with the caret in the first card's title

