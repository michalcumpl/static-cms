# Proposal

## Why

Film and creative agencies open their site with their latest work: Punk Film's home page is a
full-screen slideshow, one still per project with its title and a link to it. For the Creative
production template it is the signature of the site (`docs/strategy.md`, "Templates";
`docs/layouts.md`, item 17), and the example now opens with a single full-photo hero instead
(`docs/roadmap.md`, row 6i).

## What Changes

- **A third hero look, "Slideshow":** the hero shows two to eight slides, one at a time, full
  width. Each slide has a photo, a title and an optional link: to a page, to a project or
  service with its own page, or to an address, like a card. The hero's heading stays the page's
  `<h1>` and shows with its text and button under the slides.
- **Accessible by design:** the slides advance every six seconds, stop while the pointer or focus
  is on them, and never move for visitors who ask for reduced motion. There are pause and
  play, previous and next controls, and the slides are announced as "Slide 2 of 5".
- **Short clips from Vimeo** (decided 2026-10-08): a slide can also have a clip, the address of
  a Vimeo MP4 file (as Punk Film uses today). The clip plays muted and looping over the slide's
  photo while that slide shows; it loads only for the visible slide, never without the script,
  never under reduced motion or the visitor's data saver. **Trade-off, chosen knowingly:** a
  visitor's browser then fetches the clip from Vimeo as the page opens, so these sites contact
  Vimeo without a click, unlike the videos block; and Vimeo's direct MP4 links need a paid Vimeo
  plan and can stop working (the photo then shows).
- **Works without JavaScript:** the slides form a row that can be swiped or scrolled; a small
  script, `assets/slideshow.js`, only on pages with a slideshow, adds the movement and the
  controls. Only the first photo loads up front.
- **Document format 11:** the hero gains its list of slides, empty for existing heroes, so
  nothing changes until an owner chooses the slideshow.
- **Validation:** a slideshow needs two to eight slides, each with a photo and a title; with
  fewer it shows as "Full photo", with a warning. Links are checked as cards' are.
- **In the editor:** the hero's Look offers "Slideshow". The canvas shows the slides side by side
  (no movement while editing) with their photos in the usual image slots and their titles
  editable; slides are added, moved, duplicated and deleted as cards are; a Slide panel sets
  each slide's link.
- **The builder** writes slides, and the local Punk Film example opens with its six latest
  projects.

Not in this change: clips uploaded to the media library or from YouTube, transitions other than
sliding, and slideshows outside the hero.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: the hero's slides and its `slideshow` look, format 11 and the upgrade from
  version 10.
- `site-rendering`: the slideshow and its controls, and the script rule in "Output escaping".
- `site-export`: `assets/slideshow.js` in the file tree when a page has a slideshow.
- `site-editing`: the hero's "Slideshow" look, slides on the canvas and the Slide panel.

## Impact

- **Model:** schema and types (`slides` on the hero, `slide`), `toVersion11`, fixtures at format
  11 with `demo-site-v10.json` kept, validation, the builder.
- **Render:** the slideshow markup, `SLIDESHOW_SCRIPT`, scripts per page generalised from the video
  script, styles, html-validate.
- **Export:** writing `assets/slideshow.js`.
- **Admin:** the hero canvas component, slide items and limits, the Slide panel (sharing the Card
  panel's link choices), the look, texts in both languages.
- **Tests:** model, render, export, editor unit tests and e2e (including reduced motion and the
  controls in a browser).
- **Local example** (not committed): Punk Film rebuilt.
