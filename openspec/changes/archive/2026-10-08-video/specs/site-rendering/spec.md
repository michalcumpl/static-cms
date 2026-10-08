## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Output escaping
All document text and attribute values SHALL be HTML-escaped, so that document content cannot inject markup or scripts. Rendered pages SHALL contain no inline event-handler attributes and no `<script>` elements, with two exceptions: structured data (`<script type="application/ld+json">`, see "Structured data"), and on pages that show a video, one `<script src="…/assets/video.js" defer>` loading the site's video script, which holds no document content.

#### Scenario: Markup in text
- **WHEN** a paragraph's text is `<script>alert(1)</script>`
- **THEN** the output contains the escaped text `&lt;script&gt;alert(1)&lt;/script&gt;` and no `<script>` element

#### Scenario: Script only with a video
- **WHEN** rendering a page without a video and a page with a videos block
- **THEN** the first has no `<script src>`, and the second has exactly one, loading `assets/video.js`


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
