# Spec Delta

## MODIFIED Requirements

### Requirement: Language
The new project's primary language SHALL be the source's language (its `lang` attribute) when
the admin offers it, or else the owner's interface language. Only that language SHALL be
imported; other languages the site links to (such as through a language switcher or `hreflang`
alternates) SHALL be named in the review. Each SHALL be named with its language: the `hreflang`
of a link to it, or else the `lang` attribute of the page it links to. A language the admin
offers that isn't the primary SHALL be offered for import from the review (see "Importing another
language"); others SHALL only be named.

#### Scenario: Czech site with English pages
- **WHEN** the source is in Czech and its language switcher links an English version
- **THEN** the project is in Czech only, and the review says the English version wasn't imported
  and offers "Import the English version"

#### Scenario: A language the admin doesn't offer
- **WHEN** the Czech source's language switcher also links a Hungarian version
- **THEN** the review says the Hungarian version wasn't imported, and offers no action for it

#### Scenario: Switcher without hreflang
- **WHEN** the switcher's link "EN" has no `hreflang` and leads to `/en/`, whose page has
  `lang="en-GB"`
- **THEN** the review names it as the English version

### Requirement: Import review
A project made by an import SHALL have an import review showing:
- what was imported, with counts: pages (each with its old address and its new one, and its
  language when the project has more than one imported), images, questions, social profiles, and
  the business details found;
- what was left out, page by page, and why: forms, embeds, hidden emails, images that couldn't be
  imported, pages disallowed, built by JavaScript, unreachable or over the limit, and languages not
  imported; with "Try again" for what a retry can import (see "Retrying what was left out"), and
  "Import the <language> version" for each language offered (see "Importing another language");
- the saved site's validation problems in every language of the project, each leading to where
  it is fixed in that language's editor or section, as on the Overview, and named by its language
  when the project has more than one; the same problem on several pages or images is one item
  listing each under it, and pages without a description are one item leading to the site's
  description, which fixes them all; with no errors, the review says that nothing blocks
  publishing;
  with "Mark these images as decorative" while imported images lack a description (see "Marking
  imported images decorative"), and "Fix the subheading levels" while a page has a smaller
  subheading before any main one (see "Fixing subheading levels").

The review SHALL link to the editor and to the panel's sections. The owner SHALL be able to
dismiss it; until then the Overview links to it. The import SHALL never publish, and neither
SHALL a retry, importing another language, marking images decorative or fixing subheading levels.

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

#### Scenario: Thirteen pages without a description
- **WHEN** an imported site has no description and none of its 13 pages has one
- **THEN** "Before you publish" shows one item, "13 pages have no description … add one description
  of the whole site", leading to the site's description, with each page listed under it, and says
  nothing blocks publishing

#### Scenario: A problem in the imported language
- **WHEN** the imported Czech version's home photo has no description
- **THEN** "Before you publish" lists "Čeština: An image on "Úvod" needs a description", leading to
  that image in the Czech editor

#### Scenario: Pages of two languages
- **WHEN** the owner imported the English version of the bakery's Czech site
- **THEN** the review lists the Czech pages and the English pages, each with its language, its old
  address and its new one

### Requirement: Retrying what was left out
While the review hasn't been dismissed, the owner SHALL be able to retry, with the same rules and
limits as the import:
- **"Try again"** for the primary language's pages that didn't answer and the images that couldn't
  be imported;
- **"Import the next pages"** while the primary language's pages were over the limit: the next
  pages, up to 20, from the old site's menu and sitemap, in the import's order.

Forms, embeds, hidden emails, pages disallowed or built by JavaScript, pages that aren't web
pages, and what importing another language left out SHALL offer no retry; other languages are
imported instead (see "Importing another language"). A retry SHALL run in the background with its
progress shown on the review, one at a time per project, and SHALL be refused while an import,
another retry or a language import of the project runs. When it ends, the review SHALL show what
it added, and what it left out SHALL replace what the retry tried: what arrived leaves the "left
out" list, what failed again stays with its reason. A retry that fails as a whole SHALL change
nothing in the project.

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

#### Scenario: English page that timed out
- **WHEN** importing the English version left `/en/pricing/` out as unreachable
- **THEN** the review lists it as left out, and "Try again" doesn't fetch it

### Requirement: Marking imported images decorative
While images imported into the project lack a description, "Before you publish" SHALL offer
"Mark these images as decorative", naming how many there are and saying that screen readers skip
decorative images, so images that carry information should be described instead. Choosing it SHALL
mark every imported image without a description as decorative, in every page and in the site's
logo, favicon and collections, as one new saved version of each language it changes, so version
history can undo it. Imported images SHALL be those the import and its retries placed, and those
a language import placed in its language. Images the owner added after the import SHALL NOT be
marked. Each problem SHALL still lead to its image, for describing it instead.

#### Scenario: Two undescribed images
- **WHEN** the review lists two "needs a description" errors for imported images and the owner
  marks them decorative
- **THEN** both images are decorative, those two errors are gone, and the site has one new version

#### Scenario: The owner's own image
- **WHEN** the owner added an image without a description after the import, and marks the imported
  images decorative
- **THEN** the owner's image keeps its "needs a description" error

#### Scenario: Images of an imported language
- **WHEN** the English home photo and the imported Czech version's home photo have no description,
  and the owner marks the imported images decorative
- **THEN** both are decorative, and English and Czech each have one new version

## ADDED Requirements

### Requirement: Importing another language
While the review hasn't been dismissed, it SHALL offer "Import the <language> version" for each
language offered (see "Language") that the project doesn't have. Choosing it SHALL import that
version, with the import's rules and limits, in the background with its progress shown on the
review, one at a time per project, and SHALL be refused while an import or a retry of the project
runs, or when the project has that language already. It SHALL:
- read the version's home page (its address from the old site's links), then the pages its
  navigation links to, then the pages of the site's `sitemap.xml` in that language, up to 20
  pages; pages in another language SHALL NOT be read;
