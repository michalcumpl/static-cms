## ADDED Requirements

### Requirement: Choosing a block's look
When a hero, services, team or gallery block is selected, or the caret is in it, the block panel SHALL offer its look as named choices:
- **Hero:** "Beside the text" or "Full photo";
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
