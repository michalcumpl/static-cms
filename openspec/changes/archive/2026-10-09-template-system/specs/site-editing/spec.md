# Spec Delta

## MODIFIED Requirements

### Requirement: Adding pages
The owner SHALL be able to add a page by giving it a title and choosing what it starts from: "Blank page" or one of the layouts of the site's template (see "Layouts" in the templates capability), each shown with its name and description. "Blank page" SHALL be chosen when the dialog opens. Choosing a layout while the title is empty, or still equal to the name of the layout chosen before, SHALL set the title to the chosen layout's name in the site's language.

The new page SHALL get a slug made from the title, made unique within the site with a numeric suffix when taken. A blank page SHALL start with one text block with placeholder content; a page from a layout SHALL start with the layout's blocks (see "Making a page from a layout" in the templates capability). The page SHALL get a navigation item at the end of the menu labelled with its title, and the editor SHALL switch to it. The whole addition SHALL be one undoable action.

#### Scenario: Add a page
- **WHEN** the owner adds a page titled "Ceník" from "Blank page"
- **THEN** a page "Ceník" with slug `cenik` and one text block exists, it is last in the menu, and the canvas shows it

#### Scenario: Add a page from a layout
- **WHEN** on a Czech site with services the owner chooses the Services layout and keeps the title "Služby" it fills in
- **THEN** a page "Služby" with slug `sluzby` exists with a text block, a services block showing all services and a call to action, and one undo removes it

#### Scenario: Owner's own title kept
- **WHEN** the owner types "Co děláme" and then chooses the Services layout
- **THEN** the title stays "Co děláme"

#### Scenario: Slug already taken
- **WHEN** the owner adds a page titled "Kontakt" and a page with slug `kontakt` already exists
- **THEN** the new page gets slug `kontakt-2`

#### Scenario: Empty title
- **WHEN** the owner tries to add a page with an empty title
- **THEN** no page is added and the owner is asked for a title

### Requirement: Theme on the canvas
The canvas SHALL be styled with the site's template and the document's current theme, fonts included, and SHALL restyle whenever the theme changes, through editing, a preset, undo or redo, without reloading the editor. While a theme value is not valid (a colour that isn't a hex colour, a font outside the catalog, a length that isn't a CSS length), the canvas SHALL keep the last valid value for that field. Contrast failures SHALL NOT stop the canvas from showing the chosen colours. The canvas header SHALL show the logo and the name as the published site will.

#### Scenario: Live colour
- **WHEN** the owner changes the primary colour to `#8b2f2f`
- **THEN** the canvas's links and buttons turn `#8b2f2f` without a reload, and undo turns them back

#### Scenario: Live font
- **WHEN** the owner chooses `lora` as the heading font
- **THEN** the canvas headings are shown in Lora

#### Scenario: Low contrast still shown
- **WHEN** the owner sets the primary colour to `#7fb2e5` on a white background
- **THEN** the canvas shows the links in `#7fb2e5` while the problems panel lists the contrast error

#### Scenario: Template's spacing on the canvas
- **WHEN** the editor opens a site whose template sets a larger block padding than Standard
- **THEN** the canvas shows its blocks with the template's padding

## ADDED Requirements

### Requirement: Template defaults for new blocks
A `hero`, `services`, `team`, `gallery` or `cards` block inserted from the block picker SHALL get the site template's default look for that block, and the block panel SHALL show that look as chosen.

#### Scenario: Template prefers the full photo
- **WHEN** the site's template has the default hero look `cover` and the owner inserts a hero
- **THEN** the hero's look is "Full photo"

#### Scenario: Standard
- **WHEN** a site uses Standard and the owner inserts a services block
- **THEN** its look is "Cards", as before templates existed

### Requirement: Showing and hiding blocks
When a block is selected, or the caret is in it, the block panel SHALL have a switch "Show on website", on for blocks that aren't hidden. Turning it off SHALL hide the block, turning it on SHALL show it again, and each SHALL be one undoable step. The block's handle menu SHALL offer the same as "Hide on website" or "Show on website".

On the canvas a hidden block SHALL stay in its place, editable as before, shown dimmed with a "Hidden" label at its top that says it isn't on the website. The page's entry in the pages list SHALL NOT change.

#### Scenario: Hide the testimonials
- **WHEN** the owner selects the home page's testimonials block and turns "Show on website" off
- **THEN** the block is dimmed with the "Hidden" label, the preview of the home page has no testimonials, and undo shows it again

#### Scenario: Edit a hidden block
- **WHEN** the caret is in a hidden text block's paragraph and the owner types
- **THEN** the text changes and the block stays hidden
