# Design

## Context

- `readSite` (`packages/import/src/site.ts`) finds the logo through `homeImages`: structured
  data's logo, else the header's image (`header a img, [class*=logo] img, img[class*=logo],
  #logo img`), else a logo drawn by CSS (the last background rule whose selector names a logo).
  It calls `site.logo(image)`; the builder's `logo(image, { showName })` defaults to `true`.
- Mareš Partners' header is `<h1 class="logo"><strong class="offscreen">Mareš Partners</strong></h1>`
  with the logo as the `h1`'s background; the bakery's is `<a class="logo"><img alt="…"></a>`.
- `content.ts` has the selectors of elements that aren't shown (`[hidden]`, `aria-hidden`,
  `display: none`), not the usual visually-hidden classes.

## Goals / Non-Goals

**Goals:** the header shows the name beside the logo only when the old one did.

**Non-Goals:** reading text in the logo image; fixing projects already imported (the owner turns
the switch off in Website settings).

## Decisions

1. **Where to look: the logo's own element.** The header image's home link (`closest("a")`), or
   the image's parent when it isn't linked; for a CSS logo, the first element its rule matches.
   Text elsewhere in the header (a tagline, the menu) doesn't count.
   *Alternative:* the whole header. Rejected: menus and phone numbers would always count.
2. **Visible text** is the element's copy without images, SVGs and hidden elements: the
   `content.ts` selectors plus the usual visually-hidden classes (`offscreen`, `sr-only`,
   `visually-hidden`, `screen-reader-text`, `screenreader`, `hide-text`). Exported as one
   `HIDDEN` selector list from `content.ts` so both use it.
3. **Name or not:** the visible text contains the site's name, compared without case,
   diacritics or extra spaces ("MAREŠ PARTNERS" matches "Mareš Partners"). Any visible text that
   isn't the name (a tagline) doesn't keep the switch on.
4. **No logo element found** (structured data's logo only, nothing in the header): the switch
   stays on, as today, since we can't tell.
5. `homeImages` returns the logo element's visible text with the candidates, so `readSite` and
   the language import's home reading share it; `readSite` passes `showName` to `site.logo`.

## Risks / Trade-offs

- [A logo image without the name, the name only in its `alt`] → the name disappears from the
  header; the owner turns the switch on. The `alt` alone is what screen readers read, so the old
  site didn't show the name either.
- [The name beside the logo but outside its link] (`<a><img></a><span>Name</span>`) → read as
  not shown. Decision 1 could later look at the link's parent if real sites need it.
