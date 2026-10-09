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
The navigation SHALL render as a list of links in document order. A link to the home page SHALL point to the base path, and a link to another page SHALL point to `<base path><slug>/`. The home page's own slug SHALL NOT appear in any link. The link to the page being rendered SHALL carry `aria-current="page"`. A menu group SHALL render as a list item holding a `<details>` element whose `<summary>` is the group's label and whose content is a list of the group's links; groups start closed, and opening one SHALL close the others without JavaScript (a shared `name`). A group without links SHALL NOT be rendered. The group holding the current page's link SHALL be styled like a current link.

#### Scenario: Current page marked
- **WHEN** rendering page `kontakt` with the default base path, and its navigation includes it
- **THEN** its navigation link has `href="/kontakt/"` and `aria-current="page"`, and no other link has `aria-current`

#### Scenario: Link to the home page
- **WHEN** the home page has slug `uvod` and a navigation item, a text link and a call to action point to it
- **THEN** all of them link to the base path, and no link is `/uvod/`

#### Scenario: Projects grouped
- **WHEN** the navigation holds a group "Projekty" with four page links, then links to "O nás" and "Kontakty"
- **THEN** the menu's list has three items: a closed `<details>` with the summary "Projekty" and a list of four links, then the two links

#### Scenario: Current page inside a group
- **WHEN** rendering the page "Eventy", linked from the group "Projekty"
- **THEN** its link inside the group has `aria-current="page"`, and the group's summary is styled as current

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
- `figures` as a `<section>` with an optional heading and a `<ul>` of figures, each with its value and its label in separate elements, so templates can show the value large.
- `steps` as a `<section>` with its heading and an `<ol>` of steps, each with its title as an `<h3>` and its text as a paragraph when present. The numbers come from the list's order.

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
Images SHALL render as `<img>` with `src`, `srcset`, `sizes`, `alt`, `width` and `height`, and `loading="lazy"` except in a hero. The `srcset` SHALL list every variant of the image's width ladder (the ladder widths 480, 960, 1600 and 2400 that are smaller than the image's width, plus the image's own width capped at 2400) as `<base path>assets/images/<media key>-<width>.webp <width>w`. The `src` SHALL be the largest of those variants that is at most 1600 pixels wide. `width` and `height` SHALL be the image's dimensions, so the browser reserves its space. `sizes` SHALL depend only on the block the image is in, not on the theme. A decorative image SHALL render with `alt=""`. An image whose focal point isn't the centre (50, 50) SHALL carry the class `focus-<x>-<y>`, and the page's `<head>` SHALL end with one `<style>` element holding, for each such class on the page, the rule `.focus-<x>-<y>{object-position:<x>% <y>%}`, so that wherever the stylesheet cuts the image to a shape, the cut keeps the focal point in view. A page without such images SHALL have no `<style>` element. Pages SHALL carry no `style` attributes.

#### Scenario: Decorative image
- **WHEN** rendering an image marked decorative
- **THEN** the output is an `<img>` with `alt=""`

#### Scenario: Large hero image
- **WHEN** rendering a hero image with media key `pult-3f9a2c1d`, width 4032 and height 3024, at the default base path
- **THEN** its `srcset` lists `/assets/images/pult-3f9a2c1d-480.webp 480w`, `…-960.webp 960w`, `…-1600.webp 1600w` and `…-2400.webp 2400w`, its `src` is `/assets/images/pult-3f9a2c1d-1600.webp`, and it has `width="4032" height="3024"` and no `loading` attribute

#### Scenario: Small image
- **WHEN** rendering an image with media key `hero.png`, width 320 and height 180
- **THEN** its `srcset` lists only `/assets/images/hero.png-320.webp 320w` and its `src` is that file

#### Scenario: Portrait framed on the face
- **WHEN** rendering a page with a testimonial photo whose focal point is 40, 30
- **THEN** the `<img>` has the classes `testimonial-photo focus-40-30`, the page's head ends with `<style>.focus-40-30{object-position:40% 30%}</style>`, and the page passes `html-validate`

#### Scenario: Centred image
- **WHEN** rendering a page whose images all have the focal point 50, 50
- **THEN** the page has no `<style>` element and no focal point class, and the output is the same as before focal points existed

#### Scenario: Only where shown
- **WHEN** the site's contact page shows a framed photo and no other page does
- **THEN** only the contact page has a `<style>` element

