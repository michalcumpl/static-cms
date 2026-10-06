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

### Requirement: Heading hierarchy
Each page SHALL contain exactly one `<h1>`. When the first block is a `hero`, the hero heading SHALL be the `<h1>`; otherwise the page title SHALL render as an `<h1>` at the start of `<main>`. Block headings (the heading of `services`, `text_with_image`, `gallery`, `team` and `logos` blocks, and `rich_text` subheadings) SHALL render at level 2 or 3, never skipping a level. A person's name SHALL render as an `<h3>` when its team has a heading, and as an `<h2>` otherwise.

#### Scenario: Page with hero
- **WHEN** a page's first block is a hero with heading "Welcome"
- **THEN** the page's only `<h1>` is "Welcome"

#### Scenario: Page without hero
- **WHEN** a page titled "Services" starts with a `services` block
- **THEN** the page has `<h1>Services</h1>` followed by the block, whose heading is an `<h2>`

#### Scenario: Team names
- **WHEN** a team block with heading "Kdo jsme" has people "Kateřina" and "Martina"
- **THEN** "Kdo jsme" renders as an `<h2>` and the two names as `<h3>` elements

#### Scenario: Team without a heading
- **WHEN** a team block without a heading has a person "Kateřina"
- **THEN** "Kateřina" renders as an `<h2>`

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
- `services` as a `<section>` with an optional heading and a `<ul>` of the service items it shows, each with its name, description and price when present.
- `text_with_image` as a `<section>` with its heading, its paragraphs and lists, and its image, carrying a class that names the image side (`image-left` or `image-right`).
- `gallery` as a `<section>` with an optional heading and a `<ul>` of photos, each a `<figure>` holding a link to the photo's largest variant around its image, and a `<figcaption>` when it has a caption.
- `team` as a `<section>` with an optional heading and a `<ul>` of the people it shows, each with the portrait (when present), the name, the role and the text (when present).
- `logos` as a `<section>` with an optional heading and a `<ul>` of logos, each an image whose alt text is the partner's name, wrapped in a link when the logo has one.
- `contact` as a `<section>` with an optional heading and the site's contact details (see "Contact details").
- `opening_hours` as a `<section>` with an optional heading and the site's opening hours (see "Opening hours table").
- `call_to_action` as a `<section>` with its heading, its text when present, and its buttons as links in one paragraph. The first button has the class `button`, and the second the classes `button` and `button-secondary`.
- `testimonials` as a `<section>` with an optional heading and a `<ul>` of the testimonials it shows. Each is a `<figure>` holding a `<blockquote>` with the quote and a `<figcaption>` with the photo (when present, decorative or described), the name and the detail (when present).
- `faq` as a `<section>` with an optional heading and one `<details>` element per question it shows. Each has a `<summary>` with the question and the answer's paragraphs after it. The questions start closed, and opening them needs no JavaScript.

Each block's root element SHALL carry a class naming its block type, for styling. Optional texts that are empty SHALL NOT produce empty elements. A collection block that shows no items SHALL render nothing.

#### Scenario: Marked text
- **WHEN** a paragraph "Call us today" has bold on offsets 0–7
- **THEN** it renders as `<p><strong>Call us</strong> today</p>`

#### Scenario: Services without price
- **WHEN** a service item has no price text
- **THEN** its rendered item contains no empty price element

#### Scenario: Image on the left
- **WHEN** rendering a `text_with_image` block whose image side is `left`
- **THEN** its section carries the classes `text-with-image` and `image-left`

#### Scenario: Gallery photo enlarges
- **WHEN** rendering a gallery item whose image has media key `dilna-1a2b3c4d` and width 3000, at the default base path
- **THEN** the image is wrapped in `<a href="/assets/images/dilna-1a2b3c4d-2400.webp">`

#### Scenario: Logo alt text and link
- **WHEN** rendering a logo item named "Nadace Harmonie" with a link to `https://harmonie.example`
- **THEN** it renders an `<a href="https://harmonie.example">` around an `<img>` with `alt="Nadace Harmonie"`

#### Scenario: Call to action with two buttons
- **WHEN** rendering a call to action headed "Upečeme vám dort" with buttons "Objednat" (to the page `kontakt`) and "Zavolat" (to `tel:+420321123456`)
- **THEN** its section has `<h2>Upečeme vám dort</h2>`, `<a class="button" href="/kontakt/">Objednat</a>` and `<a class="button button-secondary" href="tel:+420321123456">Zavolat</a>`

