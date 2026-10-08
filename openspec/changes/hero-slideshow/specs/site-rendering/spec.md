## ADDED Requirements

### Requirement: Hero slideshow rendering
A hero in the `slideshow` look with at least two slides SHALL render as a `<section class="block hero hero-slideshow">` holding:
- a region labelled with the hero's heading and described as a carousel (`aria-roledescription="carousel"`), with a list of slides, each a group described as a slide and named "<n> of <count>" in the site's language ("2 z 5", "2 of 5");
- in each slide, its image covering the slide (the first not lazy-loaded and sized for the full width, the others lazy-loaded) and its title over it on a shade from the theme's text colour, the title being the slide's link when it has one, with the link's clickable area covering the slide;
- after the region, the hero's heading as the page's `<h1>`, its text and its button, as in the `beside` look without its image.

Without the slideshow script, the slides SHALL sit in one row that can be scrolled or swiped one slide at a time. With it, the script SHALL:
- show one slide at a time and add "Pause" / "Play", "Previous slide" and "Next slide" buttons and one button per slide, all named in the site's language;
- advance to the next slide every six seconds, after the last going back to the first;
- stop advancing while the pointer is over the slideshow or focus is inside it, and when the visitor pauses it;
- never advance by itself when the visitor's system asks for reduced motion, starting paused;
- make slides other than the current one inert, so keyboard focus and screen readers stay on the visible slide.

A hero in the `slideshow` look with fewer than two slides SHALL render as the `cover` look (or `beside` without an image). The section SHALL pass the site's HTML validation.

#### Scenario: Six projects
- **WHEN** the home page's hero is a slideshow of six slides linking to project pages, with the heading "Such a happy company for your movies"
- **THEN** the page has one `<h1>` with that heading after the slides, six slides named "1 of 6" to "6 of 6", each title a link to its project's page, only the first image without lazy loading, and loads `assets/slideshow.js`

#### Scenario: Reduced motion
- **WHEN** a visitor whose system asks for reduced motion opens that page
- **THEN** the slideshow shows the first slide, paused, and moves only when the visitor uses its controls

#### Scenario: Pause on focus
- **WHEN** the visitor moves keyboard focus to the second slide's link
- **THEN** the slideshow stops advancing until focus leaves it

#### Scenario: One slide left
- **WHEN** a hero in the `slideshow` look has one slide and an image of its own
- **THEN** it renders as the `cover` look, and the page loads no slideshow script

## MODIFIED Requirements

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

