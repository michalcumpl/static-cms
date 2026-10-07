# Layouts

*Written 2026-10-07 from the five example sites migrated with `example-sites`. Input for
`template-system`, which turns these recipes into data.*

A **layout** is a page recipe: an ordered list of blocks with their settings and the collections
they read, with no styling (strategy, "Templates, designs and layouts"). The recipes below are the
pages the examples needed, written with today's blocks. **Shared** recipes suit every template;
the others belong to one template. Blocks in *italics* don't exist yet and stand in for the gaps
listed at the end.

The examples: [Aniděti](https://www.anideti.cz/) (Education),
[Mareš Partners](https://www.marespartners.cz/) (Law),
[Mortgage Specialist](https://www.mortgagespecialist.cz/) (Financial advisory),
[Fond 10X](https://fond10x.cz/en/) (Investment management) and
[Roubenka Svitávka](https://roubenkasvitavka.cz/) (Short-term rentals). Their content is in our
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

## What the examples lack

By how many of the five needed it. Today's stand-in is in brackets.

1. **Key figures** (4: years in business, amounts arranged, assets under management, returns):
   **done**, the key figures block (`figures-and-steps`).
2. **Full-photo hero** (4) [the split hero, text left and photo right]. A variant of the hero, or
   a template's default.
3. **Steps** (2: Mortgage's "how it works", Fond 10X's investment process): **done**, the steps
   block (`figures-and-steps`).
4. **Service detail pages, or lists in a service** (2: Mareš's eight areas each with a scope list,
   Aniděti's long course descriptions) [lines starting with "–" in the description: tall cards].
5. **Contact form** (3: Mortgage, Fond 10X, Roubenka) [email and phone buttons]. Planned as
   `contact-form`.
6. **Documents to download** (2: Fond 10X's statute and key information documents, Mareš's award
   certificates) [links to the old site's files]. Needs file uploads next to images.
7. **Reviews with a rating** (2: a Google rating, Roubenka) [testimonials; review
   screenshots in a gallery get cropped and are unreadable].
8. **Video** (1, but central: Aniděti's 20+ films on YouTube) [links]. Without cookies until
   clicked.
9. **Timetable or table** (2: Aniděti's course schedule, Roubenka's seasonal prices) [lists].
10. **Booking and availability** through the owner's booking service (1: Roubenka on Lodgify)
    [a button to the checkout].
11. **Check-in and check-out times** for rentals (1) [house rules text; the opening hours note
    read as opening hours].
12. **Newsletter signup** (1: Fond 10X) [a call to action to LinkedIn].
13. **Company and regulatory details** (3: company ID, "supervised by the Czech National Bank",
    a fund's legal structure) [text on one page; nothing in the footer].
14. **Business types** for structured data (all but one): no education, legal, financial or
    lodging type exists, so the examples use LocalBusiness or ProfessionalService.

## Design notes

- **Presets carried three of five:** Garden (Aniděti), Harbour (Mortgage Specialist), and custom
  colours on Harbour (Mareš: navy and a serif). Fond 10X needed a **dark** design for its white
  logo, which passed the contrast checks; Roubenka a forest green with warm wood tones.
- **Logos with the name in them** need the header to hide the site name (the builder sets it).
- **Team without portraits** (Mareš, three of four at Fond 10X) looks sparse or uneven as centred
  cards; a compact list (name, role, email) suits law and finance.
- **Services with many or long items** (Mareš) need a list or accordion layout instead of cards.
- **Galleries crop** to one shape; screenshots and logos need a "show the whole image" option.
- **Addresses are shared** across languages, so an English page shows a Czech city name; fine for Czech
  addresses, worth a note in the editor.
