# Design

## Context

See proposal.md for the motivation. The current state:

- **The hero** has `heading`, `text`, `image`, `action` and `layout` (`beside` | `cover`, from
  `block-variants`); it is always first on a page, and its heading is the page's `<h1>`.
- **Scripts:** pages have no scripts except `assets/video.js` on pages with a video
  (`video`): `RenderContext.pageHasVideo` / `siteHasVideo` decide the `<script>` tag and the
  export's file; the script is a static string in `@webmio/render`.
- **Card links** (`cards`): `target_id` (a page, or a service or project with a page) or `url`,
  validated with the `broken-card-link` warning and `checkHref`, edited in `CardPanel.svelte` with
  `setCardLink`. Item limits for cards and videos live in `itemLimit` (`structure.ts`).
- **Format** is 10.

## Goals / Non-Goals

**Goals:**
- A slideshow that follows the WAI carousel pattern and the reduced-motion preference.
- A page that works without the script (scrollable row of slides) and loads one photo up front.
- The slide link model and editing shared with cards.

**Non-Goals:**
- Video clips in slides, fade or other transitions, slideshows in other blocks, slides from a
  collection (the template can fill slides from projects later).

## Decisions

### 1. Slides on the hero, format 11

```
hero   + slides: node_array<slide> (default empty)
       layout: "beside" | "cover" | "slideshow"
slide  image: node_array<image> (≤ 1), title (text, one line),
       target_id: string (""), url: string ("")
```

- **On the hero, not a new block:** the slideshow is the page's opening, with the hero's rules
  (first, once, the `<h1>`); a separate block would duplicate them.
- `slide` mirrors `card`'s link fields, so `setCardLink` and the link checks take either (renamed
  `setItemLink`; validation shares one `checkItemLink`).
- `toVersion11` adds `slides: []` to every hero; fixtures move to 11 with `demo-site-v10.json`
  kept.

### 2. Validation

Only in the `slideshow` look: fewer than two slides → `slideshow-too-short` warning (renders as
`cover`); more than eight → `too-many-items`; a slide without an image → `missing-image`; without
a title → `empty-title`; links via `checkItemLink` (`broken-card-link` warning, renamed in its
message to "the link of slide 2 on …", `unsafe-link` error).

### 3. Rendering

```html
<section class="block hero hero-slideshow">
  <div class="slideshow" role="region" aria-roledescription="carousel"
       aria-label="Such a happy company for your movies" data-labels='…'>
    <ul class="slides">
      <li class="slide" role="group" aria-roledescription="slide" aria-label="1 of 6">
        <img class="slide-image" … sizes="100vw">        <!-- lazy from the second on -->
        <p class="slide-title"><a href="/work/mustang/">OSTRAVAR - MUSTANG</a></p>
      </li>
    </ul>
  </div>
  <div class="container hero-inner"><div class="hero-content">h1, text, button</div></div>
</section>
```

- **Without the script:** `.slides` is a flex row with `overflow-x: auto` and `scroll-snap-type:
  x mandatory`, each slide `flex: 0 0 100%`; it can be swiped and scrolled.
- **With the script** (`SLIDESHOW_SCRIPT`, `assets/slideshow.js`, ~2 KB): for each `.slideshow`
  it builds the controls from `data-labels` (JSON with the site's words: pause, play, previous,
  next, "slide {n}") as real `<button>`s, scrolls the row to the current slide
  (`scrollTo({ left, behavior })`, instant under reduced motion), sets `inert` on the other
  slides, and runs a 6-second timer that stops on `pointerenter`/`focusin`, on pause, and when
  `matchMedia("(prefers-reduced-motion: reduce)")` matches (starting paused). Scrolling by hand
  updates the current slide (`scrollend`, or a debounced `scroll`).
- **Script per page:** `pageHasVideo`/`siteHasVideo` become `pageScripts`/`siteScripts` sets of
  `"video" | "slideshow"`; the head adds a tag per script, `RenderedSite.scripts` maps file names
  to contents, and the export writes each.
- **Styles:** the slides fill a 16:9 band (at least 26rem high, at most 80vh); the title sits on
  the cover hero's shade, larger; the controls sit at the bottom edge in the theme's colours;
  focus rings visible. Theme values only, no comments.
