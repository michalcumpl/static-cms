# Design

## Context

See proposal.md for the motivation. The current state:

- **Sites have no scripts** (site-rendering, "Output escaping"), except the JSON-LD structured
  data block; every rendered page is static HTML and one stylesheet. The export writes pages,
  `assets/style.css`, images, fonts and icons; the admin's preview serves the same tree.
- **Item blocks** (`cards`, `figures`, `steps`) hold their items in `items`; the editor's handles,
  insertion and limits work through `ITEM_LISTS`, `ITEM_TYPES`, `ITEM_OWNERS` and `cardLimit`.
  The Card panel (`CardPanel.svelte`) edits a card's link while it holds the caret.
- **Projects** store `video_url` (any `https` address) and their page renders a "Watch the
  video" button link.
- **Columns by count:** `figureColumns(count)` with a container query, shared by figures and
  cards.

## Goals / Non-Goals

**Goals:**
- No request to YouTube or Vimeo until the visitor presses play, on every browser.
- The page works without JavaScript (the poster links to the video).
- A script that is small, static and holds no document content, so it can't carry injected
  markup.

**Non-Goals:**
- Other providers, uploaded video files, autoplaying or background video, fetching titles and
  thumbnails from the providers (it would contact them at build or view time).

## Decisions

### 1. Node types and address parsing

```
videos  heading, items: node_array<video> (1–12)
video   url: string, title (text, one line), caption (text, one line),
        poster: node_array<image> (≤ 1)
```

- `videoEmbed(url)` in `@webmio/model` returns `{ provider: "youtube" | "vimeo", id, watchUrl,
  embedUrl }` or `undefined`. YouTube IDs are 11 characters of `[A-Za-z0-9_-]`; Vimeo IDs are
  digits. It accepts the address forms the spec lists and ignores other query parameters; it is
  the one place validation, rendering and the editor read addresses.
- `poster` rather than `image`: `imagePropertyOf` learns `video` → `poster`, so the image slot,
  the form image and the Image panel work as they do for a project's cover.
- New types only, so no format change.

### 2. Validation

Per page, like cards: count 1–12 (`empty-block` error / `too-many-items`), `empty-title`, and
`unsupported-video` (new code) for an empty or unrecognised address, naming "Video 2 on Filmy".
`checkProject` adds a `video-as-link` warning (new code) when `video_url` is set but
`videoEmbed` doesn't recognise it.

### 3. Rendering

```html
<section class="block videos">
  <div class="container">
    <h2>Filmy</h2>
    <ul class="video-list card-columns-3">
      <li>
        <figure class="video" data-embed="https://www.youtube-nocookie.com/embed/ID?autoplay=1"
                data-title="Medvídku, vypravuj!">
          <a class="video-play" href="https://www.youtube.com/watch?v=ID">
            <img class="video-poster" … loading="lazy">   <!-- or <span class="video-title"> -->
            <span class="video-label">Přehrát: Medvídku, vypravuj!</span>
          </a>
          <figcaption>…caption…<span class="video-source">Přehraje se z YouTube</span></figcaption>
        </figure>
      </li>
    </ul>
  </div>
</section>
```

- The play symbol is CSS (a circle in the primary colour with a triangle made with `clip-path`),
  so no icon file or provider asset is needed; `.video-label` is visually hidden but names the
  link.
- **The script** (`VIDEO_SCRIPT` in `@webmio/render`, ~1 KB): on `click` of `.video-play`
  (delegated from `document`), `preventDefault`, build an `<iframe>` from the figure's
  `data-embed` and `data-title` (set as properties, never as HTML), with `allow="autoplay;
  fullscreen; picture-in-picture"`, `allowfullscreen`, `referrerpolicy="strict-origin-when-cross-origin"`,
  and replace the link. Keyboard activation works because it's a link.
- **Which pages load it:** `renderPage` and the project page add `<script
  src="…/assets/video.js" defer>` in `<head>` when they render a video; `RenderedSite` gains
  `script?: string` (the file's text) when any page needs it, and the export writes it.
- **Project trailer:** the project page uses the same `videoFigure()` with the cover as poster;
  an unrecognised address keeps the "Watch the video" button.
- Styles from theme values only, `aspect-ratio: 16 / 9`, the iframe filling the figure's frame.

### 4. Editor

- **Canvas:** `nodes/Videos.svelte` and `nodes/Video.svelte` (the poster slot or the title panel,
  the play symbol, title and caption as text properties); no iframe on the canvas.
- **Items:** `ITEM_TYPES` + `video`, `ITEM_LISTS.items` + `videos`, `ITEM_OWNERS` + `videos`, and
  the limits generalised: `cardLimit` becomes `itemLimit(session, id)` for cards and videos
  (1–12).
- **Inserter:** `insertVideos` (empty heading, one empty video, caret in its title); picker
  drawing: a 16:9 frame with a play circle.
- **Video panel** (`VideoPanel.svelte`, beside the Card panel): an address field applied on
  change or Enter through `setVideoUrl`, refusing what `videoEmbed` doesn't recognise, showing
  "YouTube video wNdrFte2T4w" with a link to the watch page.
- **Preview:** the preview route serves `assets/video.js` from the export like the stylesheet.

### 5. Builder and examples

`blocks.videos({ heading?, items: { url, title, caption?, poster? }[] })`. Locally: Aniděti's
"Filmy" page lists its films (the three documentaries and "Demokracie mýma očima") as videos;
Punk Film's project pages get players from their stored addresses.

## Risks / Trade-offs

- **[The first script on sites]** → One static file, no document content, loaded only where a
  video is, `defer`; without it the site still works. The Output escaping requirement names the
  exception precisely.
- **[Provider address formats change]** → `videoEmbed` is the single parser, with tests per form.
- **[Lighthouse]** The script is tiny and deferred; no provider request before play, so the
  player's weight doesn't count.
- **[Posters are optional]** Without one the frame shows the title; the providers' thumbnails
  aren't used, since fetching them would contact the provider.

## Migration Plan

None: new node types only. Project pages with YouTube or Vimeo addresses change from a button to
a player at the next publish.

## Changes made while building

- **The trailer takes the cover's place** at the top of a project page (the cover as its poster,
  not lazy) instead of coming after the photos: at the end it repeated the cover. The
  site-rendering delta says so.
- **The script is tested against a small fake DOM** in the unit test (the repository has no DOM
  library), and in a real browser by the e2e "Press play", which also checks that no request goes
  to YouTube before play (the player itself is intercepted, so the test stays offline).
- **`cardLimit` became `itemLimit`** for cards and videos, with "Videos" reasons in the handle
  menu.
- **The caption and "Plays from YouTube"** stack instead of sharing a line.
- **The preview** serves `.js` files (`text/javascript`).
- **The picker test** counts seventeen blocks.
