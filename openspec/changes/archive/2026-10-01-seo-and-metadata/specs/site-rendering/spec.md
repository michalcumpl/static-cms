# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Image files used by a document`
- TO: `### Requirement: Media files used by a document`

## MODIFIED Requirements

### Requirement: Page document structure
Each page SHALL render as a complete HTML5 document. Its head SHALL have:
- `<!doctype html>` and `<html lang>` set from the site language;
- a UTF-8 charset declaration and a responsive viewport meta tag;
- a `<title>` combining the page title and site name;
- a meta description when the page or the site has a description (the page's own when it has one, otherwise the site's);
- a link to the site stylesheet.

The body SHALL contain:
- a `<header>` with the site name, linking to the home page, and navigation in a `<nav>`;
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
- **For every image in the site's pages** (blocks), its variant file names.
- **For the site's favicon**, its icon files `<media key>-icon-32.png`, `<media key>-icon-180.png` and `<media key>-icon-512.png`.
- **For the site's default share image and each page's own share image**, its share file `<media key>-share.jpg`.

Favicons and share images SHALL NOT add variant files. The list SHALL be exactly the media files export needs.

#### Scenario: Files of the demo site
- **WHEN** listing the media files of a site whose only image has media key `hero.png` and width 320
- **THEN** the list is `hero.png-320.webp`

#### Scenario: Favicon and share image
- **WHEN** a site has favicon `logo-1a2b` and default share image `pult-3f9a`, and no other images
- **THEN** the list is `logo-1a2b-icon-180.png`, `logo-1a2b-icon-32.png`, `logo-1a2b-icon-512.png` and `pult-3f9a-share.jpg`

## ADDED Requirements

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
When rendering is given the site's address, the home page SHALL contain one `<script type="application/ld+json">` with a schema.org `WebSite` and an `Organization`:
- **`WebSite`** has the site name, the site's address with a trailing slash, the site language, and the site description when there is one.
- **`Organization`** has the site name and address; when the site has a favicon, it also has `icon-512.png`'s absolute URL as its logo.

The JSON SHALL be escaped so that no text in it can end the script element. Other pages, and every page rendered without the site's address, SHALL have no structured data.

#### Scenario: Home page structured data
- **WHEN** rendering the home page of site "Anideti" in language `cs` with site address `https://anideti.cz`
- **THEN** it contains JSON-LD with a `WebSite` named "Anideti", URL `https://anideti.cz/` and language `cs`, and an `Organization` named "Anideti"

#### Scenario: Script-ending text in the name
- **WHEN** the site name contains `</script>`
- **THEN** the JSON-LD contains no literal `</script>` before its own closing tag

#### Scenario: Other pages
- **WHEN** rendering the page "Kontakt" with a site address
- **THEN** it has no structured data

### Requirement: Page not found
Rendering SHALL produce a "page not found" page in addition to the site's pages. It SHALL have:
- the site's header, navigation and footer;
- an `h1` and a short message in the site's language, with a link to the home page;
- the `<title>` of the `h1` and the site name;
- no canonical link, no share metadata and no structured data.

Czech (`cs`) and English SHALL have their own wording, and any other language SHALL use English. All its links SHALL be absolute paths from the base path, so that it works at any address.

#### Scenario: Czech site
- **WHEN** rendering the not-found page of site "Anideti" in language `cs`
- **THEN** its `h1` is "Stránka nenalezena", its `<title>` is `Stránka nenalezena – Anideti`, and it links to the home page

#### Scenario: Other language
- **WHEN** rendering the not-found page of a site in language `de`
- **THEN** its `h1` is "Page not found"
