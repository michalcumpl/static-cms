# Spec Delta

## MODIFIED Requirements

### Requirement: Problems panel
The editor SHALL list the document's validation problems after each save and whenever the document changes, and clicking a problem SHALL select the node it concerns when that node is on the current page, or switch to the page containing it. A problem about a page's own settings (title, slug, SEO description, home page) SHALL switch to that page and focus the matching field in the page settings panel. A problem about a link inside text SHALL switch to the page containing that text and select exactly the linked words.

#### Scenario: Empty heading reported
- **WHEN** the owner inserts a rich text block and leaves its subheading empty
- **THEN** the problems panel lists an empty-heading problem for that subheading

#### Scenario: Go to a problem
- **WHEN** the owner clicks a problem that concerns a node on the current page
- **THEN** that node is selected in the editor

#### Scenario: Go to a slug problem
- **WHEN** the owner clicks a duplicate-slug problem for the Kontakt page
- **THEN** the editor switches to the Kontakt page and focuses its slug field

#### Scenario: Go to a broken text link
- **WHEN** the Kontakt page has been deleted, and the owner, while on another page, clicks the problem "This link points to a page that no longer exists" about the words "stránce Kontakt" on the home page
- **THEN** the editor switches to the home page and selects the words "stránce Kontakt"

## ADDED Requirements

### Requirement: Select all within a field
While the caret or a text selection is in a text on the canvas, Cmd+A (Ctrl+A) SHALL select all of that text and nothing more; pressing it again SHALL keep the same selection. It SHALL never select a whole paragraph, item or block; Escape remains the way to select those. When an image or a block is selected, Cmd+A SHALL do nothing.

#### Scenario: Select all, then delete
- **WHEN** the caret is in a paragraph of a text block, and the owner presses Cmd+A twice and then Backspace
- **THEN** the paragraph's text is empty, and the block and its other paragraphs are unchanged

#### Scenario: Escape still selects the block
- **WHEN** the caret is in a paragraph and the owner presses Escape
- **THEN** the paragraph is selected as a whole, as before
