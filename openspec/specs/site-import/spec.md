# site-import Specification

## Purpose

Lets an owner start a website from their current public website: its pages, menu, texts, photos
and business details are read into a new project as a draft to review, never its design or
anything they may not use.

## Requirements

### Requirement: Starting an import
A workspace owner SHALL be able to start an import from the "New website" page by giving the
address of a public website and confirming that they may use its content. An address without a
scheme SHALL be read as `https://`. The import SHALL be refused, with a message saying why, when
the confirmation is missing, the address isn't an `http` or `https` address of a domain name or
public IP address, or the owner already has an import running. Starting an import SHALL show its
progress (see "Import progress").

#### Scenario: Start from the bakery's site
- **WHEN** an owner enters `pekarna-ulipy.cz`, confirms they may use its content and starts
- **THEN** an import of `https://pekarna-ulipy.cz/` starts and its progress is shown

#### Scenario: No confirmation
- **WHEN** an owner enters an address without confirming
- **THEN** nothing starts and the owner is asked to confirm

#### Scenario: Not a web address
- **WHEN** an owner enters `ftp://pekarna-ulipy.cz` or `http://192.168.1.10/`
- **THEN** nothing starts, with a message that only public web addresses can be imported

### Requirement: Safe fetching
The import SHALL fetch only `http` and `https` addresses on ports 80 and 443. It SHALL refuse to
connect to loopback, private, link-local, multicast and reserved addresses, checking the address
each host name resolves to on every connection, redirects included, and SHALL follow at most 5
redirects per request. It SHALL fetch pages only from the site's host and its `www.` twin, and
images from any public host. It SHALL NOT fetch pages that the site's `robots.txt` disallows for
all user agents. Each response SHALL be limited to 5 MB for a page and 20 MB for an image, each
request to 15 seconds, and the whole import to 5 minutes; a response over its limit SHALL be
abandoned. Requests SHALL carry the headers of a current desktop browser, accept compressed
responses, and ask for the site's content in any language.

#### Scenario: Redirect to an internal address
- **WHEN** a page of the site redirects to `http://169.254.169.254/latest/meta-data/`
- **THEN** that address isn't fetched and the page is reported as left out

#### Scenario: Host name resolving to a private address
- **WHEN** an owner imports `http://intranet.example.cz/`, whose name resolves to `10.0.0.5`
- **THEN** the import fails with a message that the address can't be imported, and no project is
  made

#### Scenario: Disallowed by robots.txt
- **WHEN** `robots.txt` says `Disallow: /admin/` for `User-agent: *` and the menu links `/admin/`
- **THEN** `/admin/` isn't fetched and the review lists it as left out

#### Scenario: Another site's page
- **WHEN** the menu links `https://facebook.com/pekarna`
- **THEN** that page isn't imported as a page; it is read as a social profile

### Requirement: Pages read
The import SHALL read the page at the given address as the home page, then the pages its
navigation links to in menu order, then the pages listed in the site's `sitemap.xml`, until it
has 20 pages. Addresses differing only in a trailing slash, `index.html` or `#fragment` SHALL be
one page. Only HTML responses SHALL be pages. A page whose content area has almost no text while
the page loads scripts SHALL be treated as built by JavaScript: it is left out and reported, and
when it is the home page the import SHALL fail with a message that the site builds its pages in
the browser and can't be read yet.

#### Scenario: Menu first, then the sitemap
- **WHEN** the home page's menu links three pages and `sitemap.xml` lists 30 more
- **THEN** the import reads the home page, the three menu pages, and the first 16 sitemap pages
  that aren't among them, and the review says 14 pages were over the limit

#### Scenario: Built in the browser
- **WHEN** the home page's HTML is an empty `<div id="app">` and a script
- **THEN** the import fails with the message that the site builds its pages in the browser, and no
  project is made

### Requirement: Pages and menu
Each page read SHALL become a page of the new site:
- titled by its first `<h1>`, or else its `<title>` without the site's name; the home page titled
  with the Home layout's name in the site's language ("Úvod", "Home");
