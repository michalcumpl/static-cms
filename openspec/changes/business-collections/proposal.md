# Proposal

## Why

Services, people and testimonials are a business's facts, but today each lives inside the block
that shows it. A business with a services overview on the home page and a full list on a
"Services" page types every service twice. The two copies drift apart, and software can't tell
what the business offers. The October 2026 strategy makes business data the source of truth and
has templates generate pages from it (see `docs/strategy.md`, roadmap milestone A). Collections
are the first step. The control panel (B) and template switching (C) both depend on them.

## What Changes

- **Collections on the site:** services, team (people), testimonials and FAQs. Each is an ordered
  list of items held once per site, next to the business details. Items keep today's fields:
  - a service has a name, a description and an optional price text;
  - a person has a name, an optional role and text, and a portrait;
  - a testimonial has a quote, a name, an optional detail and a photo.
- **FAQ, new:** questions and answers (the answer supports bold, italic and links), with a new
  `faq` block. It renders as `<details>`/`<summary>`, so it needs no JavaScript.
- **Blocks show collections instead of holding items.** The `services`, `team`, `testimonials`
  and `faq` blocks keep their optional heading. Each block either shows **all** items of its
  collection, in collection order (the default for a new block), or **chosen** items in its own
  order, for example three highlighted services on the home page.
- **Editing stays on the canvas.** Owners keep the block editor:
  - Texts of items are edited in place.
  - In a block showing all items, adding, moving, duplicating and deleting change the
    collection, so every block showing it changes too.
  - In a block showing chosen items, the owner adds existing or new items, reorders them, and
    removes an item from the block without deleting it.
  - Deleting an item deletes it everywhere, in one undoable step.
- **Languages:** which items exist, their order, and their images are shared and come from the
  primary language, like the business details. The texts (names, descriptions, prices, quotes,
  questions, answers) are translated per language. Outside the primary language, items can't be
  added, removed or reordered, only translated. An item the language hasn't translated yet shows
  the primary's texts.
- **Social profiles** join the business: an ordered list of profile addresses (Facebook,
  Instagram, LinkedIn, YouTube, X, TikTok or any other `https` address). They're shared by every
  language and edited in the Settings tab. Published sites show them as text links in the
  footer, and as `sameAs` in the structured data.
- **Structured data:** when the site has services, the home page's organization gets an
  `hasOfferCatalog` with them.
- **Document format 7**, with an upgrade that keeps every published page's output the same:
  - each block's items are lifted into the collection; exact duplicates become one item;
  - a block that showed exactly the whole collection, in order, shows "all"; any other block
    shows its former items as "chosen";
  - a one-time project upgrade first moves items that exist only in a non-primary language into
    the primary's collection, so nothing is lost when membership becomes shared.

### Non-goals (this change)

- **Several locations.** This changes contact details, opening hours, the footer and structured
  data, so it gets its own change (`business-locations`).
- **The business control panel** (milestone B): forms for collections outside the canvas.
- **Structured prices** (amount, currency, unit): price stays a text.
- **`FAQPage` structured data:** Google shows FAQ rich results only for government and health
  sites.
- The package split and the rename to `@webmio/*` are separate changes.
- Gallery and partner logos stay inside their blocks.

## Capabilities

### New Capabilities

None. Collections extend the existing site document, rendering and editing capabilities.

### Modified Capabilities

- `site-document`:
  - adds the site's collections, FAQ items, item references and social profiles;
  - changes the `services`, `team` and `testimonials` blocks to show a collection, and adds the
    `faq` block;
  - moves the validation of item contents to the collections, and checks references to items;
  - adds the version-6 upgrade and sets the schema version to 7.
- `site-rendering`: blocks render items from their collection (all or chosen); the `faq` block;
  social links in the footer; `sameAs` and `hasOfferCatalog` in the structured data.
- `site-editing`:
  - item structure follows the block's mode (all or chosen);
  - "Remove from this block" and adding existing items to a block showing chosen items;
  - deleting an item removes it everywhere;
  - the block panel's switch between all and chosen;
  - fixed collection structure outside the primary language.
- `languages`: collection membership, order and images become shared fields; item texts are per
  language.
- `site-storage`: the one-time project upgrade to version 7.
- `project-page`: social profiles in the business settings.

## Impact

- **`packages/site`:**
  - `schema/schema.ts` and `schema/types.ts`: collections, `faq`/`faq_item`, `item_ref`,
    `social_link`, block `show` and `chosen`;
  - `validate/*`;
  - `render/blocks.ts`, `render/business.ts`, `render/head.ts` (structured data) and the
    footer;
  - `migrate.ts` (`toVersion7`);
  - `languages.ts` (`applySharedFields`);
  - fixtures and snapshots.
- **`apps/admin`:**
  - the editor's Svedit schema and node components (`Services`, `Team`, `Testimonials`, new
    `Faq`/`FaqItem`, and an item-reference view);
  - `structure.ts`, `transforms`, `handles.ts`, the block panel and block picker cards;
  - the business settings (social profiles);
  - the storage layer (project upgrade);
  - i18n catalogues (Czech and English).
- **Risk:** Svedit editing a collection item from inside a page's block, through a path into the
  site's collection. A spike comes first, and the design has a fallback.
- No new dependencies. Upgraded sites publish the same pages as before, except for the
  home page's structured data, which gains the services catalog, and the footer's social links
  once profiles are added.
