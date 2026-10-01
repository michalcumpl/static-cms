# Spec Delta

## MODIFIED Requirements

### Requirement: Theme stylesheet
Rendering SHALL produce one stylesheet that defines the theme values as CSS custom properties on `:root` (colors, fonts, radius, content width) and base styles for the page layout and every block type, which use only those custom properties for themeable values. Changing the theme SHALL change only the stylesheet, not the page HTML.

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

### Requirement: Page document structure
Each page SHALL render as a complete HTML5 document. Its head SHALL have:
- `<!doctype html>` and `<html lang>` set from the site language;
- a UTF-8 charset declaration and a responsive viewport meta tag;
- a `<title>` combining the page title and site name;
- a meta description when the page or the site has a description (the page's own when it has one, otherwise the site's);
- a link to the site stylesheet.

The body SHALL contain:
- a `<header>` with a link to the home page showing the site's logo, its name or both (see "Header logo"), and navigation in a `<nav>`;
- a single `<main>` holding the page's blocks;
- a `<footer>`.

The home page is the page named by the site's home page ID, wherever it is in the list of pages.

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

#### Scenario: Site description as fallback
- **WHEN** rendering a page with an empty description on a site described as "Rodinná školka v Brně"
- **THEN** the page has `<meta name="description" content="Rodinná školka v Brně">`

#### Scenario: Page description wins
- **WHEN** rendering a page described as "Napište nám" on a site described as "Rodinná školka v Brně"
- **THEN** the meta description is "Napište nám"

### Requirement: Media files used by a document
Rendering SHALL be able to report, for a document, the media files its exported site uses, each once, in a stable order:
- **For every image in the site's pages** (blocks), and for the site's logo, its variant file names.
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

### Requirement: Structured data
When rendering is given the site's address, the home page SHALL contain one `<script type="application/ld+json">` with a schema.org `WebSite` and an organization:
- **`WebSite`** has the site name, the site's address with a trailing slash, the site language, and the site description when there is one.
- **The organization** has the business name (or the site name) and the site's address. When the site has a logo, it also has the absolute URL of the logo's `src` file as its logo; otherwise, when the site has a favicon, `icon-512.png`'s absolute URL.
  - Its type is `Organization` while the business has no street, city or phone.
  - Once it has one of them, its type is the business's type, and it also has:
    - the postal address (street, postal code, city, country), each part when filled in;
    - the phone and the email, when filled in;
    - the map address as `hasMap`, when filled in;
    - `openingHoursSpecification` with one entry for each distinct time range, listing the days that have it (as `Monday` to `Sunday`) and its opening and closing times.

The JSON SHALL be escaped so that no text in it can end the script element. Other pages, and every page rendered without the site's address, SHALL have no structured data.

#### Scenario: Home page structured data
- **WHEN** rendering the home page of site "Anideti" in language `cs` with site address `https://anideti.cz`
- **THEN** it contains JSON-LD with a `WebSite` named "Anideti", URL `https://anideti.cz/` and language `cs`, and an `Organization` named "Anideti"

#### Scenario: A bakery with opening hours
- **WHEN** the business is a `Bakery` at "Lipová 12", "280 02" "Kolín", country `CZ`, phone `+420321123456`, open Monday to Friday 06:00–17:00 and Saturday 07:00–11:00
- **THEN** the home page's JSON-LD has a `Bakery` with `telephone` `+420321123456` and a `PostalAddress` with `streetAddress` "Lipová 12", `postalCode` "280 02", `addressLocality` "Kolín" and `addressCountry` "CZ"
- **AND** it has two `OpeningHoursSpecification` entries: Monday to Friday 06:00–17:00, and Saturday 07:00–11:00

#### Scenario: Logo preferred over the favicon
- **WHEN** rendering the home page with site address `https://pekarna.cz` of a site with a favicon and a logo with media key `pekarna-7c1e` and width 600
- **THEN** the organization's logo is `https://pekarna.cz/assets/images/pekarna-7c1e-600.webp`

#### Scenario: Script-ending text in the name
- **WHEN** the site name contains `</script>`
- **THEN** the JSON-LD contains no literal `</script>` before its own closing tag

#### Scenario: Other pages
- **WHEN** rendering the page "Kontakt" with a site address
- **THEN** it has no structured data

## ADDED Requirements

### Requirement: Header logo
The header's link to the home page SHALL show:
- **without a logo:** the site name as text;
- **with a logo and the name shown:** the logo image with empty alt text, followed by the site name as text;
- **with a logo and the name hidden:** only the logo image, with the site name as its alt text.

The logo SHALL render as an `<img>` like other images (`src`, `srcset`, `width`, `height`), loaded eagerly. Its `sizes` SHALL be its displayed width at a height of 3rem, `calc(3rem * <width> / <height>)` with the ratio rounded to at most two decimal places, without trailing zeros. The stylesheet SHALL show the logo at most 3rem high (2.5rem on narrow screens) and never wider than the header. The site name's text in the header SHALL be the site name of the page's language.

#### Scenario: Logo and name
- **WHEN** rendering a page of site "Pekárna Kolín" with a logo 600 × 200 pixels and the name shown
- **THEN** the header link holds an `<img alt="" … sizes="calc(3rem * 3)">` followed by the text "Pekárna Kolín"

#### Scenario: Logo only
- **WHEN** rendering a page of site "Pekárna Kolín" with a logo and the name hidden
- **THEN** the header link holds only an `<img>` with `alt="Pekárna Kolín"`, and no other text

#### Scenario: Name hidden without a logo
- **WHEN** rendering a site with no logo and the name hidden
- **THEN** the header link shows the site name as text
