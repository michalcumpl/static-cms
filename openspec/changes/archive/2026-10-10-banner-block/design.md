# Design

## Context

The hero already has what a banner needs, but only at the top of a page:
- a heading, a text, one image and one button (`action`);
- the full-photo look (`hero-cover`, a dark panel over a cover photo);
- the editor's image slot with a focal point;
- a place in the button panel (`BUTTON_LISTS.hero`).

The hero is tied to the top in several places: validation (`hero-not-first`), the picker
(`heroTop`, `oneHero`) and its `<h1>`. New block types since `jobs` have needed no document
version step. The import already reads background photos: `addBackgrounds` puts an
`img[data-import-background]` in the element. It also takes a home-page panel's cover photo for
the hero. A mid-page band therefore arrives as a photo item followed by text, and ends up as a
one-photo gallery plus a text block.

## Goals / Non-Goals

**Goals:**
- A `banner` block with one look, anywhere on a page, any number of times.
- Reuse the hero's pieces (panel CSS, image slot, button panel) rather than copy them.
- The import maps mid-page photo bands to banners.

**Non-Goals:**
- Letting the hero go mid-page, or several heroes. The `<h1>` stays unique.
- Other looks: text beside the photo is text with image; panel positions or overlays aren't
  offered.
- A second button (that is a call to action), video backgrounds, or parallax.
- A banner in the shared layouts or the guided setup. Owners add it where they want it.

## Decisions

### 1. A new block type, not a movable hero

**Shape:**

```
banner: PAGE_BLOCK · heading (text, one line) · text (text, strong/emphasis, one line)
        · image (node_array image, 0..1) · action (node_array LINK_TYPES, 0..1)
```

**Why not a movable hero:** it would mean a heading level that depends on position, the
slideshow and looks on every copy, and validation exceptions.

**Why the same property names as the hero:** `image`, `action`, `heading` and `text` let the
hero's code be reused by type:
- `imagePropertyOf` returns `image`;
- `OPTIONAL_IMAGE_OWNERS` gains `banner`;
- `BUTTON_LISTS.banner = { property: "action", max: 1 }`.

There is no version step: a new node type adds nothing to existing documents.

### 2. Validation

Errors, the same codes as the hero:
- `empty-heading`;
- `too-many-items`, for more than one image or button.

The images are checked like any other image (alt text). The banner joins the list of block
types whose non-empty heading counts as an `<h2>` for `heading-skip`. A banner without a photo
is not a problem: it is the colour band.

### 3. Rendering

**With a photo:**

```html
<section class="block banner banner-photo">
  <img class="banner-image" loading="lazy" sizes="100vw" …>
  <div class="container banner-inner"><div class="banner-content">
    <h2>…</h2><p class="banner-text">…</p><p class="banner-action"><a class="button">…</a></p>
  </div></div>
</section>
```

The CSS shares the hero cover's rules: the grid stacking, the `object-fit: cover` photo
positioned at the focal point by `renderImage`, and the dark panel with
`color-mix(--color-text 72%)`. The selector lists are extended
(`.hero-cover …, .banner-photo …`) so both stay one rule. The band is shorter than the hero:
`min-height: 18rem` against 26rem.

**Without a photo:**
- `banner-plain` has `--color-primary` as its background and `--color-background` as its text.
- The button is inverted (background colour, primary text).
- Theming already enforces the contrast between primary and background, since the buttons'
  labels need it.

**Other details:**
- The heading always renders as `<h2>`.
- `IMAGE_SIZES.banner = "100vw"`, lazy, since a banner is never the page's first image the way a
  hero is.
- The pinned stylesheet fixtures get the additions.

### 4. Editor

- `BlockType` and the picker's lists gain `banner`, after `call_to_action`. It isn't restricted
  like the hero, so `unavailableReason` returns nothing for it.
- `insertBanner`:
  - a heading in the site's language, from `siteStrings` (a new `bannerHeading`: "Nadpis" /
    "Heading");
  - empty text, image and action;
  - the caret in the heading.
- `nodes/Banner.svelte` mirrors the hero's cover branch:
  - `TextProperty` `h2` and text;
  - an `ImageSlot` as the photo when there is one, so the slot's Add image button shows over the
    colour band when there isn't;
  - the button through `Child`.
- `buttons.ts`:
  - the `type` union and `BUTTON_LISTS` gain `banner`;
  - the "removable" rule treats it like the hero.
- The picker card gets an illustration (a wide photo rectangle with a panel, a heading bar and a
  primary button), and en/cs strings.

### 5. Import

**Detection.** A new structure in `structures.ts`, run on group elements (`section`, `div`,
`article`). The element is a banner when it:
- has a direct `img[data-import-background]` child;
- has exactly one heading (`h2` to `h4`);
- has at most two paragraphs, totalling at most 300 characters;
- has no other `<img>`, and no list, table or form.

It becomes the segment `{ kind: "banner", heading, text, image, link }`. The first `<a>` with
words becomes the button: an imported page by its slug, as cards link, or an outside address.

**Exclusions:**
- On the home page, an element whose photo `takeHeroImage` takes for the hero stays the hero.
  So detection skips the first such element when `hero` is set and the element comes before the
  page's second heading.
- An element with more text stays as it is today.

**Mapping.** `site.ts` maps the segment to `{ type: "banner", heading, text, image, action }`.
Images go through the same collector, so failures are reported as before.

**Fixture.** The agency fixture's home page gets a band after the cards: "Last minute", "Odlety
z Brna každou sobotu." and a link "Všechny zájezdy" to an imported page. Its background is set in an
inline `style`, since the agency fixture has no stylesheet. The agency's home block list in the
tests changes accordingly.

The bakery fixture already has such a band (`section.banner` with a cover background from
`style.css`). It was a text with image block before and becomes a banner now.

## Risks / Trade-offs

- **The import rule is a guess.** Sites use backgrounds for decoration too, such as a texture
  behind a whole section.
  - Mitigation: the strict limits (one heading, short text, no other images).
  - The owner can still change it: a banner becomes text by deleting it, and the review lists
    the page.
- **A photo with busy detail under the panel.** The panel is opaque enough (72 %) to keep
  contrast, the same trade-off as the hero cover.
- **Picker growth.** At 20 cards the picker grid gets long; ordering keeps related blocks
  together (banner next to call to action).
