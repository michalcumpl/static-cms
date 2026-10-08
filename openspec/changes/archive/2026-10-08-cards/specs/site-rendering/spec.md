## ADDED Requirements

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