- with a slug made from the last segment of its address (the home page's from its title), made
  unique within the site, the home page served at the root;
- in the menu when the source's navigation links it, in the navigation's order; links nested one
  level under a label SHALL become a menu group;
- recording its address on the old site (see "Redirects from earlier addresses" in the publishing
  capability).

The site's name SHALL be the business name from the site's structured data, or else the `<title>`
of the home page without its tagline.

#### Scenario: Bakery pages
- **WHEN** the source's menu links `/`, `/nase-pecivo/` and `/kontakt.html`
- **THEN** the new site has pages with slugs `uvod` (home), `nase-pecivo` and `kontakt`, in that
  menu order

#### Scenario: Grouped menu
- **WHEN** the source's menu has "Projekty" with the nested links "Eventy" and "Výstavy"
- **THEN** the new site's menu has the group "Projekty" with those two pages

### Requirement: Page content
The import SHALL read a page's content area: its `<main>`, or else its body without the header,
navigation, footer, scripts, forms and hidden elements. In document order:
- paragraphs, headings and lists SHALL become text blocks, a new block starting at each main
  heading; headings SHALL become subheadings at level 2 and 3, the first on a page at level 2 and
  none skipping a level; bold, italic and links SHALL be kept, a link to an imported page becoming
  a link to that page;
- an image next to text SHALL become a text with image block; three or more images in a row
  without text between them SHALL become a gallery, with their captions; a row of linked logos
  SHALL become a logos block;
- a YouTube or Vimeo embed SHALL become a videos block;
- `<details>` elements, and questions in FAQPage structured data, SHALL become questions of the
  site's FAQ collection, shown by a questions block at that place;
- other embeds, forms and widgets SHALL be left out and reported.

The home page SHALL start with a hero, as the Home layout does: the site's name, its description,
and the largest photo of the home page's top. Every page SHALL be valid as far as the import can
make it; what the owner must still do (such as describing images) SHALL be validation problems
shown in the review. The site SHALL use the Standard template.

#### Scenario: A text page
- **WHEN** a page has `<h2>Naše pecivo</h2>`, two paragraphs, `<h4>Chléb</h4>` and a list
- **THEN** the page has one text block with the subheading "Naše pecivo" at level 2, the
  paragraphs, the subheading "Chléb" at level 3, and the list

#### Scenario: Questions
- **WHEN** a page has three `<details>` elements, each with a `<summary>` question and an answer
- **THEN** the site's FAQ collection has the three questions and the page shows them in a questions
  block where they were

#### Scenario: A contact form
- **WHEN** the contact page has a form
- **THEN** the form isn't imported and the review lists it as left out on that page

### Requirement: Business details
The import SHALL fill the business and its main location from, in this order: schema.org
`LocalBusiness` (or a subtype) structured data, then `tel:` and `mailto:` links, then the home
and contact pages' text. Phones SHALL be stored in international form without spaces, with `+420`
when the number has no country code and the site is Czech. Percent-encoded email addresses SHALL
be decoded; addresses hidden by an anti-spam script SHALL be left out and reported. Opening hours
SHALL be imported from structured data only. Links to Facebook, Instagram, LinkedIn, YouTube and
other profiles the site document recognises SHALL become the business's social profiles.

#### Scenario: Structured data
- **WHEN** the home page has LocalBusiness data with the name "Pekárna U Lípy", the phone
  `321 123 456`, the street "Lipová 12", Kutná Hora, and hours Monday to Friday 6:00–18:00
- **THEN** the business is named "Pekárna U Lípy" and its main location has the phone
  `+420321123456`, that address, and those hours

#### Scenario: Hidden email
- **WHEN** the only email on the site reads "[email protected]" from an anti-spam script
- **THEN** the location has no email and the review says the email was hidden and must be entered

### Requirement: Images
The import SHALL fetch the images its pages show, read from `src`, `srcset`, lazy-loading
attributes (`data-src`, `data-lazy-src`, `data-srcset`) and CSS `background-image` of the page's
styles, choosing the largest size offered up to 1600 pixels wide. It SHALL add each to the new
project's media library, as an upload of JPEG, PNG or WebP would be, keeping its alt text; an
image used several times SHALL be added once. An image without alt text SHALL stay without one,
for the owner to describe. The site's logo (from structured data, or an image in the header
linking home) and favicon (an icon link or the touch icon) SHALL be the site's logo and favicon;
an SVG logo or favicon SHALL be turned into a PNG. Images that can't be fetched or aren't JPEG,
PNG, WebP or a logo's SVG SHALL be left out and reported. At most 100 images SHALL be imported.

