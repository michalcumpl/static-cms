# Spec Delta

## MODIFIED Requirements

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
- three or more sibling elements repeating the same structure, each with one image and a title (a
  heading, or a link's words) and at most a short text, SHALL become a cards block, at most 12
  cards a block; a card SHALL link to the imported page or the outside address its source linked
  to, and to nothing when it linked to a page of the old site that wasn't imported;
- two to six sibling elements each made of a short value starting with a number and a label SHALL
  become a key figures block;
- under a heading, an ordered list whose items each start with a bold title, or two or more
  headings numbered 1, 2, 3 in order, SHALL become a steps block with that heading, each step's
  title and text;
- a table or list naming three or more days of the week with times SHALL become an opening hours
  block when the business's hours were imported; otherwise it SHALL stay text;
- a Google Maps or Mapy.cz embed SHALL become a contact block with the main location's address and
  its "Show on map" link; when the location has no address and no map link, the place the embed
  names SHALL become its map link;
- an embed of, or a link button to, a booking service the import knows SHALL become a call to
  action leading to that service, with the heading before it or the language's word for booking;
- an element with a photo as its background, a heading, at most two short paragraphs and no
  other images SHALL become a banner with that heading, text and photo, its first link becoming
  the banner's button; on the home page, the panel that gives the hero its photo SHALL stay the
  hero;
- a YouTube or Vimeo embed SHALL become a videos block;
- `<details>` elements, and questions in FAQPage structured data, SHALL become questions of the
  site's FAQ collection, shown by a questions block at that place;
- a contact form (asking for a name, an email or a phone, and a message) SHALL become a contact
  form block in its place: *Let us call you back* when it asks for a phone and no message or
  email, *Contact us* otherwise, its heading the one before it, its address the main location's
  email;
- other forms (sign-ups, searches, orders, logins), embeds and widgets SHALL be left out and
  reported.

On the home page, a row of two or more award or partner logos in the footer SHALL become a logos
block at the page's end, each logo named by its description or the words beside it, linked when
its source was.

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
- **WHEN** the contact page has a form with name, email and message fields
- **THEN** the page has a *Contact us* form block where the form was, and the review doesn't list
  it as left out

#### Scenario: A newsletter sign-up
- **WHEN** a page has a form with only an email field and a "Subscribe" button
- **THEN** the form isn't imported and the review lists it as left out on that page

#### Scenario: A grid of cards
- **WHEN** a page has a section of six articles, each with a photo, a heading linking to an
  imported page and a sentence, under the heading "Kam vyrazit"
- **THEN** the page has one cards block "Kam vyrazit" with six cards, each with its photo, title,
  sentence and a link to its imported page, and no gallery for them

#### Scenario: Cards linking to pages not imported
- **WHEN** the cards link to articles of the old site beyond the page limit
- **THEN** the cards have no link, and keep their photos, titles and texts

#### Scenario: Key figures
- **WHEN** a page shows "300M CZK" with "managed", "40+" with "countries" and "15" with "years"
  side by side
- **THEN** the page has a key figures block with those three values and labels

#### Scenario: How it works
- **WHEN** a page has the heading "Jak to funguje" followed by an ordered list of three items, each
  starting with a bold title and a sentence
- **THEN** the page has a steps block "Jak to funguje" with the three titles and sentences

#### Scenario: Opening hours shown on the page
- **WHEN** the bakery's structured data gives its hours and its contact page shows them in a
  table from Monday to Saturday
- **THEN** the contact page has an opening hours block where the table was

#### Scenario: Opening hours without structured data
- **WHEN** a page shows opening hours in a list and the site has no hours in structured data
- **THEN** the list stays text, and the business has no hours

#### Scenario: A photo band between card grids
- **WHEN** the home page has, after a grid of cards, a section with a background photo, the heading
  "Last minute", the sentence "Odlety z Brna každou sobotu." and a link "Všechny zájezdy" to an
  imported page
- **THEN** the home page has a banner "Last minute" with that text, the photo and a button
  "Všechny zájezdy" to that page, and no gallery or text block for the section

#### Scenario: A background behind a long text
- **WHEN** a section with a background photo holds a heading and five paragraphs
- **THEN** it is imported as text, as before, and not as a banner

#### Scenario: A map
- **WHEN** the contact page embeds a Google map of the bakery's address
- **THEN** the contact page has a contact block with the address and its "Show on map" link where
  the map was, and the review doesn't list the map as left out

#### Scenario: A booking widget
- **WHEN** a page embeds a Lodgify booking widget under the heading "Rezervace"
- **THEN** the page has a call to action "Rezervace" with a button leading to the booking
  service, and the review doesn't list the widget as left out

#### Scenario: Award logos in the footer
- **WHEN** the home page's footer shows three award logos, each with the award's name beside it
- **THEN** the home page ends with a logos block of the three, named by the awards
