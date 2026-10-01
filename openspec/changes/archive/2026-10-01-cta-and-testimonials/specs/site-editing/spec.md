# Spec Delta

## MODIFIED Requirements

### Requirement: Block structure
The owner SHALL be able to insert, delete and reorder the blocks of a page. Inserting SHALL offer hero, rich text, services, text with image, gallery, team, partner logos, contact, opening hours, call to action and testimonials blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them. A new contact block SHALL start with every switch on, and a new contact or opening hours block SHALL start with a placeholder heading. A new call to action SHALL start with a placeholder heading, an empty text and one button to the home page labelled "Tlačítko". A new testimonials block SHALL start with a placeholder heading and one empty testimonial.

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

### Requirement: Text editing in place
The owner SHALL be able to edit every visible text of the page in place: the hero heading, text and call-to-action label; paragraphs, subheadings and list items; the services heading and each service's name, description and price; the call to action's heading, text and button labels; each testimonial's quote, name and detail; and the navigation labels. Pressing Enter in a paragraph or list item SHALL split it into two; single-line texts (headings, labels, names, prices) SHALL NOT accept line breaks.

#### Scenario: Edit a heading
- **WHEN** the owner types in the hero heading
- **THEN** the heading shows the new text and the document's hero heading contains it

#### Scenario: Split a list item
- **WHEN** the caret is in the middle of a list item and the owner presses Enter
- **THEN** the list has one more item, holding the text after the caret

### Requirement: Item structure
The owner SHALL be able to insert, delete and reorder list items, service items, gallery items, people and logo items within their list, and testimonials within a testimonials block.

#### Scenario: Add a service
- **WHEN** the owner adds a service item after the last one
- **THEN** a new, empty service item appears at the end of the services list

#### Scenario: Reorder gallery photos
- **WHEN** the owner moves the third photo of a gallery to the first place
- **THEN** the gallery and the document show the new order

### Requirement: Images in blocks
The owner SHALL be able to add, replace and remove the image of a text with image block the portrait of a person and the photo of a testimonial, and replace the image of a gallery item or a logo item, through the media library, in the same way as the hero image. A gallery item or a logo item SHALL be removed as a whole rather than losing its image. For a text with image block, the Image panel SHALL let the owner put the image on the left or the right. For a logo, the Image panel SHALL let the owner link it to a page of the site or an address, with addresses checked as in the link dialog, and remove the link. Each of these actions SHALL be one undoable action.

#### Scenario: Image to the left
- **WHEN** the owner selects the image of a text with image block and chooses "left"
- **THEN** the image moves to the left of the text on the canvas and the block's image side is `left`

#### Scenario: Link a logo
- **WHEN** the owner selects a logo and links it to `https://harmonie.example`
- **THEN** the logo item has a link to that address, and undo removes it again

#### Scenario: Unsafe logo link refused
- **WHEN** the owner enters `javascript:alert(1)` as a logo's link
- **THEN** the link is not set and the owner is told which addresses are allowed

## ADDED Requirements

### Requirement: Button panel
When a button of a hero or a call to action is selected, or the caret is in its label, the details column SHALL show a button panel. In it, the owner can:
- make the button link to a page of the site, chosen from the list of pages;
- make it link to an address, checked with the same rules as the link dialog; `tel:` and `mailto:` addresses are allowed;
- remove the button.

A call to action's last button SHALL NOT be removable.

When a hero or call to action is selected, or the caret is in it, and it has room for another button, the panel SHALL also offer to add a button. A new button links to the home page and is labelled "Tlačítko".

Each of these actions SHALL be one undoable action. An address that isn't allowed SHALL NOT be applied, and the panel SHALL say which addresses are allowed.

#### Scenario: Point a button at a page
- **WHEN** the owner selects the call to action's button and chooses the page "Kontakt"
- **THEN** the button links to `kontakt/`, and undo restores the previous target

#### Scenario: Call button
- **WHEN** the owner sets a button's address to `tel:+420321123456`
- **THEN** the button links to `tel:+420321123456`

#### Scenario: Unsafe address refused
- **WHEN** the owner enters `javascript:alert(1)` as a button's address
- **THEN** the button keeps its previous target, and the panel says which addresses are allowed

#### Scenario: Give the hero a button
- **WHEN** the caret is in a hero without a button, and the owner adds a button
- **THEN** the hero shows a button "Tlačítko" linking to the home page

#### Scenario: Second button
- **WHEN** the caret is in a call to action with one button, and the owner adds a button
- **THEN** the call to action has two buttons, and the panel no longer offers to add one