#### Scenario: Testimonial
- **WHEN** rendering a testimonial "Nejlepší chleba v Kolíně." by "Jana Nováková", detail "zákaznice od roku 2015", without a photo
- **THEN** it renders as a `<figure>` with `<blockquote><p>Nejlepší chleba v Kolíně.</p></blockquote>` and a `<figcaption>` holding "Jana Nováková" and "zákaznice od roku 2015", and no image

#### Scenario: Question and answer
- **WHEN** rendering an FAQ block headed "Časté dotazy" showing the question "Rozvážíte?" with the answer "Ano, po Kolíně zdarma."
- **THEN** its section has `<h2>Časté dotazy</h2>` and `<details><summary>Rozvážíte?</summary><p>Ano, po Kolíně zdarma.</p></details>`

#### Scenario: Nothing to show
- **WHEN** a team block is in the `all` mode and the team collection is empty
- **THEN** the page contains no element for that block

### Requirement: Images
Images SHALL render as `<img>` with `src`, `srcset`, `sizes`, `alt`, `width` and `height`, and `loading="lazy"` except in a hero. The `srcset` SHALL list every variant of the image's width ladder (the ladder widths 480, 960, 1600 and 2400 that are smaller than the image's width, plus the image's own width capped at 2400) as `<base path>assets/images/<media key>-<width>.webp <width>w`. The `src` SHALL be the largest of those variants that is at most 1600 pixels wide. `width` and `height` SHALL be the image's dimensions, so the browser reserves its space. `sizes` SHALL depend only on the block the image is in, not on the theme. A decorative image SHALL render with `alt=""`.

#### Scenario: Decorative image
- **WHEN** rendering an image marked decorative
- **THEN** the output is an `<img>` with `alt=""`

#### Scenario: Large hero image
- **WHEN** rendering a hero image with media key `pult-3f9a2c1d`, width 4032 and height 3024, at the default base path
- **THEN** its `srcset` lists `/assets/images/pult-3f9a2c1d-480.webp 480w`, `…-960.webp 960w`, `…-1600.webp 1600w` and `…-2400.webp 2400w`, its `src` is `/assets/images/pult-3f9a2c1d-1600.webp`, and it has `width="4032" height="3024"` and no `loading` attribute

#### Scenario: Small image
- **WHEN** rendering an image with media key `hero.png`, width 320 and height 180
- **THEN** its `srcset` lists only `/assets/images/hero.png-320.webp 320w` and its `src` is that file

### Requirement: Output escaping
All document text and attribute values SHALL be HTML-escaped, so that document content cannot inject markup or scripts. Rendered pages SHALL contain no `<script>` elements and no inline event-handler attributes.

#### Scenario: Markup in text
- **WHEN** a paragraph's text is `<script>alert(1)</script>`
- **THEN** the output contains the escaped text `&lt;script&gt;alert(1)&lt;/script&gt;` and no `<script>` element

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

### Requirement: Deterministic output
Rendering the same document SHALL always produce byte-identical output.

#### Scenario: Repeated render
- **WHEN** the same document is rendered twice
- **THEN** both results are byte-identical

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

### Requirement: Image sizes per block
Each block SHALL give its images a fixed `sizes` value and a loading behaviour:
- hero: `(min-width: 48rem) 40vw, 100vw`, loaded eagerly;
- text with image: `(min-width: 48rem) 50vw, 100vw`, lazy;
- gallery: `(min-width: 48rem) 33vw, 50vw`, lazy;
- team portrait: `10rem`, lazy;
- logo: `12rem`, lazy;
- testimonial photo: `4rem`, lazy.

The stylesheet SHALL crop gallery photos to 4:3, and portraits and testimonial photos to a circle (1:1), without changing the image files, and SHALL limit logos to at most 4rem in height.

#### Scenario: Gallery image
- **WHEN** rendering a gallery photo
- **THEN** its `<img>` has `sizes="(min-width: 48rem) 33vw, 50vw"` and `loading="lazy"`

### Requirement: Canonical links
Rendering SHALL accept an optional site address (an absolute `http` or `https` URL, such as `https://anideti.cz`). When it is given, each page SHALL include `<link rel="canonical">` with the page's absolute URL: the site address followed by the page's address (the site address with a trailing slash for the home page). Without a site address, pages SHALL have no canonical link. A site address that isn't an absolute http(s) URL SHALL be rejected with an error.

