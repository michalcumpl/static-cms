# Spec Delta

## MODIFIED Requirements

### Requirement: Theme stylesheet
Rendering SHALL produce one stylesheet from the site's template and theme. It SHALL define the theme values as CSS custom properties on `:root` (colors, fonts, radius, content width) and the template's design tokens as CSS custom properties on `:root` (see "Design tokens" in the templates capability), followed by the shared base styles for the page layout and every block type, then the template's own styles. Themeable values SHALL come only from the theme's custom properties, and the sizes, line heights, gaps and block padding the templates capability names under "Design tokens" only from the template's tokens. Changing the theme or the template SHALL change only the stylesheet, not the page HTML.

The font custom properties SHALL hold the chosen font's family followed by its fallback list. For each webfont the theme uses, the stylesheet SHALL start with one `@font-face` rule per font file (see "Font files of a theme" in the theming capability), with:
- the font's family name;
- `font-style` `normal` or `italic`, and `font-weight` `400 700`;
- `font-display: swap`;
- the subset's `unicode-range`;
- a `src` relative to the stylesheet, `url("fonts/<file name>") format("woff2")`.

System fonts SHALL add no `@font-face` rule.

#### Scenario: Theme change leaves HTML unchanged
- **WHEN** a site is rendered twice with different primary colors and otherwise identical documents
- **THEN** the page HTML is identical and only the stylesheet's custom-property values differ

#### Scenario: Font change leaves HTML unchanged
- **WHEN** a site is rendered with body font `system-sans` and again with `inter`
- **THEN** the page HTML is identical, and only the second stylesheet has `@font-face` rules for `Inter`, whose sources are `fonts/inter-latin-normal.woff2`, `fonts/inter-latin-italic.woff2`, `fonts/inter-latin-ext-normal.woff2` and `fonts/inter-latin-ext-italic.woff2`

#### Scenario: System fonts
- **WHEN** a site uses `georgia` and `system-sans`
- **THEN** its stylesheet has no `@font-face` rule

#### Scenario: Template change leaves HTML unchanged
- **WHEN** a site is rendered with the Standard template and again with a test template whose tokens and styles differ
- **THEN** the page HTML is identical and only the stylesheet differs

### Requirement: Heading hierarchy
Each page SHALL contain exactly one `<h1>`. When the first block is a `hero` that isn't hidden, the hero heading SHALL be the `<h1>`; otherwise the page title SHALL render as an `<h1>` at the start of `<main>`. Block headings (the heading of `services`, `text_with_image`, `gallery`, `team` and `logos` blocks, and `rich_text` subheadings) SHALL render at level 2 or 3, never skipping a level. A person's name SHALL render as an `<h3>` when its team has a heading, and as an `<h2>` otherwise.

#### Scenario: Page with hero
- **WHEN** a page's first block is a hero with heading "Welcome"
- **THEN** the page's only `<h1>` is "Welcome"

#### Scenario: Page without hero
- **WHEN** a page titled "Services" starts with a `services` block
- **THEN** the page has `<h1>Services</h1>` followed by the block, whose heading is an `<h2>`

#### Scenario: Hidden hero
- **WHEN** a page titled "O nás" starts with a hidden hero headed "Vítejte"
- **THEN** the page's only `<h1>` is "O nás", and "Vítejte" isn't on the page

#### Scenario: Team names
- **WHEN** a team block with heading "Kdo jsme" has people "Kateřina" and "Martina"
- **THEN** "Kdo jsme" renders as an `<h2>` and the two names as `<h3>` elements

#### Scenario: Team without a heading
- **WHEN** a team block without a heading has a person "Kateřina"
- **THEN** "Kateřina" renders as an `<h2>`

### Requirement: Media files used by a document
Rendering SHALL be able to report, for a document, the media files its exported site uses, each once, in a stable order:
- **For every image in the site's pages** (blocks that aren't hidden, and the items those blocks show), and for the site's logo, its variant file names.
- **For the site's favicon**, its icon files `<media key>-icon-32.png`, `<media key>-icon-180.png` and `<media key>-icon-512.png`.
- **For the site's default share image and each page's own share image**, its share file `<media key>-share.jpg`.

Favicons and share images SHALL NOT add variant files. The list SHALL be exactly the media files export needs.

#### Scenario: Files of the demo site
- **WHEN** listing the media files of a site whose only image has media key `hero.png` and width 320
- **THEN** the list is `hero.png-320.webp`

#### Scenario: Favicon and share image
- **WHEN** a site has favicon `logo-1a2b` and default share image `pult-3f9a`, and no other images
- **THEN** the list is `logo-1a2b-icon-180.png`, `logo-1a2b-icon-32.png`, `logo-1a2b-icon-512.png` and `pult-3f9a-share.jpg`

#### Scenario: Site logo
- **WHEN** a site's only image is its logo, with media key `pekarna-7c1e` and width 600
- **THEN** the list is `pekarna-7c1e-480.webp` and `pekarna-7c1e-600.webp`

#### Scenario: Image only in a hidden block
- **WHEN** a site's only image is in a gallery block that is hidden
- **THEN** the list is empty

## ADDED Requirements

### Requirement: Hidden blocks
A hidden block (see "Hidden blocks" in the site-document capability) SHALL render nothing: no element, no heading and no images. A page SHALL load a script a block needs (such as the slideshow script) only when a block that needs it isn't hidden. Rendering a hidden block's page SHALL otherwise be as if the block weren't there.

#### Scenario: Hidden testimonials on the home page
- **WHEN** the home page's testimonials block is hidden
- **THEN** the home page has no testimonials section, and the other blocks render as before

#### Scenario: Hidden slideshow
- **WHEN** a page's only slideshow hero is hidden
- **THEN** the page doesn't load the slideshow script