- add the language to the project, hidden, as one new document saved as its first version; its
  shared fields SHALL be the primary's (see "Shared fields" in the languages capability), so the
  theme, logo, business data and the collections' structure are not imported again;
- make each page read a page of the language as the import makes pages (see "Pages and menu" and
  "Page content"), with a slug unique in the language and its old address recorded;
- pair each page with its counterpart among the primary's pages imported from the old site, giving
  it that page's translation key, when the old site pairs them: the home pages always, others
  through an `hreflang` alternate or a language switcher link of either page leading to the other;
  a page without a counterpart SHALL get a translation key of its own, and the primary's pages
  without a counterpart SHALL NOT be part of the new language;
- give the language the version's own menu, and the site name, description and business name its
  home page gives, keeping the primary's where it gives none;
- on a page paired with a primary page, make the questions of its N-th question block the texts of
  the items the counterpart's N-th question block shows, in order, when there are as many; other
  questions SHALL become text, since the questions that exist are shared with the primary;
- reuse the images the project already has from the same addresses, and fetch the others, each
  described by the version's own text;
- never publish.

When it ends, the review SHALL list the language's pages and what it left out, no longer offer the
language, and name nothing for it as "not imported". When it fails as a whole, the project SHALL be
unchanged and the review SHALL keep offering the language.

#### Scenario: Import the English version
- **WHEN** the Czech bakery's switcher links `/en/`, whose menu links "Home", "Our bread" and
  "Contact", each an `hreflang` alternate of "Úvod", "Naše pečivo" and "Kontakt", and the owner
  chooses "Import the English version"
- **THEN** the project has English, hidden, with the pages "Home", "Our bread" and "Contact" in
  that menu order, paired with "Úvod", "Naše pečivo" and "Kontakt", and the published Czech
  "Kontakt" has an English alternate once English is published

#### Scenario: A page only in English
- **WHEN** the English version also has "Wholesale", which no Czech page pairs with
- **THEN** English has the page "Wholesale" with a translation key of its own, and the Czech site
  has no counterpart of it

#### Scenario: A page only in Czech
- **WHEN** the Czech "Ceník" has no English counterpart on the old site
- **THEN** English has no copy of "Ceník", and the Languages page lists it as missing in English

#### Scenario: Shared details stay the primary's
- **WHEN** the English home page shows a different phone number than the Czech one
- **THEN** the English site shows the Czech phone number, and the business name is the English
  version's

#### Scenario: Translated questions
- **WHEN** the Czech "Kontakt" has a question block with 3 questions and the English "Contact" has
  one with 3 questions
- **THEN** the English "Contact" shows the same 3 items with the English questions and answers, and
  the Czech site still shows them in Czech

#### Scenario: Questions that don't match
- **WHEN** the English "Contact" has 4 questions and the Czech "Kontakt" 3
- **THEN** the English page shows the 4 questions and answers as text, and the FAQ items are
  unchanged

#### Scenario: Old English address redirected
- **WHEN** the English "Contact" came from `/en/contact.html` and English is published
- **THEN** `/en/contact.html` redirects to the English "Contact" page

#### Scenario: Language added by hand meanwhile
- **WHEN** the owner added English from the Languages page before choosing "Import the English
  version"
- **THEN** the review no longer offers it, and choosing it from a stale page is refused with a
  message that the project already has English

#### Scenario: Refused while a retry runs
- **WHEN** "Import the next pages" is running and the owner chooses "Import the English version"
- **THEN** nothing starts, with a message that a retry is running
