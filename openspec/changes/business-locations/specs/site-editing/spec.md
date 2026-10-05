# Spec Delta

## MODIFIED Requirements

### Requirement: Business blocks in the editor
The canvas SHALL show the `contact` and `opening_hours` blocks, and the footer, as the published site will, from the saved business details. The heading of a business block SHALL be editable in place. The details themselves SHALL NOT be editable on the canvas; the block SHALL offer a link to the Settings tab ("Edit business details"), as "Settings from the editor" says (see the project-page capability). The panel for a selected `contact` or `opening_hours` block SHALL offer its location choice when the business has several locations: "All locations" or one location by name, as one undoable step. The contact block's switches SHALL be shown in the same panel.

#### Scenario: Details follow the settings
- **WHEN** the owner changes the city to "Kolín 2" on the Settings tab, saves, and opens the editor
- **THEN** the canvas's contact block and footer show "Kolín 2"

#### Scenario: Edit details from a block
- **WHEN** the owner chooses "Edit business details" on a contact block
- **THEN** the Settings tab opens, at the business settings

#### Scenario: Choose a shop
- **WHEN** the business has the locations "Kolín – Lipová" and "Kutná Hora", and the owner selects a contact block and chooses "Kutná Hora" in its panel
- **THEN** the canvas shows Kutná Hora's details only, and one undo shows all locations again