#### Scenario: Lazy image
- **WHEN** a page has `<img src="" data-src="/foto/chleb.jpg" alt="Chléb">`
- **THEN** the page shows that photo from the library, described "Chléb"

#### Scenario: One photo on two pages
- **WHEN** the same photo appears on the home and the contact page
- **THEN** the library has it once and both pages use it

#### Scenario: SVG logo
- **WHEN** the header's home link holds an SVG logo
- **THEN** the site's logo is a PNG made from it

### Requirement: Guessed design
The import SHALL give the site a theme from the source's styles: the most used text and
background colours and a distinct accent colour as the primary, the headings' and text's fonts
mapped to the nearest fonts of the catalogue (serif or sans, by family name and generic family),
and the theme's other values from the first preset. Colours SHALL be darkened or lightened until
the theme passes the contrast checks. The design is a starting point; the template is never
taken from the source.

#### Scenario: Unknown brand font
- **WHEN** the source's headings use "Playfair Display" and its text "Brandon Grotesque, sans-serif"
- **THEN** the theme's heading font is Playfair Display and its body font a catalogue sans-serif font

#### Scenario: Low-contrast brand colour
- **WHEN** the source's accent is `#fe3500` on white
- **THEN** the theme's primary colour is a darker shade that passes the contrast check

### Requirement: Language
The new project's primary language SHALL be the source's language (its `lang` attribute) when
the admin offers it, or else the owner's interface language. Only that language SHALL be
imported; other languages the site links to (such as through a language switcher) SHALL be named
in the review.

#### Scenario: Czech site with English pages
- **WHEN** the source is in Czech and its language switcher links an English version
- **THEN** the project is in Czech only and the review says the English version wasn't imported

### Requirement: Import progress
While an import runs, its page SHALL show what it is doing ("Reading pages: 12 of 20", "Fetching
images: 30 of 41", "Building the site") and update without reloading. An import SHALL end in one
of two ways: done, with a new project in the workspace named after the site, whose page then
opens the import review; or failed, with a message saying why, and no project, version or image
left behind. An import running when the server stops SHALL be failed when it starts again. The
owner SHALL be able to leave the page and come back to it.

#### Scenario: Done
- **WHEN** the import of the bakery's site finishes
- **THEN** the workspace has the project "Pekárna U Lípy" and the owner sees its import review

#### Scenario: Site down
- **WHEN** the address doesn't answer within 15 seconds
- **THEN** the import fails with a message that the website didn't answer, and the workspace has no
  new project

### Requirement: Import review
A project made by an import SHALL have an import review showing:
- what was imported, with counts: pages (each with its old address and its new one), images,
  questions, social profiles, and the business details found;
- what was left out, page by page, and why: forms, embeds, hidden emails, images that couldn't be
  imported, pages disallowed, built by JavaScript, unreachable or over the limit, and languages not
  imported;
- the saved site's validation problems, each leading to where it is fixed, as on the Overview.

The review SHALL link to the editor and to the panel's sections. The owner SHALL be able to
dismiss it; until then the Overview links to it. The import SHALL never publish.

#### Scenario: Review after the import
- **WHEN** the bakery's import imported 6 pages and 24 images and left out a form and a hidden email
- **THEN** the review shows the 6 pages with their old and new addresses, 24 images, and the form
  and the email as left out, and lists the images without a description as problems

#### Scenario: Dismissed
- **WHEN** the owner dismisses the review
- **THEN** the Overview no longer links to it

### Requirement: Admin command
An admin command on the server SHALL import a site by its address into a given workspace, with
the same rules and limits, printing the progress, the review's counts and what was left out, and
the new project's address.

#### Scenario: Import an example locally
- **WHEN** the command imports `https://www.anideti.cz/` into a workspace
- **THEN** it prints the pages and images imported and what was left out, and the project's
  address in the admin
