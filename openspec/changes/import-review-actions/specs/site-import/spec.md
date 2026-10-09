# Spec Delta

## MODIFIED Requirements

### Requirement: Import review
A project made by an import SHALL have an import review showing:
- what was imported, with counts: pages (each with its old address and its new one), images,
  questions, social profiles, and the business details found;
- what was left out, page by page, and why: forms, embeds, hidden emails, images that couldn't be
  imported, pages disallowed, built by JavaScript, unreachable or over the limit, and languages not
  imported; with "Try again" for what a retry can import (see "Retrying what was left out");
- the saved site's validation problems, each leading to where it is fixed, as on the Overview;
  the same problem on several pages or images is one item listing each under it, and pages
  without a description are one item leading to the site's description, which fixes them all;
  with no errors, the review says that nothing blocks publishing;
  with "Mark these images as decorative" while imported images lack a description (see "Marking
  imported images decorative"), and "Fix the subheading levels" while a page has a smaller
  subheading before any main one (see "Fixing subheading levels").

The review SHALL link to the editor and to the panel's sections. The owner SHALL be able to
dismiss it; until then the Overview links to it. The import SHALL never publish, and neither
SHALL a retry, marking images decorative or fixing subheading levels.

#### Scenario: Review after the import
- **WHEN** the bakery's import imported 6 pages and 24 images and left out a form and a hidden email
- **THEN** the review shows the 6 pages with their old and new addresses, 24 images, and the form
  and the email as left out, and lists the images without a description as problems

#### Scenario: Dismissed
- **WHEN** the owner dismisses the review
- **THEN** the Overview no longer links to it

#### Scenario: Nothing to retry
- **WHEN** the only things left out are a form and a page built by JavaScript
- **THEN** the review offers no "Try again"

## ADDED Requirements

### Requirement: Retrying what was left out
While the review hasn't been dismissed, the owner SHALL be able to retry, with the same rules and
limits as the import:
- **"Try again"** for the pages that didn't answer and the images that couldn't be imported;
- **"Import the next pages"** while pages were over the limit: the next pages, up to 20, from the
  old site's menu and sitemap, in the import's order.

Forms, embeds, hidden emails, pages disallowed or built by JavaScript, pages that aren't web
pages, and other languages SHALL offer no retry. A retry SHALL run in the background with its
progress shown on the review, one at a time per project, and SHALL be refused while an import or
another retry of the project runs. When it ends, the review SHALL show what it added, and what it
left out SHALL replace what the retry tried: what arrived leaves the "left out" list, what failed
again stays with its reason. A retry that fails as a whole SHALL change nothing in the project.

#### Scenario: A page that timed out
- **WHEN** the page `/cenik/` didn't answer during the import, the owner chooses "Try again", and
  it answers now
- **THEN** the project has the page "Ceník" with its old address `/cenik/`, and the review no
  longer lists `/cenik/` as left out

#### Scenario: Still failing
- **WHEN** a retried image still answers 404
- **THEN** the review lists it as left out again, as not found, and the project is unchanged

#### Scenario: The next pages
- **WHEN** an import read 20 pages and left 31 over the limit, and the owner chooses "Import the
  next pages"
- **THEN** 20 more pages are added, and the review says 11 pages are over the limit and offers
  "Import the next pages" again

#### Scenario: Retry refused while running
- **WHEN** a retry of the project is running and the owner chooses "Try again" again
- **THEN** nothing starts, with a message that a retry is running

### Requirement: Retries and the owner's edits
A retry SHALL add to the project's saved documents without changing what the owner made:
- a page added by a retry SHALL go at the end of the page list with a slug unique in the project,
  record its old address, and join the end of the menu when the old site's menu linked it;
- an image that arrives for a page the owner hasn't changed since the import SHALL be placed where
  the page shows it, by reading that page again;
- an image that arrives for a page the owner has changed since the import, or that the page no
  longer shows, SHALL be added to the media library only, and the review SHALL say so.

A page counts as changed when its blocks or their contents differ from the version the import
saved. A retry SHALL save one new version, as the import's owner, and SHALL refuse to save when the
saved document changed while it ran (the owner saved meanwhile), with a message to try again.

#### Scenario: Image for an untouched page
- **WHEN** a gallery photo on "Z pekárny" failed during the import and arrives on retry, and the
  owner hasn't edited that page
- **THEN** the gallery shows the photo where the old site did

#### Scenario: Image for an edited page
- **WHEN** the same photo arrives but the owner has rewritten that page's text
- **THEN** the page is unchanged, the photo is in the media library, and the review says it was
  added there for the owner to place

#### Scenario: Slug taken by the owner's page
- **WHEN** a retried page `/kontakt/` arrives and the owner has meanwhile added a page with slug
  `kontakt`
- **THEN** the new page gets the slug `kontakt-2`

### Requirement: Marking imported images decorative
While images imported into the project lack a description, "Before you publish" SHALL offer
"Mark these images as decorative", naming how many there are and saying that screen readers skip
decorative images, so images that carry information should be described instead. Choosing it SHALL
mark every imported image without a description as decorative, in every page and in the site's
logo, favicon and collections, as one new saved version, so version history can undo it. Images
the owner added after the import SHALL NOT be marked. Each problem SHALL still lead to its image,
for describing it instead.

#### Scenario: Two undescribed images
- **WHEN** the review lists two "needs a description" errors for imported images and the owner
  marks them decorative
- **THEN** both images are decorative, those two errors are gone, and the site has one new version

#### Scenario: The owner's own image
- **WHEN** the owner added an image without a description after the import, and marks the imported
  images decorative
- **THEN** the owner's image keeps its "needs a description" error

### Requirement: Fixing subheading levels
While a page of the project has a smaller subheading before any main subheading, "Before you
publish" SHALL offer "Fix the subheading levels", naming how many pages it fixes. Choosing it SHALL
make the first such subheading on each page a main subheading, leaving the others' levels, as one
new saved version. The import SHALL itself keep the heading of a block it leaves out for lack of
images (a gallery or a row of logos whose images didn't arrive) as a main subheading, so the
subheadings after it keep one before them.

#### Scenario: A smaller subheading first
- **WHEN** the page "Rakousko" starts with the smaller subheading "Vídeň" followed by "Graz", and
  the owner chooses "Fix the subheading levels"
- **THEN** "Vídeň" is a main subheading, "Graz" stays smaller, the problem is gone, and the site has
  one new version

#### Scenario: A gallery without its photos
- **WHEN** the gallery "Realizace" on an imported page gets none of its photos, and the subheading
  "Vídeň" follows it
- **THEN** the page has "Realizace" as a main subheading before "Vídeň", and no subheading problem

#### Scenario: Thirteen pages without a description
- **WHEN** an imported site has no description and none of its 13 pages has one
- **THEN** "Before you publish" shows one item, "13 pages have no description … add one description
  of the whole site", leading to the site's description, with each page listed under it, and says
  nothing blocks publishing