### Requirement: Output escaping
All document text and attribute values SHALL be HTML-escaped, so that document content cannot inject markup or scripts. Rendered pages SHALL contain no inline event-handler attributes and no `<script>` elements, with two exceptions: structured data (`<script type="application/ld+json">`, see "Structured data"), on pages that show a video, one `<script src="…/assets/video.js" defer>` loading the site's video script, and on pages whose hero is a slideshow, one `<script src="…/assets/slideshow.js" defer>`; neither script holds document content.

#### Scenario: Markup in text
- **WHEN** a paragraph's text is `<script>alert(1)</script>`
- **THEN** the output contains the escaped text `&lt;script&gt;alert(1)&lt;/script&gt;` and no `<script>` element

#### Scenario: Script only with a video
- **WHEN** rendering a page without a video and a page with a videos block
- **THEN** the first has no `<script src>`, and the second has exactly one, loading `assets/video.js`

#### Scenario: Slideshow script only with a slideshow
- **WHEN** rendering a page whose hero is a slideshow and a page without one
- **THEN** the first loads `assets/slideshow.js` and the second doesn't

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

### Requirement: Deterministic output
Rendering the same document SHALL always produce byte-identical output.

#### Scenario: Repeated render
- **WHEN** the same document is rendered twice
- **THEN** both results are byte-identical

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