#### Scenario: Canonical link of a page
- **WHEN** rendering the page `kontakt` with site address `https://anideti.cz`
- **THEN** it contains `<link rel="canonical" href="https://anideti.cz/kontakt/">`

#### Scenario: Canonical link of the home page
- **WHEN** rendering the home page with site address `https://anideti.cz/`
- **THEN** it contains `<link rel="canonical" href="https://anideti.cz/">`

#### Scenario: No site address
- **WHEN** rendering without a site address
- **THEN** no page contains a canonical link

### Requirement: Share previews
Every page SHALL carry Open Graph and Twitter card metadata:
- `og:type` `website`;
- `og:site_name` (the site name);
- `og:title` (the page title, or the site name on the home page);
- `og:description`, when the page has a meta description, with the same text.

When rendering is given the site's address, a page SHALL also carry:
- `og:url`, equal to its canonical link;
- when the page or the site has a share image, `og:image` with the absolute URL of the share file `assets/images/<media key>-share.jpg`;
- `og:image:width` `1200` and `og:image:height` `630`;
- `og:image:alt`, when the image has alt text.

The page's own share image SHALL win over the site's default. `twitter:card` SHALL be `summary_large_image` when the page has `og:image`, and `summary` otherwise. Without the site's address there SHALL be no `og:url` and no `og:image`.

#### Scenario: Page with the site's share image
- **WHEN** rendering the page "Kontakt" with site address `https://anideti.cz`, where the page has no share image and the site's default share image has media key `pult-3f9a`
- **THEN** the page has `og:url` `https://anideti.cz/kontakt/`, `og:image` `https://anideti.cz/assets/images/pult-3f9a-share.jpg` and `twitter:card` `summary_large_image`

#### Scenario: Page's own share image
- **WHEN** the page "Kontakt" has share image `mapa-77aa` and the site's default is `pult-3f9a`
- **THEN** its `og:image` ends with `mapa-77aa-share.jpg`

#### Scenario: No site address
- **WHEN** rendering without a site address a site that has a default share image
- **THEN** pages have `og:title` and `twitter:card` `summary`, and no `og:url` or `og:image`

### Requirement: Favicon links
When the site has a favicon, every page SHALL link to it:
- `favicon.ico` (32 × 32 pixels) as `<link rel="icon" sizes="32x32">`;
- `icon-512.png` as `<link rel="icon" type="image/png" sizes="512x512">`;
- `apple-touch-icon.png` as `<link rel="apple-touch-icon">`.

All three SHALL be at the base path. Without a favicon there SHALL be no icon links.

#### Scenario: Site with a favicon
- **WHEN** rendering a site with a favicon at base path `/`
- **THEN** every page links `/favicon.ico`, `/icon-512.png` and `/apple-touch-icon.png`

#### Scenario: Site without a favicon
- **WHEN** rendering a site without a favicon
- **THEN** no page has an icon link

### Requirement: Structured data
When rendering is given the site's address, the home page SHALL contain one `<script type="application/ld+json">` with a schema.org `WebSite` and an organization:
- **`WebSite`** has the site name, the site's address with a trailing slash, the site language, and the site description when there is one.
- **The organization** has the business name (or the site name) and the site's address. When the site has a logo, it also has the absolute URL of the logo's `src` file as its logo; otherwise, when the site has a favicon, `icon-512.png`'s absolute URL.
  - When the business has social profiles, it has their addresses, in order, as `sameAs`.
  - When the site has services, it has an `hasOfferCatalog`: an `OfferCatalog` named after the site's language ("Služby", "Services"), with one `Offer` per service in collection order, each offering a `Service` with the service's name and, when it has one, its description as plain text. The price text is not included.
  - **With one location:** its type is `Organization` while that location has no street, city or phone. Once it has one of them, its type is the business's type, and it also has the location's:
    - the postal address (street, postal code, city, country), each part when filled in;
    - the phone and the email, when filled in;
    - the map address as `hasMap`, when filled in;
    - `openingHoursSpecification` with one entry for each distinct time range, listing the days that have it (as `Monday` to `Sunday`) and its opening and closing times.
  - **With several locations:** its type is `Organization`, and the graph also has one entry per location that has a street, city or phone. Each is of the business's type, with an `@id` of the site's address followed by `#location-` and its position (from 1), the business name and the location's name joined by " – ", the location's details as listed above, and `parentOrganization` pointing at the organization's `@id`.

The JSON SHALL be escaped so that no text in it can end the script element. Other pages, and every page rendered without the site's address, SHALL have no structured data.

