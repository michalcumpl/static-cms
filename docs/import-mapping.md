# Import mapping

*Written 2026-10-07 from migrating the five example sites by hand (`example-sites`). The rules
`site-import` v1 automates; the parts marked **AI** wait for v2.*

## In code (site-import v1)

The reading is [`@webmio/import`](../packages/import/) (pure, tested on the invented sites in
`packages/import/fixtures/`); the fetching, the job and the review are in the admin
(`apps/admin/src/lib/server/import/`).

| Rule | Where | v1 |
| --- | --- | --- |
| Browser-like requests, compressed responses, charsets (`windows-1250` included) | `safe-fetch.ts`, `crawl.ts` | done |
| No internal addresses, size limits, timeouts, `robots.txt` | `safe-fetch.ts`, `robots.ts` | done |
| Pages from the menu, then `sitemap.xml`, 20 at most | `links.ts`, `crawl.ts` | done |
| Lazy images, `srcset`, size suffixes, CSS backgrounds | `images.ts`, `blocks.ts` | done |
| SVG logo and favicon to PNG; other SVGs left out | admin `images.ts` | done |
| Hidden emails reported, percent-encoded ones decoded | `business.ts` | done |
| Business from JSON-LD (`@graph` too), microdata, `tel:`/`mailto:`, `<address>` | `business.ts` | done |
| Social profiles | `links.ts`, `business.ts` | done |
| Texts, subheadings without skipped levels, lists, tables | `blocks.ts`, `text.ts` | done |
| Photo beside text, galleries, logo rows, YouTube and Vimeo | `blocks.ts` | done |
| `<details>` and FAQPage questions into the FAQ collection | `blocks.ts`, `site.ts` | done |
| Theme: colours, catalogue fonts, contrast | `theme.ts` | done |
| Each page's old address, redirected when published | `site.ts`, admin `publishing/redirects.ts` | done |
| Contact forms as contact form blocks; other forms and widgets left out and reported | `forms.ts`, `blocks.ts`, `site.ts` | done (`contact-form`) |
| Cards, key figures, steps, opening hours, maps, booking widgets and footer logos as Webmio's blocks | `structures.ts`, `booking.ts`, `site.ts` | done (`import-existing-blocks`) |
| Other languages | | reported, not imported |
| One-page sites split into pages per section | | not yet: imported as one home page |
| Subpages of one kind as collection items; repeated cards as services or team | | **AI** (v2) |
| Pages built by JavaScript (headless browser) | `script.ts` | detected and reported, not read |
| Links to PDFs as documents | | not yet: links to the old site's own files are dropped |
| Retrying pages that didn't answer and images that failed; the next 20 pages over the limit | [`retry.ts`](../packages/import/src/retry.ts), admin `import/retry.ts` | done (`import-review-actions`) |
| Imported images without a description marked decorative in one step | admin `import/decorative.ts` | done (`import-review-actions`) |
| A logo drawn by CSS (a background on the logo element); a photo filling a panel of the home page (`background-size: cover`) as the hero's photo | `css.ts`, `site.ts` | done (Mareš: the logo and the painting of the office) |
| A site without a colour of its own keeps a black-and-white theme (each stylesheet read once; a fallback colour must repeat); the home page's first paragraph as the site description without a meta description | `theme.ts`, `site.ts` | done (Mareš) |
| A gallery or logo row without its images keeps its heading; smaller subheadings first on a page fixed in one step | `site.ts`, admin `heading-levels.ts` | done (`import-review-actions`) |

## The examples imported (2026-10-09)

`pnpm admin import-site` on the seven examples, after fixing what the first run showed. Each
wrong result a v1 rule should handle became a fixture test in `@webmio/import`.

| Example | Pages, images, questions, profiles | What it missed or left out |
| --- | --- | --- |
| Aniděti | 1, 18, 14, 5 | One-page site: imported as one home page (the split is not v1). A map embed. |
| Mareš Partners | 13, 0, 0, 0 | The award logos are in the footer, which isn't read as content. The Czech version reported. |
| Mortgage Specialist | 20, 29, 0, 0 | 91 blog posts over the page limit; Webnode's SVG icons (in `<embed>`) left out as images; two pages built by a script. |
| Fond 10X | 5, 9, 0, 1 | The Czech pages reported as another language; an AVIF chart and SVG icons left out; a newsletter form on every page. |
| Roubenka Svitávka | 3, 13, 7, 3 | The booking widget (Lodgify) and a Wix video reported as embeds; the availability page is built by a script; the English pages reported. |
| Scénografie | 20, 98, 0, 2 | 327 project pages over the limit and 4 images over 100: projects need the collection (v2). Decorative SVGs left out. |
| Punk Film | 3, 39, 0, 3 | The SVG logo address answers 404; the clients' SVG logos left out; the references are linked from the Work page, not the menu, so they stay out (projects, v2). |

What the first run taught, now rules with tests:
- Links to videos aren't social profiles, and profiles are compared without their query and
  trailing slash (Aniděti listed 25 "profiles", all its videos).
- A language switcher's link to the imported language isn't another language (Mareš), links to
  other sites are never language versions (Scénografie's Facebook sat in its switcher), and pages
  in another language than the home page are left out (Fond 10X, Roubenka).
- A page with photos isn't "built by a script" however little text it has (Scénografie's
  galleries).
