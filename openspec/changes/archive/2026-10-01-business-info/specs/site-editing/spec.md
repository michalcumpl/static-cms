# Spec Delta

## MODIFIED Requirements

### Requirement: Block structure
The owner SHALL be able to insert, delete and reorder the blocks of a page. Inserting SHALL offer hero, rich text, services, text with image, gallery, team, partner logos, contact and opening hours blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them. A new contact block SHALL start with every switch on, and a new contact or opening hours block SHALL start with a placeholder heading.

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

## ADDED Requirements

### Requirement: Business tab
The editor's settings column SHALL have a Business tab next to Page and Site, with:
- the business name, with the site name shown as the placeholder;
- the street, postal code, city and country;
- the phone and email;
- the map address;
- the type of business, as a list of names owners understand (such as "Bakery" and "Café");
- the weekly opening hours, and the note;
- the "Show contact details in the footer" switch.

Text fields SHALL apply to the document as the owner types, except the phone. The phone SHALL be applied when the owner leaves the field, normalised to international form:
- spaces, dashes and brackets are removed;
- a leading `00` becomes `+`;
- a number without a country code gets the country's code (`+420` for `CZ`, `+421` for `SK`).

A number that can't be normalised SHALL be kept as typed and reported as a problem.

The opening hours SHALL list Monday to Sunday. Each day shows its ranges as pairs of time fields, with buttons to add and remove a range. A day without ranges SHALL read "Closed". An action SHALL copy Monday's hours to Tuesday to Friday.

Every change SHALL be undoable and SHALL mark the site as having unsaved changes. Problems about the business details, when selected in the problems panel, SHALL open the Business tab at the field concerned (for hours, at the day).

#### Scenario: Normalise the phone
- **WHEN** the owner types `321 123 456` into the phone field of a business in `CZ` and leaves the field
- **THEN** the business's phone is `+420321123456`, and the field shows `+420 321 123 456`

#### Scenario: Lunch break
- **WHEN** the owner sets Monday to 08:00–12:00 and adds a range 13:00–17:00
- **THEN** Monday has two ranges, and the canvas's opening hours block shows "8:00–12:00, 13:00–17:00"

#### Scenario: Copy Monday to the weekdays
- **WHEN** Monday is 06:00–17:00 and the owner copies Monday's hours to Tuesday to Friday
- **THEN** Tuesday to Friday have one range 06:00–17:00 each, and one undo restores their previous hours

#### Scenario: Overlap problem
- **WHEN** the problems panel lists that Wednesday's hours overlap, and the owner selects the problem
- **THEN** the Business tab opens with Wednesday's first time field focused

### Requirement: Business blocks on the canvas
The canvas SHALL show the `contact` and `opening_hours` blocks, and the footer, as the published site will, from the current business details. Changes in the Business tab SHALL show on the canvas as the owner types. The heading of a business block SHALL be editable in place. The details themselves SHALL NOT be editable on the canvas; the block SHALL offer a link to the Business tab ("Edit business details"). The contact block's switches SHALL be shown in a panel for the selected block.

#### Scenario: Details follow the Business tab
- **WHEN** the owner changes the city to "Kolín 2" in the Business tab
- **THEN** the canvas's contact block and footer show "Kolín 2"

#### Scenario: Edit details from the block
- **WHEN** the owner chooses "Edit business details" on a contact block
- **THEN** the Business tab opens