#### Scenario: Home page structured data
- **WHEN** rendering the home page of site "Anideti" in language `cs` with site address `https://anideti.cz`
- **THEN** it contains JSON-LD with a `WebSite` named "Anideti", URL `https://anideti.cz/` and language `cs`, and an `Organization` named "Anideti"

#### Scenario: A bakery with opening hours
- **WHEN** the business is a `Bakery` with one location at "Lipová 12", "280 02" "Kolín", country `CZ`, phone `+420321123456`, open Monday to Friday 06:00–17:00 and Saturday 07:00–11:00
- **THEN** the home page's JSON-LD has a `Bakery` with `telephone` `+420321123456` and a `PostalAddress` with `streetAddress` "Lipová 12", `postalCode` "280 02", `addressLocality` "Kolín" and `addressCountry` "CZ"
- **AND** it has two `OpeningHoursSpecification` entries: Monday to Friday 06:00–17:00, and Saturday 07:00–11:00

#### Scenario: Logo preferred over the favicon
- **WHEN** rendering the home page with site address `https://pekarna.cz` of a site with a favicon and a logo with media key `pekarna-7c1e` and width 600
- **THEN** the organization's logo is `https://pekarna.cz/assets/images/pekarna-7c1e-600.webp`

#### Scenario: Services and profiles
- **WHEN** rendering the home page with a site address, for a business with an Instagram profile and the services "Chléb" and "Dorty na zakázku"
- **THEN** the organization has `sameAs` with the Instagram address, and an `OfferCatalog` with two offers whose services are named "Chléb" and "Dorty na zakázku"

#### Scenario: Script-ending text in the name
- **WHEN** the site name contains `</script>`
- **THEN** the JSON-LD contains no literal `</script>` before its own closing tag

#### Scenario: Other pages
- **WHEN** rendering the page "Kontakt" with a site address
- **THEN** it has no structured data

#### Scenario: Two shops
- **WHEN** rendering the home page with site address `https://pekarna.cz` of a `Bakery` "Pekárna U Lípy" with the locations "Kolín – Lipová" and "Kutná Hora", each with an address
- **THEN** the JSON-LD has an `Organization` "Pekárna U Lípy" and two `Bakery` entries, "Pekárna U Lípy – Kolín – Lipová" with `@id` `https://pekarna.cz/#location-1` and "Pekárna U Lípy – Kutná Hora" with `@id` `https://pekarna.cz/#location-2`, each with its own address and `parentOrganization` `{"@id": "https://pekarna.cz/#organization"}`

### Requirement: Page not found
Rendering SHALL produce a "page not found" page in addition to the site's pages. It SHALL have:
- the site's header, navigation and footer;
- an `h1` and a short message in the site's language, with a link to the home page;
- the `<title>` of the `h1` and the site name;
- no canonical link, no share metadata and no structured data.

Czech (`cs`), Slovak (`sk`), English (`en`), German (`de`) and Polish (`pl`) SHALL have their own wording, and any other language SHALL use English. All its links SHALL be absolute paths from the base path, so that it works at any address.

#### Scenario: Czech site
- **WHEN** rendering the not-found page of site "Anideti" in language `cs`
- **THEN** its `h1` is "Stránka nenalezena", its `<title>` is `Stránka nenalezena – Anideti`, and it links to the home page

#### Scenario: Other language
- **WHEN** rendering the not-found page of a site in language `fr`
- **THEN** its `h1` is "Page not found"

#### Scenario: German site
- **WHEN** rendering the not-found page of a site in language `de`
- **THEN** its `h1` is "Seite nicht gefunden"

### Requirement: Contact details
Wherever contact details are shown (a `contact` block, or the footer), they SHALL render in an `<address>` element, each part only when it is filled in:
- the street on one line, and the postal code and city on the next;
- the phone as a `tel:` link to the stored number. Czech and Slovak numbers (`+420`, `+421`) with nine digits show as `+420 321 123 456`, with non-breaking spaces so the number stays on one line; other numbers show as stored.
- the email as a `mailto:` link.
- a "Show on map" link in the site's language (Czech: "Zobrazit na mapě"):
  - when the address has a street or city, or a map address is filled in;
  - pointing to the map address when there is one;
  - otherwise to `https://www.google.com/maps/search/?api=1&query=` followed by the URL-encoded "street, postal code city, country".

A `contact` block SHALL show only the parts its switches allow. A `contact` block with nothing to show SHALL render its heading only.