- Menus can be plain links in a header or a list in a `.navigation` container (Punk Film).
- An `<embed>` showing an image is an image (Webnode).
- FAQPage structured data gives questions (Roubenka's 7).
- The same thing left out twice on a page is reported once.

## Blocks the examples call for (2026-10-09)

What the seven examples (and vroomagazine.com, imported 2026-10-09 as a large, messy stress test:
Webmio doesn't target magazines, and the 20-page limit stays) showed that the import doesn't produce yet, by what it would take.

**Blocks that exist, which the import didn't make** (mapping only, no new block; the rules are in
[`structures.ts`](../packages/import/src/structures.ts), tested on the bakery and agency
fixtures):

| Pattern seen | Block | Examples | Status |
| --- | --- | --- | --- |
| A grid of three or more repeated cards: one image, a title, a short text, a link (was one gallery per card, stacked) | `cards`, 12 a block | vroomagazine (3×4 article grids) | done (`import-existing-blocks`) |
| Two to six short number-led values with labels | `figures` | Fond 10X ("300M CZK managed") | done |
| A bold-titled ordered list, or headings numbered 1, 2, 3, under a heading | `steps` | Fond 10X | done |
| A Google Maps or Mapy.cz embed (was left out) | `contact`, with the "Show on map" link; the embed's place as the map link when the location has no address | Aniděti, the bakery and agency fixtures | done |
| A booking widget or link of a known service (was left out as an embed) | `call_to_action` to the booking service, with the heading and sentence before it | Roubenka (Lodgify) | done |
| A section with a background photo, one heading, at most two short paragraphs and no other images (was a photo beside the text, or a text and a one-photo gallery) | `banner`, its first link the button; the home page's top panel stays the hero's photo | the bakery and agency fixtures | done (`banner-block`) |
| A form asking for an email or phone and a message, or for a name and a phone (was left out) | `contact_form`, *Contact us* or *Let us call you back*, with the heading and sentence before it and the submit button's words, to the business email | the bakery fixture | done (`contact-form`) |
| Opening hours in a table or list | `opening_hours`, when structured data gave the business its hours; text otherwise | the bakery fixture | done |
| Award or partner logos in the home page's footer | `logos` at the home page's end | Mareš Partners | done |
| Repeated cards of people, quotes, priced services | `team`, `testimonials`, `services` | Aniděti, Fond 10X, Roubenka | **AI** (v2) |
| Many pages of one kind | `projects` collection | Scénografie (327), Punk Film | **AI** (v2) |

**New blocks already on the roadmap:** `documents` (links to PDFs: the bakery's price list),
`newsletter` (Fond 10X's signup on every page), `booking` (Roubenka's calendar). Contact
forms came with `contact-form`.

**Blocks added for imports:** `banner-block`, a full-width photo band with a heading, text and a
button anywhere on a page, for the "hero" bands between vroomagazine's card grids (before, a
text block and a one-photo gallery, as the hero block must be first).

**Not on the roadmap yet:**
- **Posts** (a blog or news collection with dates): Mortgage Specialist's 91 posts, all over the
  page limit; a `projects`-like collection with dates and a listing page.
- **Price list** (items with prices, grouped): Roubenka's rates, the bakery's price list; today
  bold list items or a PDF.
- **Footer content** (award logos, partners): Mareš's awards sit in the footer, which the import
  doesn't read; a logos block above the footer would hold them.


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
| Forms | A contact form block for contact and callback forms; sign-ups, searches, orders and logins left out | v1 |
| Booking widgets and checkout links | A call to action to the booking service | v1 |
| Opening hours and check-in times | Hours only when they are opening hours; check-in times go to the house rules | **AI** |
| Theme: the most used colours in the CSS, the fonts in `@font-face` and Google Fonts links | A design: the nearest catalogue fonts, colours adjusted until the contrast checks pass | v1 guess |

## What the review must show

- Pages, items and images imported, with counts.
- What was left out: forms other than contact forms, videos, widgets, hidden emails, images that
  couldn't be fetched.
- The validation problems of the imported site, each leading to its field, before anything is
  published.

## The review's actions (`import-review-actions`)

- **Try again**, under "What was left out", while pages didn't answer or images couldn't be
  imported: they are fetched again with the import's rules and limits. Forms, embeds, hidden
  emails, disallowed or script-built pages, files and other languages offer no retry.
- **Import the next pages (N left)** while pages were over the limit: the next 20, in the import's
  order (the menu's, then the sitemap's).
- A retry runs in the background on the import queue, one per project, its progress on the review.
  New pages go at the end of the page list with a slug unique in the project, keep their old
  address for redirects, and join the end of the menu when the old menu linked them. An image that
  arrives is placed where its page shows it when the owner hasn't changed that page since the
  import ([`pageUnchanged`](../packages/import/src/unchanged.ts) compares the page's whole
  subtree without node IDs); otherwise it goes to the media library and the review says so. The
  retry saves one version, and fails without changing the site when the owner saved meanwhile.
- **Mark these images as decorative (N)**, under "Before you publish", while imported images
  (from the import's version, or placed by a retry) lack a description: one saved version that
  version history can undo. The owner's own images are never marked. Screen readers skip
  decorative images, so images that carry information are better described; each problem still
  leads to its image.
- The same problem on several pages or images is one item; pages without a description lead to
  the site's description, which fixes them all at once.
- **Fix the subheading levels on N pages**, under "Before you publish", while a page has a smaller
  subheading before any main one: the first such subheading on each page becomes a main one, as
  one saved version.
- What the import keeps for a retry is `imports.retry_state`; imports made before it offer no
  retry, and marking decorative uses the project's first version as the import's.
