# Spec Delta

## MODIFIED Requirements

### Requirement: Block structure
The owner SHALL be able to insert, delete and reorder the blocks of a page. Inserting SHALL offer hero, rich text, services, text with image, gallery, team and partner logos blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them.

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

### Requirement: Item structure
The owner SHALL be able to insert, delete and reorder list items, service items, gallery items, people and logo items within their list.

#### Scenario: Add a service
- **WHEN** the owner adds a service item after the last one
- **THEN** a new, empty service item appears at the end of the services list

#### Scenario: Reorder gallery photos
- **WHEN** the owner moves the third photo of a gallery to the first place
- **THEN** the gallery and the document show the new order

### Requirement: Image description
For every image, the owner SHALL be able to edit the alt text and mark the image as decorative, except for logos, whose name is their description. Marking an image decorative SHALL clear the alt text. When an image has just been placed and has neither alt text nor the decorative flag, the Image panel SHALL ask for a description. A portrait added to a person SHALL start as decorative, since the person's name is next to it.

#### Scenario: Mark as decorative
- **WHEN** the owner marks the hero image as decorative
- **THEN** the image's decorative flag is set and its alt text is empty

#### Scenario: Description asked for after choosing
- **WHEN** the owner chooses an image for the hero
- **THEN** the Image panel is shown with the alt text field focused and a hint to describe the image or mark it decorative

#### Scenario: Portrait starts decorative
- **WHEN** the owner adds a portrait to a person
- **THEN** the portrait is marked decorative and the document is valid

#### Scenario: Logo image panel
- **WHEN** the owner selects a logo's image
- **THEN** the Image panel shows the logo's name as its description and offers no alt text field

## ADDED Requirements

### Requirement: Images in blocks
The owner SHALL be able to add, replace and remove the image of a text with image block and the portrait of a person, and replace the image of a gallery item or a logo item, through the media library, in the same way as the hero image. A gallery item or a logo item SHALL be removed as a whole rather than losing its image. For a text with image block, the Image panel SHALL let the owner put the image on the left or the right. For a logo, the Image panel SHALL let the owner link it to a page of the site or an address, with addresses checked as in the link dialog, and remove the link. Each of these actions SHALL be one undoable action.

#### Scenario: Image to the left
- **WHEN** the owner selects the image of a text with image block and chooses "left"
- **THEN** the image moves to the left of the text on the canvas and the block's image side is `left`

#### Scenario: Link a logo
- **WHEN** the owner selects a logo and links it to `https://harmonie.example`
- **THEN** the logo item has a link to that address, and undo removes it again

#### Scenario: Unsafe logo link refused
- **WHEN** the owner enters `javascript:alert(1)` as a logo's link
- **THEN** the link is not set and the owner is told which addresses are allowed

### Requirement: Adding several images at once
For a gallery, a team and a logos block, the owner SHALL be able to open the media library in a multi-select mode, select several images (including ones uploaded in the same session), and add them in one action. Each selected image SHALL become a new item at the end of the block, in the order selected: a gallery item without a caption, a person with the image as a decorative portrait and a placeholder name, or a logo item named after the image's file name. The addition SHALL be one undoable action.

#### Scenario: Add photos to a gallery
- **WHEN** the owner uses "Add photos" on an empty gallery, selects three images in the library and confirms
- **THEN** the gallery shows three photos in the selected order, and one undo removes all three

#### Scenario: Add logos
- **WHEN** the owner adds the images `harmonie.webp` and `p6.webp` to a logos block
- **THEN** two logo items named "harmonie" and "p6" appear, ready to be renamed