### Requirement: Key figures and steps layout
The site's stylesheet SHALL show figures as large values in the theme's primary colour with their labels beneath: up to four figures in one row, five or six in rows of three, and two per row where the block is narrow (a phone, or the editor's phone width), and steps as a numbered sequence whose numbers are drawn from the list's order in the primary colour. Both SHALL pass the site's HTML validation and contrast rules like other blocks.

#### Scenario: Figures on a phone
- **WHEN** a figures block with four figures is shown 375 pixels wide
- **THEN** the figures show two per row, each value above its label

#### Scenario: Six figures
- **WHEN** a figures block with six figures is shown on a wide screen
- **THEN** they form two rows of three

#### Scenario: Steps markup
- **WHEN** a steps block "Jak to funguje" has three steps
- **THEN** it renders an `<h2>` "Jak to funguje" and an `<ol>` with three items, each with an `<h3>` title

### Requirement: Block variant rendering
Each variant SHALL render as semantic HTML with a class naming it on the block's root, so templates can style it:
- **hero `cover`:** the image fills the block behind the text (`hero-cover`); the text sits on a shade made from the theme's text colour, in the theme's background colour, so it reads over any photo. The image is not lazy-loaded and is sized for the full width. Without an image the hero renders as `beside`.
- **services `list`** (`services-as-list`): one row per service with its name and price side by side and the description under them, without card borders.
- **services `accordion`** (`services-as-accordion`): one `<details>` per service with a description, its `<summary>` holding the name and the price; a service without a description is a plain row. It works without JavaScript.
- **team `list`** (`team-as-list`): one row per person with the name, role and text, and no portraits.
- **gallery `whole`** (`gallery-whole`): each image shown complete inside the same cell size, on the theme's secondary colour.

The default variants SHALL render exactly as before format 9. Every variant SHALL pass the site's HTML validation.

#### Scenario: Full-photo hero
- **WHEN** a hero with the layout `cover`, an image and a button is rendered
- **THEN** the section has the classes `hero` and `hero-cover`, the image has `sizes="100vw"` and is not lazy, and the heading and button come after it

#### Scenario: Practice areas as an accordion
- **WHEN** a services block in the `accordion` layout shows eight services with descriptions
- **THEN** it renders eight `<details>` elements, each `<summary>` with the service's name and price, all closed

#### Scenario: Team as a list
- **WHEN** a team block in the `list` layout shows a person with a portrait
- **THEN** the person's row has the name, role and text and no image

#### Scenario: Whole screenshots
- **WHEN** a gallery with the image fit `whole` is rendered
- **THEN** the block carries the class `gallery-whole`, and the images keep their links to the largest variant

### Requirement: Projects block rendering
A `projects` block SHALL render the projects it shows (see "Projects block" in the site-document capability) as a list of tiles, each with the project's cover image and its name over it, and its category and summary when it has them. A project without a cover SHALL show its name on the theme's secondary colour. Cover images SHALL be lazy-loaded and sized for the tile.

When the projects have a listing page, each tile SHALL be a link to the project's page. When the block shows fewer projects than its mode and category would (because of its number), it SHALL end with a link to the listing page, labelled in the site's language ("Všechny projekty", "All projects"); without a listing page there SHALL be no such link.

#### Scenario: Tiles that link
- **WHEN** the projects' listing page is "Práce" (`prace`) and a block shows "Poslední závod" with the address `posledni-zavod`
- **THEN** its tile is a link to `/prace/posledni-zavod/` holding the cover image and the name

#### Scenario: Latest four with a link to all
- **WHEN** the home page's projects block has the number 4, the site has thirty projects and a listing page "Work"
- **THEN** the block renders four tiles and a link "All projects" to `/work/`

#### Scenario: No listing page
- **WHEN** the projects have no listing page
- **THEN** the tiles are not links, and no link to all projects is rendered

### Requirement: Item page rendering
When services or projects have a listing page, rendering SHALL produce a page for each of their items, at the listing page's address followed by the item's address, in every language the site publishes. An item page SHALL be a complete page of the site, as "Page document structure" describes, with:
- the item's name as its only `<h1>` and as its title, with the site name as for pages;
- as its description for search engines and share previews: a project's summary, or a service's description, as plain text;
- as its share image: a project's cover, or else the site's default share image;
- a canonical link to its own address, and language alternates to the same item's page in the site's other published languages that have item pages for that collection;
- the menu marking its listing page as the current page;
- a link back to its listing page, named after it.

A **project page** SHALL show, in this order: the name, the category, the summary, the cover image (not lazy-loaded, sized for the full width), or in its place, when the project's video address is a YouTube or Vimeo video, the player of "Videos rendering" with the cover as its poster (not lazy-loaded) and the project's name as its title, not repeated under it; then the facts as a description list, the text, the photos with their captions as a gallery, and, when the video address is anywhere else, a link "Watch the video" ("Přehrát video") to it. A **service page** SHALL show the name, the price, and the page text, or the description when the page text is empty.

Item pages SHALL pass the site's HTML validation, and their headings SHALL follow "Heading hierarchy".

#### Scenario: Project page
- **WHEN** the project "Poslední závod" with the category "Film & TV", the facts "Director: Tomáš Hodan" and "DOP: Jan Baset Střítežský", nine photos and a Vimeo address is rendered under the listing page "Work"
- **THEN** `/work/posledni-zavod/` has the `<h1>` "Poslední závod", a `<dl>` with the two facts, nine images in a gallery, the Vimeo video as a click-to-play player, a link back to "Work", and the menu item "Work" marked as the current page

#### Scenario: Service page with a scope list
- **WHEN** the service "Pracovní právo" has a page text with a paragraph and a list of six points, and the services' listing page is "Specializace"
- **THEN** `/specializace/pracovni-pravo/` shows the paragraph and a `<ul>` of six items, and its description for search engines is the service's description

#### Scenario: Alternates between languages
- **WHEN** the project "Poslední závod" has the Czech address `posledni-zavod` under "Práce" and the English address `the-last-race` under "Work", and both languages are published
- **THEN** each page names the other as its alternate, with its own language

#### Scenario: Language without a listing page
- **WHEN** the Czech document has a projects listing page and the English one doesn't
- **THEN** the projects have Czech pages only, and the Czech pages have no English alternate

### Requirement: Links to item pages from cards
When the services have a listing page, every service card in a `services` block SHALL link to the service's page through its name, in each of the block's layouts. In the accordion layout the link SHALL follow the description inside the opened row ("Více o službě", "More about this service"), since the summary opens the row. Without a listing page, services SHALL render as before.

#### Scenario: Card links to its page
- **WHEN** the services have the listing page "Služby" and a services block in the `cards` layout shows "Kváskový chléb" with the address `kvaskovy-chleb`
- **THEN** the card's name is a link to `/sluzby/kvaskovy-chleb/`

#### Scenario: Unchanged without pages
- **WHEN** the services have no listing page
- **THEN** the services block renders exactly as before format 10

### Requirement: Cards rendering
A `cards` block SHALL render as a `<section>` with its optional heading and a `<ul>` of cards. Each card SHALL be an `<li>` with its image, its title as a heading one level below the block's (an `<h3>` under a heading, else an `<h2>`), and its text. The columns SHALL follow the number of cards: one column on narrow screens, and on wide ones as many as key figures use for that number.

In the `below` look the image SHALL come first, then the title and the text. In the `over` look the title SHALL sit over the bottom of the image on a shade made from the theme's text colour, in the theme's background colour, and the text under the image. A card without an image SHALL show its title on the theme's secondary colour.

A card with a link SHALL have one link, on its title, whose clickable area covers the whole card; the link SHALL lead to the page, to the service's or project's page, or to the address. A card whose link leads nowhere (see "Cards" in the site-document capability) SHALL render without a link. Images SHALL be lazy-loaded and sized for their column. The block SHALL pass the site's HTML validation.

#### Scenario: Category tiles
- **WHEN** a cards block with the heading "Projekty" in the `over` look shows four cards with images and links to the category pages
- **THEN** the block has an `<h2>` and four `<li>` elements, each with an `<h3>` holding a link to its page, and the image before the title

#### Scenario: Awards under photos
- **WHEN** a cards block without a heading in the `below` look shows seven cards with images, titles and texts, and no links
- **THEN** each card has its image, an `<h2>` title and its text, and no link

#### Scenario: Link that leads nowhere
- **WHEN** a card links to a project and the projects have no listing page
- **THEN** the card renders its title without a link

### Requirement: Videos rendering
A `videos` block SHALL render as a `<section>` with its optional heading and a `<ul>` of videos in columns by their number (one fills the width). Each video SHALL be a `<figure>` holding a play link and, under it, its title, its caption when it has one, and a note saying where the video plays from ("Plays from YouTube", "Přehraje se z YouTube").

The play link SHALL point to the video's page on YouTube or Vimeo, be named "Play: <title>" in the site's language, and show the poster image (lazy-loaded, 16:9, sized for its column) or, without one, the theme's secondary colour, with a play symbol in the theme's colours. Before the visitor activates it, the page SHALL make no request to YouTube, Vimeo or their content networks.

When the visitor activates the play link and the video script runs, the figure SHALL replace the link with the provider's player in an `<iframe>` titled with the video's title: `https://www.youtube-nocookie.com/embed/<id>?autoplay=1` or `https://player.vimeo.com/video/<id>?dnt=1&autoplay=1`, allowed to play full screen. Without the script, activating the link SHALL open the video on the provider's site.

#### Scenario: A film before play
- **WHEN** a page shows a videos block with the YouTube video `wNdrFte2T4w` titled "Medvídku, vypravuj!" and a poster
- **THEN** the page has a link to `https://www.youtube.com/watch?v=wNdrFte2T4w` named "Přehrát: Medvídku, vypravuj!" holding the poster, the title "Medvídku, vypravuj!" under it, no `<iframe>`, and no address of YouTube in any `src` or `srcset`

#### Scenario: Press play
- **WHEN** the visitor activates that link in a browser
- **THEN** the link is replaced by an `<iframe>` titled "Medvídku, vypravuj!" loading `https://www.youtube-nocookie.com/embed/wNdrFte2T4w?autoplay=1`

#### Scenario: Several videos
- **WHEN** a videos block shows three videos
- **THEN** they render in three columns on wide screens, each with its own play link

### Requirement: Hero slideshow rendering
A hero in the `slideshow` look with at least two slides SHALL render as a `<section class="block hero hero-slideshow">` holding:
- a region labelled with the hero's heading and described as a carousel (`aria-roledescription="carousel"`), with a list of slides, each a group described as a slide and named "<n> of <count>" in the site's language ("2 z 5", "2 of 5");
- in each slide, its image covering the slide (the first not lazy-loaded and sized for the full width, the others lazy-loaded) and its title over it on a shade from the theme's text colour, the title being the slide's link when it has one, with the link's clickable area covering the slide;
- after the region, the hero's heading as the page's `<h1>`, its text and its button, as in the `beside` look without its image.

A slide with a clip SHALL hold, over its image, a muted `<video>` hidden from assistive technology, invisible until it plays so the image shows meanwhile, with its address only in a data attribute, so nothing loads it before the script does.

Without the slideshow script, the slides SHALL sit in one row that can be scrolled or swiped one slide at a time, with photos only. With it, the script SHALL:
- show one slide at a time and add "Pause" / "Play", "Previous slide" and "Next slide" buttons and one button per slide, all named in the site's language;
- advance to the next slide every six seconds, after the last going back to the first;
- stop advancing while the pointer is over the slideshow or focus is inside it, and when the visitor pauses it;
- never advance by itself when the visitor's system asks for reduced motion, starting paused;
- make slides other than the current one inert, so keyboard focus and screen readers stay on the visible slide;
- play the current slide's clip (loading it then, from its address) and pause the others, unless the visitor asks for reduced motion or has data saver on, when the photos show and no clip loads; the slideshow then advances when the clip ends, or after six seconds when it has none or it fails to load, showing the photo.

A hero in the `slideshow` look with fewer than two slides SHALL render as the `cover` look (or `beside` without an image). The section SHALL pass the site's HTML validation.

#### Scenario: Six projects
- **WHEN** the home page's hero is a slideshow of six slides linking to project pages, with the heading "Such a happy company for your movies"
- **THEN** the page has one `<h1>` with that heading after the slides, six slides named "1 of 6" to "6 of 6", each title a link to its project's page, only the first image without lazy loading, and loads `assets/slideshow.js`

#### Scenario: Clips load only when shown
- **WHEN** a slideshow of three slides with clips opens
- **THEN** only the first slide's clip is requested, it plays muted, and the second's is requested when the second slide shows

#### Scenario: Reduced motion
- **WHEN** a visitor whose system asks for reduced motion opens that page
- **THEN** the slideshow shows the first slide's photo, paused, requests no clip, and moves only when the visitor uses its controls

#### Scenario: Pause on focus
- **WHEN** the visitor moves keyboard focus to the second slide's link
- **THEN** the slideshow stops advancing until focus leaves it

#### Scenario: One slide left
- **WHEN** a hero in the `slideshow` look has one slide and an image of its own
- **THEN** it renders as the `cover` look, and the page loads no slideshow script

### Requirement: Menu script
Every page of a site whose menu has a group with links SHALL load `assets/menu.js` with `defer`, and pages of other sites SHALL NOT. The script SHALL close an open group when the visitor presses Escape (returning focus to the group's summary), clicks outside it, or moves focus out of it. The menu SHALL work without the script.

#### Scenario: Escape closes the group
- **WHEN** a visitor opens "Projekty" and presses Escape
- **THEN** the group closes and focus is on its summary

#### Scenario: Click outside
- **WHEN** a visitor opens "Projekty" and clicks the page's content
- **THEN** the group closes

#### Scenario: No groups, no script
- **WHEN** a site's menu has only links
- **THEN** its pages have no `menu.js` script tag, and the export has no `assets/menu.js`

### Requirement: Jobs rendering
A `jobs` block SHALL render as a `<section>` with its heading (when present) and a `<ul>` of jobs. Each job SHALL be an `<li>` with its title as a heading one level below the block's heading (`<h3>` under a heading, `<h2>` without one), its summary as a paragraph when present, its description when present inside a `<details>` element whose `<summary>` reads "Full description" in the site's language (closed at first, opening without JavaScript, subheadings one level below the job's title), and its contact when present as a paragraph starting with "Contact" in the site's language: the name, the email as a `mailto:` link and the phone as a `tel:` link, formatted as the business details' phone is. A block without jobs SHALL render its note in place of the list, and SHALL NOT render when the note is empty too.

#### Scenario: A full job ad
- **WHEN** a Czech site's jobs block "Volné pozice" holds "Zámečník/svářeč" with a summary, a description and the contact "Matěj Palouš", `+420777294579`
- **THEN** the job is an `<h3>` "Zámečník/svářeč", then its summary, then a closed `<details>` with the summary "Celý popis" holding the description with `<h4>` subheadings, then "Kontakt: Matěj Palouš, <a href="tel:+420777294579">+420 777 294 579</a>"

#### Scenario: Titles only
- **WHEN** Mareš Partners' jobs block holds "Advokátní koncipient/ka" and "Advokát/ka" with nothing else
- **THEN** each job is only its title, with no `<details>` and no contact line

#### Scenario: No openings
- **WHEN** a jobs block has no jobs and the note "Momentálně nikoho nehledáme."
- **THEN** the section shows its heading and the note, and no list

### Requirement: Hidden blocks
A hidden block (see "Hidden blocks" in the site-document capability) SHALL render nothing: no element, no heading and no images. A page SHALL load a script a block needs (such as the slideshow script) only when a block that needs it isn't hidden. Rendering a hidden block's page SHALL otherwise be as if the block weren't there.

#### Scenario: Hidden testimonials on the home page
- **WHEN** the home page's testimonials block is hidden
- **THEN** the home page has no testimonials section, and the other blocks render as before

#### Scenario: Hidden slideshow
- **WHEN** a page's only slideshow hero is hidden
- **THEN** the page doesn't load the slideshow script
