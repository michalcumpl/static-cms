# Layouts

*Written 2026-10-07 from the five example sites migrated with `example-sites`; Scénografie and
Punk Film added 2026-10-08. Input for
`template-system`, which turns these recipes into data.*

A **layout** is a page recipe: an ordered list of blocks with their settings and the collections
they read, with no styling (strategy, "Templates, designs and layouts"). The recipes below are the
pages the examples needed, written with today's blocks. **Shared** recipes suit every template;
the others belong to one template. Blocks in *italics* don't exist yet and stand in for the gaps
listed at the end.

The examples: [Aniděti](https://www.anideti.cz/) (Education),
[Mareš Partners](https://www.marespartners.cz/) (Law),
[Mortgage Specialist](https://www.mortgagespecialist.cz/) (Financial advisory),
[Fond 10X](https://fond10x.cz/en/) (Investment management),
[Roubenka Svitávka](https://roubenkasvitavka.cz/) (Short-term rentals),
[Scénografie](https://scenografie.cz/) (Exhibitions) and
[Punk Film](https://www.punkfilm.cz/) (Creative production). Their content is in our
database only, not in this repository.

## Shared layouts

| Layout | Blocks, in order | Used by |
| --- | --- | --- |
| **Home** | hero (with the main call to action) · text (who we are, 1–3 paragraphs) · *key figures* · services (chosen highlights or all) · team or testimonials · logos (partners, awards) · call to action | all five |
| **Services** | text (intro) · services (all) · *steps* ("how it works") · call to action | Law, Financial advisory, Short-term rentals |
| **About** | text (story) · *key figures* · team (all) · call to action | Financial advisory, Investment management |
| **Team** | text (intro) · team (all, or chosen groups such as "Partners" and "Office") | Education, Law, Investment management |
| **Contact** | contact (main location) · text (how to get here, who to ask about what) · call to action (email, phone) · testimonials | all five |
| **FAQ** | faq (all) · text (documents, legal notes) | Investment management |
| **Media / press** | text (list of articles with links and outlets) | Investment management |
| **Careers** | text (who we look for, what we offer) · call to action (send a CV) | Law |

## Template layouts

| Template | Layout | Blocks, in order |
| --- | --- | --- |
| Education | **Courses** | text (term start) · services (all: course, age group, place, price per term) · *timetable* · text with image (gift voucher) · call to action |
| Education | **How we work** | text with image × n (one per activity, photos alternating sides) · gallery |
| Education | **Films and awards** | text (where the films are) · text with image (awards photo) · text (awards by year, subheadings per year) · *video* |
| Law | **Practice areas** | services (all; a scope list per area) · call to action. The original has a page per area: see "service detail pages" below |
| Law | **Firm profile** | text (history, memberships) · text (awards list) · logos (award logos) |
| Financial advisory | **Consultation** | text (what we need to know) · *contact form* · contact · testimonials · *reviews with a rating* |
| Investment management | **How we invest** | text (principles as subheadings) · text with image (founder's share) · *key figures* · call to action |
| Investment management | **For investors** | services (the product, its minimum) · faq · *documents* · *regulatory note* |
| Short-term rentals | **Accommodation** | services (the house and the cabins, capacities, from-price) · gallery · text (amenities, house rules) · *check-in and check-out* |
| Short-term rentals | **Prices and availability** | text (seasons and prices) · text (payments, cancellation) · *booking* (the owner's booking service) |
| Exhibitions | **Home** | hero (full photo) · *cards* (the project categories, each linking to its page) · text (who we are) · services (what we do) · *cards* (the workshops) · logos (partners) · call to action |
| Exhibitions | **Project category** | text (what we do in it) · *projects* (this category, tiles with the name over the photo, "show more") · call to action. Stand-in: a gallery with captions |
| Exhibitions, Creative production | **Project** | text with image (cover, the story, *facts*: client, year, place, author, photographer, scope) · gallery (photos) · *video* (trailer) · link to more work. Stand-in: a page made by hand |
| Exhibitions | **Workshops** | services (the workshops) · text with image × n (one per workshop) · call to action |
| Exhibitions | **About** | text (story) · *key figures* · text with image × n (capabilities) · *cards* (awards) |
| Exhibitions | **Contacts** | contact · opening hours · team (list, grouped by department) · text (billing details) · *jobs* |
| Creative production | **Home** | *hero slideshow* (latest work, each slide linking to its project) · *cards* (Commercials, Film & TV, Other) · logos (clients) · call to action |
| Creative production | **Work** | *projects* (all, filtered by category: commercials, film and TV, other) |
| Creative production | **Services** | text (locations, incentives) · services (list) · text (incentive rules) · team (the contact producer) · *projects* (service references) |
| Creative production | **About** | text (founders, memberships, what we shoot) · team (all, portraits) · logos (clients and brands) |

## What the examples lack

By how many examples needed it. Items 1–14 were counted on the first five; Scénografie and Punk
Film added 15–20 and the second video. Today's stand-in is in brackets.

1. **Key figures** (4: years in business, amounts arranged, assets under management, returns):
   **done**, the key figures block (`figures-and-steps`).
2. **Full-photo hero** (4): **done**, the hero's "Full photo" look (`block-variants`); templates
   will choose it as their default.
3. **Steps** (2: Mortgage's "how it works", Fond 10X's investment process): **done**, the steps
   block (`figures-and-steps`).
4. **Service detail pages, or lists in a service** (2: Mareš's eight areas each with a scope list,
   Aniděti's long course descriptions): **done**, a page per service with its own text and lists
   (`collection-pages`); Mareš's practice areas use it.
5. **Contact form** (3: Mortgage, Fond 10X, Roubenka) [email and phone buttons]. Planned as
   `contact-form`.
6. **Documents to download** (2: Fond 10X's statute and key information documents, Mareš's award
   certificates) [links to the old site's files]. Needs file uploads next to images.
7. **Reviews with a rating** (2: a Google rating, Roubenka) [testimonials; review
   screenshots in a gallery get cropped and are unreadable].
8. **Video** (2, central to both: Aniděti's 20+ films on YouTube, Punk Film's trailer on every
   project on Vimeo) [links]. Without cookies until clicked. Moved before launch.
9. **Timetable or table** (2: Aniděti's course schedule, Roubenka's seasonal prices) [lists].
10. **Booking and availability** through the owner's booking service (1: Roubenka on Lodgify)
    [a button to the checkout].
11. **Check-in and check-out times** for rentals (1) [house rules text; the opening hours note
    read as opening hours].
12. **Newsletter signup** (1: Fond 10X) [a call to action to LinkedIn].
13. **Company and regulatory details** (3: company ID, "supervised by the Czech National Bank",
    a fund's legal structure) [text on one page; nothing in the footer].
14. **Business types** for structured data (all but one): no education, legal, financial,
    lodging or production type exists, so the examples use LocalBusiness or ProfessionalService.
15. **Projects (a portfolio)** (2, the core of both: about 90 projects at Scénografie in four
    categories, about 30 at Punk Film in three) [galleries with captions that can't link; one
    project page made by hand each]: **done** (`collection-pages`), a projects collection with
    categories, facts, photos and a video address, a projects block (all, chosen or one
    category, the first few with a link to all), and a page per project. Filtering in the
    browser stays out (no JavaScript): category pages do it.
16. **Cards: image, title, text and a link** (2: both home pages lead to their categories with
    photo tiles; Scénografie's awards and capabilities) [galleries, which can't link; text with
    image eight times in a row]. Planned as `cards`.
17. **Hero slideshow** (1, but the signature of film and creative agencies: Punk Film's home
    opens with its latest work, a still and title per slide linking to the project) [a
    full-photo hero with one still]. Needs pause and next/previous controls, no movement with
    reduced motion, and only the first image loaded up front. Planned as `hero-slideshow`.
18. **Grouped menus** (1: Scénografie's "Projekty" with four pages, "Zakázková výroba" with
    three, and a small top menu) [eight items in one row]. Planned as `menu-groups`.
19. **Billing address and bank details** (2: Punk Film's headquarters apart from its office,
    Scénografie's bank account and data box) [a text block]. With `business-details`.
20. **Job openings** (2: Mareš's career page, Scénografie's open positions) [text]. Planned
    as `jobs`.

## Design notes

- **Presets carried three of five:** Garden (Aniděti), Harbour (Mortgage Specialist), and custom
  colours on Harbour (Mareš: navy and a serif). Fond 10X needed a **dark** design for its white
  logo, which passed the contrast checks; Roubenka a forest green with warm wood tones.
- **Logos with the name in them** need the header to hide the site name (the builder sets it).
- **Team without portraits** (Mareš, three of four at Fond 10X) looks sparse or uneven as centred
  cards; a compact list (name, role, email) suits law and finance. **Done:** the team's "List"
  look (`block-variants`).
- **Services with many or long items** (Mareš) need a list or accordion layout instead of cards.
  **Done:** the services' "List" and "Accordion" looks.
- **Galleries crop** to one shape; screenshots and logos need a "show the whole image" option.
  **Done:** the gallery's "Whole images" look.
- **Square, bold and loud** (Scénografie, Punk Film): radius 0 works; both want a heavy display
  font for headings (Montserrat 900, a tight grotesque), which we don't offer yet (Work Sans and
  Inter stand in). Planned as part of `design-touches`.
- **Brand colours that fail contrast:** Scénografie's orange (#fe3500) can't carry white button
  text; we used #c42a00. The design tab should offer the nearest shade that passes.
- **Long portfolios** (32 exhibitions on one page) need "show more" or paging, and lazy images
  (already there).
- **Addresses are shared** across languages, so an English page shows a Czech city name; fine for Czech
  addresses, worth a note in the editor.
