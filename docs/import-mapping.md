# Import mapping

*Written 2026-10-07 from migrating the five example sites by hand (`example-sites`). The rules
`site-import` v1 automates; the parts marked **AI** wait for v2.*

## Fetching

| What we met | Rule |
| --- | --- |
| A firewall answering "Access Denied" to plain requests (Mareš Partners) | Request like a browser: a current browser's user agent, `Accept` and `Accept-Language` headers, compressed responses |
| A site built by a booking platform (Roubenka on Lodgify) and by Webnode (Mortgage Specialist) | Plain HTML was enough here; sites that render in the browser still need a headless browser |
| Images lazy-loaded with an empty `src` (Fond 10X) | Read `data-src`, `data-lazy-src` and `srcset`, and image URLs anywhere in the HTML |
| The main photo as a CSS background (Aniděti's header) | Read `background-image` URLs from the page's stylesheets |
| Image URLs with size suffixes (`-532x328`, `?w=2080`) | Ask for the largest size the source offers, up to 1600 px |
| An SVG logo (Fond 10X) | Convert SVG to PNG; the library takes JPEG, PNG and WebP |
| An email hidden by an anti-spam script ("[email protected]", Roubenka) or encoded in `mailto:` (Fond 10X) | Decode percent-encoded addresses; leave hidden ones out and say so in the review |
| Unquoted, minified HTML (Aniděti) | Use a real HTML parser, never patterns |

## Structure

| Source | Webmio |
| --- | --- |
| The navigation's links (and a language switcher's other language) | Pages and menu; the other language as a second language of the project, paired page by page |
| A one-page site with anchored sections (Aniděti, Fond 10X) | One page per main section, the first and the shortest ones kept on the home page. **AI** to judge which sections belong together; v1 splits at each section with its own menu entry |
| Subpages of one kind (Mareš's practice areas, Fond 10X's team members) | Items of a collection, with the subpage's text in the item; detail pages when they exist |
| Each source page's address | The imported page's old address, for "Redirects from earlier addresses" |
| Headings | Level 2 and 3 subheadings, the first on a page always level 2 (validation refuses a skipped level) |

## Content

| Signal in the source | Webmio | v1 or AI |
| --- | --- | --- |
| schema.org `LocalBusiness` data; `tel:` and `mailto:` links; an address block | Business and its main location (phone stored as `+420…` without spaces) | v1 |
| Links to Facebook, Instagram, LinkedIn, YouTube | Social profiles | v1 |
| `<details>` or schema.org `FAQPage`; headings phrased as questions followed by answers (Fond 10X) | FAQs | v1 for markup, **AI** for headings |
| A repeated card: name, text and a price ("3 000 Kč / term", "from 400 € a night") | Services with prices | **AI** (v1 imports the cards as text) |
| A repeated card: photo, name, role (Aniděti's teachers, Fond 10X's team) | Team | **AI**; v1 when the cards are marked up as people |
| A quote with a name and a detail ("Director, from Canada") | Testimonials | **AI** |
| A row of logos with names or links (Mareš's awards, Aniděti's partners) | A logos block | v1 |
| Large numbers with a short label ("300M CZK managed", "40+ countries") | Key figures (a gap today: bold list items) | **AI** |
| Numbered "how it works" headings | Steps (a gap today: subheadings) | **AI** |
| Photo grids | A gallery; images with text beside them become text with image | v1 |
| Links to PDFs | Documents (a gap today: links) | v1 |
| Forms | A contact form once `contact-form` exists; until then email and phone buttons | v1 notes it |
| Booking widgets and checkout links | A call to action to the booking service | v1 |
| Opening hours and check-in times | Hours only when they are opening hours; check-in times go to the house rules | **AI** |
| Theme: the most used colours in the CSS, the fonts in `@font-face` and Google Fonts links | A design: the nearest catalogue fonts, colours adjusted until the contrast checks pass | v1 guess |

## What the review must show

- Pages, items and images imported, with counts.
- What was left out: forms, videos, widgets, hidden emails, images that couldn't be fetched.
- The validation problems of the imported site, each leading to its field, before anything is
  published.
