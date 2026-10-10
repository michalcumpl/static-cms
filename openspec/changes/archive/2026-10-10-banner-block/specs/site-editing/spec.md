# Spec Delta

## ADDED Requirements

### Requirement: Banner in the editor
The block picker SHALL offer a banner ("Banner": "A full-width photo with a heading, a line of
text and a button") at every place a block can go, not only at the top.

A new banner SHALL have:
- a placeholder heading in the site's language ("Nadpis" / "Heading");
- no text, no image and no button;
- the caret in its heading.

On the canvas, the banner SHALL look as it does on the website. Its heading and text SHALL be
edited in place. Its photo SHALL be added, replaced, removed and given a focal point as the
hero's is, through the image slot and the media library.

#### Scenario: Insert a banner mid-page
- **WHEN** the owner adds a banner between the services block and the text block of the home
  page and types "Last minute"
- **THEN** the banner shows "Last minute" in a primary-colour band between them, and one undo
  removes it

#### Scenario: Give the banner a photo
- **WHEN** the owner uses "Add image" on the banner and chooses a photo in the library
- **THEN** the photo fills the band behind the heading, and the preview shows the same

## MODIFIED Requirements

### Requirement: Button panel
When a button of a hero, a banner or a call to action is selected, or the caret is in its label, the details column SHALL show a button panel. In it, the owner can:
- make the button link to a page of the site, chosen from the list of pages;
- make it link to an address, checked with the same rules as the link dialog; `tel:` and `mailto:` addresses are allowed;
- remove the button.

A call to action's last button SHALL NOT be removable.

When a hero, a banner or a call to action is selected, or the caret is in it, and it has room for another button, the panel SHALL also offer to add a button. A hero and a banner have room for one button, a call to action for two. A new button links to the home page and is labelled "Tlačítko".

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

#### Scenario: Give the banner a button
- **WHEN** the caret is in a banner without a button, and the owner adds a button and points it at
  the page "Zájezdy"
- **THEN** the banner shows a button "Tlačítko" linking to `zajezdy/`, and the panel no longer
  offers to add one

#### Scenario: Second button
- **WHEN** the caret is in a call to action with one button, and the owner adds a button
- **THEN** the call to action has two buttons, and the panel no longer offers to add one
