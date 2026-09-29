# site-document Specification

## Purpose

Defines the site document: the single, Svedit-compatible JSON structure that describes a whole website (settings, theme, pages, navigation, content blocks, images). It also defines the validation rules a document must pass before it can be rendered or exported.

## Requirements

### Requirement: Document structure
A site document SHALL be a JSON object with a `document_id` naming the root node and a `nodes` object mapping node IDs to nodes. Every node SHALL have an `id` equal to its key in `nodes` and a `type` naming a known node type. Text values SHALL use the shape `{ content, marks, annotations }`, and node-list values SHALL use the shape `{ nodes, marks, annotations }`, so that the same document can be loaded unchanged by the Svedit editor.

#### Scenario: Well-formed document is accepted
- **WHEN** a document has a `document_id` pointing at a `site` node and every node's `id` matches its key
- **THEN** validation reports no structural errors

#### Scenario: Key and id mismatch
- **WHEN** a node stored under key `hero_1` has `id: "hero_2"`
- **THEN** validation reports an error identifying `hero_1`

#### Scenario: Unknown node type
- **WHEN** a node has `type: "carousel"`
- **THEN** validation reports an unknown-type error for that node

### Requirement: Node identifiers
Node IDs SHALL be non-empty strings that start with a letter or underscore, contain only letters, digits, underscores and dashes, and do not contain `__`.

#### Scenario: Invalid identifier
- **WHEN** a node ID is `1_page`, `page.1` or `page__1`
- **THEN** validation reports an invalid-ID error for that node

### Requirement: References and reachability
Every node reference SHALL point to an existing node of an allowed type. All nodes SHALL be reachable from the root node, and references SHALL NOT form cycles.

#### Scenario: Dangling reference
- **WHEN** a page's block list references `services_9`, which is not in `nodes`
- **THEN** validation reports a missing-reference error naming `services_9`

#### Scenario: Disallowed child type
- **WHEN** a page's block list references a `nav_item` node
- **THEN** validation reports a disallowed-type error

#### Scenario: Unreachable node
- **WHEN** a `hero` node exists in `nodes` but no page references it
- **THEN** validation reports a warning that the node is unreachable and will not be rendered

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry the site name, a language tag (for example `cs`), an optional base URL, a reference to the theme, a reference to the navigation, and an ordered list of pages. The first page in the list SHALL be the home page.

#### Scenario: Missing language
- **WHEN** the site node has an empty language
- **THEN** validation reports an error, because every page needs a `lang` attribute

#### Scenario: Home page
- **WHEN** a site lists pages `page_home`, `page_contact`
- **THEN** `page_home` is treated as the home page, served at the site root

### Requirement: Pages and slugs
Every page SHALL have a title, a slug, optional SEO description text, and an ordered list of blocks. The home page's slug SHALL be empty. Every other page's slug SHALL be non-empty, lowercase, ASCII, dash-separated (the output of slugifying itself), and unique within the site.

#### Scenario: Duplicate slug
- **WHEN** two pages both have slug `kontakt`
- **THEN** validation reports a duplicate-slug error naming both pages

#### Scenario: Non-normalized slug
- **WHEN** a non-home page has slug `Kontakt Us`
- **THEN** validation reports an invalid-slug error suggesting `kontakt-us`

### Requirement: Navigation
The navigation SHALL be an ordered list of navigation items. Each item SHALL have a label and SHALL link either to a page node in the document (by reference) or to an external URL.

#### Scenario: Link to a page by reference
- **WHEN** a navigation item references `page_contact` and that page's slug later changes
- **THEN** the item still links to that page without editing the navigation

### Requirement: Content blocks
Pages SHALL support exactly these block types:
- `hero`: a heading, optional supporting text, an optional image, and an optional call-to-action (label and link).
- `rich_text`: an ordered list of paragraphs, subheadings (level 2 or 3) and bulleted lists. Text supports bold, italic and link marks.
- `services`: an optional heading and an ordered list of service items, each with a name, a description and an optional price text.

#### Scenario: Block content with marks
- **WHEN** a `rich_text` paragraph has text `Call us today` with a bold mark on offsets 0–7
- **THEN** the document is valid

#### Scenario: Mark out of range
- **WHEN** a mark's end offset exceeds the length of its text
- **THEN** validation reports an error for that property

### Requirement: Hero placement
A `hero` block SHALL only appear as the first block of a page.

#### Scenario: Hero not first
- **WHEN** a page's blocks are `rich_text_1`, `hero_1`
- **THEN** validation reports an error that the hero must be the first block

### Requirement: Image accessibility
Every `image` node SHALL either have non-empty alt text or be explicitly marked decorative. An image marked decorative SHALL have empty alt text.

#### Scenario: Missing alt text
- **WHEN** an image has empty alt text and is not marked decorative
- **THEN** validation reports an error asking for a description or the decorative flag

#### Scenario: Decorative image
- **WHEN** an image is marked decorative with empty alt text
- **THEN** the document is valid

### Requirement: Link safety
Links in marks, navigation items and calls-to-action SHALL either reference a page node or use one of the schemes `http`, `https`, `mailto` or `tel`, or be a root-relative path.

#### Scenario: Script URL rejected
- **WHEN** a link mark has `href: "javascript:alert(1)"`
- **THEN** validation reports an unsafe-link error

### Requirement: Theme
The theme SHALL define colors (primary, secondary, background, text), a heading font and a body font, a corner radius, and a content width. Color values SHALL be hex colors (`#rgb` or `#rrggbb`), and the text-on-background color pair SHALL meet WCAG 2.2 AA contrast for body text (4.5:1).

#### Scenario: Low-contrast theme
- **WHEN** the theme's text color is `#999999` on background `#ffffff`
- **THEN** validation reports a contrast error with the measured ratio

### Requirement: Validation result
Validation SHALL return all problems found, not only the first. Each problem SHALL have a severity (`error` or `warning`), a category, a machine-readable code, a human-readable message, and the ID of the node (and property, when applicable) it concerns. The category SHALL be `structure` for problems with the document's shape (identifiers, node types, property values, references, mark ranges, cycles, reachability) and `site` for problems with the site rules (pages, slugs, links, headings, images, theme). A document with any error SHALL be considered invalid. Warnings alone SHALL NOT make a document invalid.

#### Scenario: Multiple problems reported together
- **WHEN** a document has a duplicate slug and an image without alt text
- **THEN** validation returns both errors in one result

#### Scenario: Warnings only
- **WHEN** a document's only problem is an unreachable node
- **THEN** the document is considered valid and the warning is returned

#### Scenario: Problem categories
- **WHEN** a document has a dangling reference and an empty subheading
- **THEN** the dangling reference is reported with category `structure` and the empty subheading with category `site`
