# Spec Delta

## MODIFIED Requirements

### Requirement: Images
The import SHALL fetch the images its pages show, read from `src`, `srcset`, lazy-loading
attributes (`data-src`, `data-lazy-src`, `data-srcset`) and CSS `background-image` of the page's
styles, choosing the largest size offered up to 1600 pixels wide. It SHALL add each to the new
project's media library, as an upload of JPEG, PNG or WebP would be, keeping its alt text; an
image used several times SHALL be added once. An image without alt text SHALL stay without one,
for the owner to describe. The site's logo (from structured data, or an image in the header
linking home) and favicon (an icon link or the touch icon) SHALL be the site's logo and favicon;
an SVG logo or favicon SHALL be turned into a PNG. The switch "show the site name in the header"
SHALL be off when the old home page's header shows its logo (an image, or one drawn by CSS) without
the site's name as visible text beside it, in the logo's link or element; text hidden from sight
(for screen readers) SHALL NOT count. It SHALL stay on when the header shows the name as text
beside the logo, and when the site has no logo or the header shows none. Images that can't be fetched or aren't JPEG,
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

#### Scenario: A logo that is the name
- **WHEN** the header's home link holds only the logo image
- **THEN** the site's logo is that image and the header doesn't show the name beside it

#### Scenario: A logo drawn by CSS
- **WHEN** the header's logo is a CSS background on `<h1 class="logo">` holding only
  `<strong class="offscreen">Mareš Partners</strong>`
- **THEN** the header shows the logo without the name beside it

#### Scenario: The name beside the logo
- **WHEN** the header's home link holds a small emblem and the text "Pekárna U Lípy"
- **THEN** the header shows the logo and the name
