## ADDED Requirements

### Requirement: Slides in the editor
While a hero's look is `slideshow`, the canvas SHALL show its slides side by side, without moving, each with its image in the usual image slot and its title editable in place; the hero's heading, text and button stay editable under them. Slides SHALL be added (Enter at the end of a title, or the item handle's Add), moved, duplicated and deleted as cards are, each as one undoable step, keeping at most eight; choosing "Slideshow" for a hero without slides SHALL add two empty slides in the same step.

While a slide is selected or holds the caret, a Slide panel SHALL offer its link with the Card panel's choices: no link, a page, a project or service with its own page, or an address.

#### Scenario: Link a slide to a project
- **WHEN** the owner gives slide 1 a photo and the title "Poslední závod", and links it to the project "Poslední závod" in the Slide panel
- **THEN** the preview's first slide shows the photo with the title as a link to the project's page

#### Scenario: Ninth slide
- **WHEN** a slideshow has eight slides
- **THEN** adding or duplicating a slide is disabled with the reason that a slideshow holds at most eight slides

## MODIFIED Requirements

### Requirement: Choosing a block's look
When a hero, services, team or gallery block is selected, or the caret is in it, the block panel SHALL offer its look as named choices:
- **Hero:** "Beside the text", "Full photo" or "Slideshow";
- **Services:** "Cards", "List" or "Accordion";
- **Team:** "Cards" or "List";
- **Gallery:** "Fill the tiles" or "Whole images".

Choosing SHALL change the block on the canvas at once, as one undoable step. A full-photo hero without an image SHALL show a hint that it needs a photo. On the canvas, an accordion shows every description open, so it can be edited, and a team list hides portraits as the published page does. A new block SHALL start with the default look. Outside the primary language the choice is the page's own, like the rest of its blocks.

#### Scenario: Make the hero a full photo
- **WHEN** the owner selects the home page's hero and chooses "Full photo"
- **THEN** the canvas shows the photo filling the hero with the text over it, and one undo brings back the text beside the photo

#### Scenario: Practice areas as an accordion
- **WHEN** the owner chooses "Accordion" for a services block and saves
- **THEN** the preview shows each service as a closed row that opens to its description

#### Scenario: Full photo without a photo
- **WHEN** the owner chooses "Full photo" for a hero without an image
- **THEN** the panel says the hero needs a photo, and the canvas still shows the text

#### Scenario: Make the hero a slideshow
- **WHEN** the owner chooses "Slideshow" for a hero without slides
- **THEN** the hero gets two empty slides, the canvas shows them side by side, and one undo brings back the previous look without slides