#### Scenario: Contact block
- **WHEN** rendering a `contact` block headed "Kde nás najdete" for a business at "Lipová 12", "280 02" "Kolín", with phone `+420321123456` and email `objednavky@pekarna-ulipy.example`, on a Czech site
- **THEN** the section has `<h2>Kde nás najdete</h2>`, and an `<address>` with "Lipová 12", "280 02 Kolín", `<a href="tel:+420321123456">` showing "+420 321 123 456" and `<a href="mailto:objednavky@pekarna-ulipy.example">`
- **AND** it has "Zobrazit na mapě" linking to `https://www.google.com/maps/search/?api=1&query=Lipov%C3%A1%2012%2C%20280%2002%20Kol%C3%ADn%2C%20CZ`

#### Scenario: Map address given
- **WHEN** the business's map address is `https://maps.app.goo.gl/abc`
- **THEN** "Zobrazit na mapě" links to `https://maps.app.goo.gl/abc`

#### Scenario: Phone hidden
- **WHEN** a `contact` block's phone switch is off
- **THEN** it has no `tel:` link

### Requirement: Opening hours table
Opening hours SHALL render as a `<table>` with one row per group of consecutive days that have the same ranges:
- a `<th scope="row">` with the day, or the first and last day of the group joined by an en dash;
- a `<td>` with the ranges, each as `H:MM–H:MM` (hours without a leading zero, an en dash between), separated by a comma and a space, or the word for closed.

Day names and the word for closed come in the site's language: Czech `Po Út St Čt Pá So Ne` and "zavřeno"; Slovak `Po Ut St Št Pi So Ne` and "zatvorené"; German `Mo Di Mi Do Fr Sa So` and "geschlossen"; Polish `Pn Wt Śr Cz Pt Sb Nd` and "zamknięte"; English, the fallback for other languages, `Mon Tue Wed Thu Fri Sat Sun` and "Closed". The note SHALL follow the table in a `<p>` when it isn't empty. When every day is closed, there SHALL be no table, only the note.

#### Scenario: Weekdays grouped
- **WHEN** rendering opening hours with Monday to Friday 06:00–17:00, Saturday 07:00–11:00 and Sunday closed, on a Czech site
- **THEN** the table's rows are "Po–Pá" "6:00–17:00", "So" "7:00–11:00", and "Ne" "zavřeno"

#### Scenario: Lunch break
- **WHEN** Monday alone has 08:00–12:00 and 13:00–17:00, on an English site
- **THEN** Monday's row reads "Mon" "8:00–12:00, 13:00–17:00"

#### Scenario: Only a note
- **WHEN** every day is closed and the note is "Po domluvě"
- **THEN** the hours render as `<p>Po domluvě</p>` without a table

### Requirement: Footer contact details
When the business's "show in the footer" switch is on, every page's footer (the not-found page included) SHALL show the business's details before the copyright line, and the business name above them when it differs from the site name:
- **one location:** when it has any of a street, city, phone, email, open day or note, its contact details and opening hours, with the same markup rules as "Contact details" and "Opening hours table";
- **several locations:** each location that has a street, city or phone, in list order, as a compact entry: its name in `<strong>`, then its street, postal code and city, and its phone, with the same markup rules as "Contact details", without the email, the map link or the opening hours.

Otherwise the footer SHALL be unchanged.

#### Scenario: Footer with details
- **WHEN** rendering any page of a site whose business has a phone and opening hours, with the switch on
- **THEN** the page's `<footer>` contains an `<address>` with the phone link and the opening hours table, followed by the copyright line

#### Scenario: Switch off
- **WHEN** the business has details and the switch is off
- **THEN** the footer contains only the copyright line

#### Scenario: Nothing filled in
- **WHEN** the business has no details
- **THEN** the footer contains only the copyright line

#### Scenario: Two shops in the footer
- **WHEN** rendering any page of a site with the locations "Kolín – Lipová" and "Kutná Hora", each with an address and a phone, and opening hours, with the switch on
- **THEN** the footer shows both names, each with its address and phone link, and no opening hours table

### Requirement: Language alternates
Rendering SHALL accept, optionally, the site's languages. For each language, it is given:
- the language tag;
- its name in that language (for example "Čeština", "English");
- its base path;
- the address of each of its pages by translation key;
- which language is primary.

