# site-rendering Specification

## Purpose

Turns a valid site document into semantic, accessible, standards-compliant HTML pages and a theme stylesheet, independently of any editor.

## Requirements

### Requirement: Only valid documents render
Rendering SHALL refuse a document that fails validation and SHALL return the validation errors instead of partial output.

#### Scenario: Invalid document
- **WHEN** rendering a document with an image missing alt text
- **THEN** no HTML is produced and the validation errors are returned

### Requirement: Page document structure
Each page SHALL render as a complete HTML5 document with `<!doctype html>`, `<html lang>` set from the site language, a UTF-8 charset declaration, a responsive viewport meta tag, a `<title>` combining the page title and site name, a meta description when the page has SEO description text, and a link to the site stylesheet. The body SHALL contain a `<header>` with the site name, linking to the home page, and navigation in a `<nav>`, a single `<main>` holding the page's blocks, and a `<footer>`. The home page is the page named by the site's home page ID, wherever it is in the list of pages.

#### Scenario: Language and landmarks
- **WHEN** rendering a page of a site whose language is `cs`
- **THEN** the output starts with `<!doctype html>`, has `<html lang="cs">`, and contains exactly one `<header>`, `<nav>`, `<main>` and `<footer>`

#### Scenario: Title
- **WHEN** rendering page "Kontakt" of site "Anideti"
- **THEN** the `<title>` is `Kontakt – Anideti`

#### Scenario: Home page title
- **WHEN** rendering the home page of site "Anideti"
- **THEN** the `<title>` is `Anideti`

#### Scenario: Home page not first in the list
- **WHEN** a site lists pages "Kontakt", "Úvod" and its home page ID names "Úvod"
- **THEN** "Úvod" renders with the `<title>` `Anideti`, and the site name in every page's header links to the base path

### Requirement: Heading hierarchy
Each page SHALL contain exactly one `<h1>`. When the first block is a `hero`, the hero heading SHALL be the `<h1>`; otherwise the page title SHALL render as an `<h1>` at the start of `<main>`. Block headings (`services` heading, `rich_text` subheadings) SHALL render at level 2 or 3, never skipping a level.

#### Scenario: Page with hero
- **WHEN** a page's first block is a hero with heading "Welcome"
- **THEN** the page's only `<h1>` is "Welcome"

#### Scenario: Page without hero
- **WHEN** a page titled "Services" starts with a `services` block
- **THEN** the page has `<h1>Services</h1>` followed by the block, whose heading is an `<h2>`

### Requirement: Base path
Rendering SHALL accept an optional base path (a root-relative path starting and ending with `/`, default `/`). Every internal URL the renderer emits (page links, the stylesheet link, image sources) SHALL be prefixed with it, so the site works when served from a subdirectory. A base path that does not start and end with `/` SHALL be rejected with an error.

#### Scenario: Default base path
- **WHEN** rendering without a base path
- **THEN** the stylesheet link is `/assets/style.css`

#### Scenario: Subdirectory base path
- **WHEN** rendering with base path `/preview/`
- **THEN** the stylesheet link is `/preview/assets/style.css`, the home link is `/preview/`, and the `kontakt` link is `/preview/kontakt/`

#### Scenario: Malformed base path
- **WHEN** rendering with base path `preview`
- **THEN** rendering fails with an invalid-base-path error

### Requirement: Navigation rendering
The navigation SHALL render as a list of links in document order. A link to the home page SHALL point to the base path, and a link to another page SHALL point to `<base path><slug>/`. The home page's own slug SHALL NOT appear in any link. The link to the page being rendered SHALL carry `aria-current="page"`.

#### Scenario: Current page marked
- **WHEN** rendering page `kontakt` with the default base path, and its navigation includes it
- **THEN** its navigation link has `href="/kontakt/"` and `aria-current="page"`, and no other link has `aria-current`

#### Scenario: Link to the home page
- **WHEN** the home page has slug `uvod` and a navigation item, a text link and a call to action point to it
- **THEN** all of them link to the base path, and no link is `/uvod/`

### Requirement: Block rendering
Blocks SHALL render in document order as semantic HTML:
- `hero` as a `<section>` containing its heading, text, image and call-to-action link.
- `rich_text` as a `<section>` containing `<p>`, `<h2>`/`<h3>` and `<ul><li>` elements. Bold, italic and link marks render as `<strong>`, `<em>` and `<a>`.
- `services` as a `<section>` with an optional heading and a `<ul>` of service items, each with its name, description and price when present.

Each block's root element SHALL carry a class naming its block type, for styling.

#### Scenario: Marked text
- **WHEN** a paragraph "Call us today" has bold on offsets 0–7
- **THEN** it renders as `<p><strong>Call us</strong> today</p>`

#### Scenario: Services without price
- **WHEN** a service item has no price text
- **THEN** its rendered item contains no empty price element

### Requirement: Images
Images SHALL render as `<img>` with `src`, `alt`, `width` and `height` when known, and `loading="lazy"` except in a hero. A decorative image SHALL render with `alt=""`.

#### Scenario: Decorative image
- **WHEN** rendering an image marked decorative
- **THEN** the output is an `<img>` with `alt=""`

### Requirement: Output escaping
All document text and attribute values SHALL be HTML-escaped, so that document content cannot inject markup or scripts. Rendered pages SHALL contain no `<script>` elements and no inline event-handler attributes.

#### Scenario: Markup in text
- **WHEN** a paragraph's text is `<script>alert(1)</script>`
- **THEN** the output contains the escaped text `&lt;script&gt;alert(1)&lt;/script&gt;` and no `<script>` element

### Requirement: Theme stylesheet
Rendering SHALL produce one stylesheet that defines the theme values as CSS custom properties on `:root` (colors, fonts, radius, content width) and base styles for the page layout and every block type, which use only those custom properties for themeable values. Changing the theme SHALL change only the custom-property values, not the page HTML.

#### Scenario: Theme change leaves HTML unchanged
- **WHEN** a site is rendered twice with different primary colors and otherwise identical documents
- **THEN** the page HTML is identical and only the stylesheet's custom-property values differ

### Requirement: Deterministic output
Rendering the same document SHALL always produce byte-identical output.

#### Scenario: Repeated render
- **WHEN** the same document is rendered twice
- **THEN** both results are byte-identical
