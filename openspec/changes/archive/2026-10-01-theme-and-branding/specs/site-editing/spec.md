# Spec Delta

## MODIFIED Requirements

### Requirement: Shared fields outside the primary language
In a language other than the primary, the Site, Business and Theme tabs SHALL show the shared fields (see the languages capability) read-only, with the note "Edited in <primary language name>" and a link to the same tab in the primary language. The whole Theme tab, presets and logo included, SHALL be read-only there. Translatable fields stay editable:
- the site name and description;
- the default share image's description;
- the business name;
- the note on the opening hours.

#### Scenario: Phone in English
- **WHEN** the owner opens the Business tab in English
- **THEN** the phone field can't be edited and says it is edited in Čeština, and the note on the opening hours can be edited

#### Scenario: Theme in English
- **WHEN** the owner opens the Theme tab in English
- **THEN** no preset, colour, font, radius, width, logo or switch can be changed, and the tab says it is edited in Čeština with a link to the Czech Theme tab

## ADDED Requirements

### Requirement: Theme tab
The editor's settings column SHALL have a Theme tab next to Page, Site and Business, with:
- **Presets:** each preset shown by its name, a swatch of its colours and a sample in its heading font. Choosing one applies it (see "Theme presets" in the theming capability).
- **Colours:** primary, secondary, background and text, each with a colour picker and a hex text field. A hex value SHALL be applied as soon as it is a valid colour; an incomplete value SHALL not change the document.
- **Contrast:** each contrast pair (see "Theme colour contrast" in the theming capability) with a sample, its measured ratio and whether it passes, updated as the colours change.
- **Fonts:** a heading font and a body font, each chosen from the catalog, every option shown in its own typeface and labelled with its name and kind.
- **Corner radius:** Square (`0`), Soft (`0.5rem`) and Round (`1rem`).
- **Content width:** Narrow (`56rem`), Standard (`64rem`) and Wide (`76rem`).
- **Logo:** chosen from the media library, shown as a thumbnail, changeable and removable.
- **The switch "Show the site name next to the logo"**, available only while there is a logo.

A radius or width that isn't one of the named choices SHALL be shown as "Custom" and kept until another choice is made. Every change SHALL be one undoable step (typing a hex value batches into one step) and SHALL mark the site as having unsaved changes. Problems about the theme or the logo, when selected in the problems panel, SHALL open the Theme tab at the field concerned (for a contrast problem, at the first colour of the pair).

#### Scenario: Apply a preset
- **WHEN** the owner chooses a preset on a site with content width `76rem`
- **THEN** the theme has the preset's colours, fonts and radius, the content width stays `76rem`, and one undo restores the previous theme

#### Scenario: Type a hex colour
- **WHEN** the owner types `#8b` into the primary colour field, then continues to `#8b2f2f`
- **THEN** the document's primary colour is unchanged after `#8b` and is `#8b2f2f` after the last character, and the contrast list updates

#### Scenario: Failing contrast shown
- **WHEN** the owner sets the primary colour to `#7fb2e5` on a white background
- **THEN** the pair "Links and buttons" shows 2.23:1 and that it fails, and the problems panel lists a contrast error

#### Scenario: Go to a contrast problem
- **WHEN** the owner selects the problem about text on panels
- **THEN** the Theme tab opens with the text colour field focused

#### Scenario: Choose a logo
- **WHEN** the owner chooses a logo from the library
- **THEN** the site's logo list holds one image node with the logo's media key, width and height, the canvas header shows the logo next to the site name, and the switch "Show the site name next to the logo" is on

#### Scenario: Hide the name
- **WHEN** the site has a logo and the owner switches "Show the site name next to the logo" off
- **THEN** the canvas header shows only the logo

### Requirement: Theme on the canvas
The canvas SHALL be styled with the document's current theme, fonts included, and SHALL restyle whenever the theme changes, through editing, a preset, undo or redo, without reloading the editor. While a theme value is not valid (a colour that isn't a hex colour, a font outside the catalog, a length that isn't a CSS length), the canvas SHALL keep the last valid value for that field. Contrast failures SHALL NOT stop the canvas from showing the chosen colours. The canvas header SHALL show the logo and the name as the published site will.

#### Scenario: Live colour
- **WHEN** the owner changes the primary colour to `#8b2f2f`
- **THEN** the canvas's links and buttons turn `#8b2f2f` without a reload, and undo turns them back

#### Scenario: Live font
- **WHEN** the owner chooses `lora` as the heading font
- **THEN** the canvas headings are shown in Lora

#### Scenario: Low contrast still shown
- **WHEN** the owner sets the primary colour to `#7fb2e5` on a white background
- **THEN** the canvas shows the links in `#7fb2e5` while the problems panel lists the contrast error