When rendering is given two or more languages:
- **Alternates:** every page SHALL have a `<link rel="alternate" hreflang="<lang>">` for each language that has a page with the same translation key, its own language included. There SHALL also be an `hreflang="x-default"` link to the primary language's counterpart, when the primary has one. The links SHALL use absolute URLs when the site's address is known, otherwise paths.
- **Switcher:** the header SHALL contain a language switcher, a `<nav>` with an accessible name, listing every language by its own name. Each language links to its counterpart of the current page, or to its home page when there is none. The current language is marked `aria-current="true"`, and each link has its language's `lang` and `hreflang` attributes.
- **The not-found page** SHALL have the switcher linking to each language's home page, and no alternates.

With one language, or none given, pages SHALL have neither alternates nor a switcher.

#### Scenario: Counterpart in English
- **WHEN** rendering the Czech page "Kontakt" at `/kontakt/`, whose English counterpart is at `/en/contact/`, with site address `https://anideti.cz`
- **THEN** the page has `<link rel="alternate" hreflang="cs" href="https://anideti.cz/kontakt/">`, `<link rel="alternate" hreflang="en" href="https://anideti.cz/en/contact/">` and `<link rel="alternate" hreflang="x-default" href="https://anideti.cz/kontakt/">`
- **AND** its switcher links "English" to `/en/contact/`

#### Scenario: No counterpart
- **WHEN** rendering a Czech page whose translation key has no English page
- **THEN** it has no English alternate, and the switcher links "English" to `/en/`

#### Scenario: One language
- **WHEN** rendering a site given only its own language
- **THEN** no page has an alternate link or a language switcher

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

### Requirement: Collection block rendering
A `services`, `team`, `testimonials` or `faq` block SHALL render the items it shows (see "Collection blocks" in the site-document capability): all items of its collection in collection order, or its chosen items in its own order. An item SHALL render the same way in every block that shows it. Changing an item SHALL change every page that shows it.

#### Scenario: One service on two pages
- **WHEN** the service "Chléb" is shown by the home page's chosen services block and by the "Služby" page's block showing all services, and its price text changes to "45 Kč"
- **THEN** both rendered pages show "45 Kč"

#### Scenario: Chosen order
- **WHEN** a services block in the `chosen` mode references services 3 and 1
- **THEN** its `<ul>` lists service 3 first and then service 1

### Requirement: Social links in the footer
When the business's "show in the footer" switch is on and the business has social profiles, every page's footer (the not-found page included) SHALL list them, in their order, as text links named by their kind ("Instagram", or the host for other addresses), inside a `<nav>` whose accessible name comes from the site's language ("Sociální sítě", "Social media"). The footer SHALL load no icons, scripts or other files from third parties. Because the page then has two navigation landmarks, the main menu SHALL get its accessible name ("Hlavní nabídka", "Main menu"), as it does next to a language switcher.

#### Scenario: Two profiles
- **WHEN** rendering a page of a Czech site whose business has an Instagram and a Facebook profile, with the switch on
- **THEN** the footer has a `<nav aria-label="Sociální sítě">` with links "Instagram" and "Facebook" to the profiles' addresses, and the main menu is labelled "Hlavní nabídka"

#### Scenario: Switch off
- **WHEN** the business has social profiles and the footer switch is off
- **THEN** the footer has no social links

### Requirement: Business blocks for several locations
A `contact` or `opening_hours` block SHALL show the locations its location choice names: all of the business's locations in list order, or the one it chose.
- **One location shown:** the block renders as described in "Contact details" and "Opening hours table", without the location's name.
- **Several shown:** each location renders in its own group, in list order, headed by its name one heading level below the block's heading (`<h3>` under a block heading, `<h2>` without one), followed by its contact details or opening hours.

A location with nothing to show for the block (a contact block's shown parts all empty, or every day closed and no note) SHALL be left out.

#### Scenario: Contact block for all shops
- **WHEN** rendering a contact block headed "Kde nás najdete" with all locations, for the locations "Kolín – Lipová" and "Kutná Hora", each with an address
- **THEN** the section has `<h2>Kde nás najdete</h2>`, then `<h3>Kolín – Lipová</h3>` with its `<address>`, then `<h3>Kutná Hora</h3>` with its `<address>`

#### Scenario: One shop chosen
- **WHEN** rendering an opening hours block whose location is "Kutná Hora"
- **THEN** it shows Kutná Hora's opening hours table only, without a location heading

#### Scenario: A single location, as before
- **WHEN** rendering a contact block with all locations, for a business with one location
- **THEN** the block's HTML is the same as for the business details of format 7