- **Strings:** `slideOf` ("{n} z {count}"), `pause`, `play`, `previousSlide`, `nextSlide`,
  `showSlide` ("Snímek {n}") in every site language.

### 4. Editor

- **Look:** `LOOKS.hero.values` gains `slideshow`; choosing it for a hero without slides adds two
  empty slides in the same transaction (`setBlockLook` learns this one case).
- **Canvas:** `Hero.svelte` in the slideshow look renders a `NodeArrayProperty` of `slides` as a
  wrapping row of `nodes/Slide.svelte` (image slot, editable title over the photo), then the
  hero's content. No timer, no scrolling.
- **Items:** `ITEM_TYPES` + `slide`, `ITEM_LISTS.slides = ["hero"]`, `ITEM_OWNERS` learns
  `slides`; `itemLimit` covers slides with a maximum of eight and no minimum (a slideshow with
  fewer than two warns instead). `imagePropertyOf` is unchanged (`image`).
- **Slide panel:** `CardPanel.svelte` becomes `LinkPanel.svelte`, shown for a card or a slide,
  titled "Card" or "Slide".
- **Inserter:** `insertHero` writes `slides: []`.

### 5. Builder and examples

`blocks.hero({ …, layout: "slideshow", slides: [{ image, title, page?, item?, url? }] })`.
Locally, Punk Film's home hero becomes a slideshow of six projects (their stills, titles and
pages), the heading under it.

## Risks / Trade-offs

- **[A second script]** → Same rules as the video script: static, no document content, only on
  pages that need it, `defer`; the page works without it.
- **[Moving content and accessibility]** → Reduced motion respected, pause on hover and focus,
  pause button first, inert hidden slides; the e2e checks these in a browser.
- **[Format bump]** Every stored document upgrades on read; the first save stores version 11. →
  Same as earlier formats; upgrade test on the version-10 fixture.
- **[Large first image]** The first slide is the page's largest image (LCP) → not lazy,
  `sizes="100vw"`; the others lazy.

## Migration Plan

Format 11 upgrade on read. Nothing changes until an owner chooses the slideshow.

## Changes made while building

- **Clips from Vimeo** (decided 2026-10-08, after building the photo slideshow): `slide` gains
  `clip_url` (`""` by default; format 11 isn't released, so no new format). `slideClip(url)` in
  `@webmio/model` accepts `https` MP4 addresses on `player.vimeo.com` (`/progressive_redirect/…`,
  `/external/…mp4`) and `*.vimeocdn.com`; anything else is an `unsupported-clip` error. The slide
  renders `<video class="slide-clip" muted playsinline preload="none" aria-hidden="true"
  data-src="…">` over its image (hidden until it plays, so the photo shows while it loads); the script sets `src` and plays only the current
  slide's clip, pauses the others, and loads none under reduced motion or `saveData`. With a
  clip, the slide advances on `ended` and
  falls back to six seconds on `error`. The Slide panel gets a clip field with a note that the
  clip loads from Vimeo when the page opens.

- **The carousel is a labelled `<section>`**, not a `<div role="region">`: html-validate prefers
  the native element, and a labelled section is a region.
- **The script ignores the scroll events of its own scrolling** until it reaches the slide it
  was going to, and a visitor's swipe, wheel or pointer cancels that: otherwise a smooth scroll
  that settled late put the slideshow back on an earlier slide (found by the e2e).
- **On the canvas** the slide titles sit above the photo slots, so they can be clicked and
  edited.
- **`setCardLink` became `setItemLink`** and `CardPanel` became `LinkPanel`, titled "Card" or
  "Slide"; `itemLimit` reads a table of limits (cards and videos 1–12, slides 0–8).
- **The slide's grid track is `minmax(0, 1fr)`** with `overflow: hidden`: otherwise the row grew
  to the photo's own height past the 80vh cap and pushed the title under the controls (seen in
  Punk Film's screenshot at 1280×800).
- **The slide titles line up with the page's content**, and the hero's heading under the slides
  has room above it.
- **The e2e drives the script on a fake clock** (`page.clock`), with `emulateMedia` for reduced
  motion.
