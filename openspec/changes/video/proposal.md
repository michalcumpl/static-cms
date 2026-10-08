# Proposal

## Why

Video is central to two of the seven examples: Aniděti's children make films (20+ on YouTube),
and every Punk Film project has a trailer on Vimeo. Today they are text links, and a project page
shows "Watch the video" that leaves the site. Embedding YouTube or Vimeo the usual way loads the
provider's player, scripts and cookies with every page view, which breaks the privacy promise and
the Lighthouse 100 goal. The Creative production template needs inline video that loads only
when a visitor asks for it (`docs/layouts.md`, item 8; `docs/roadmap.md`, row 6h).

## What Changes

- **A videos block:** an optional heading and one to twelve videos. Each video has a YouTube or
  Vimeo address, a title, an optional caption, and an optional poster image from the media
  library. One video fills the width; several sit in columns by number, as cards do.
- **Click to play:** a video shows its poster (or, without one, its title on the theme's
  secondary colour) with a play button. Nothing is requested from YouTube or Vimeo until the
  visitor presses play; then the player loads in place, from `youtube-nocookie.com` or Vimeo
  with "do not track", and starts. A short note under it says where it plays from. Without
  JavaScript the poster is a link to the video on YouTube or Vimeo.
- **One small script:** pages with a video load `assets/video.js` (no inline code), which swaps
  the poster for the player. **This changes the rule that sites have no scripts:** the only script
  allowed is this file, and only on pages with a video (decided 2026-10-08).
- **Project trailers:** a project whose video address is on YouTube or Vimeo shows the same
  player on its page, with the project's cover as the poster; any other address stays a link.
- **Validation:** a video's address must be a YouTube or Vimeo video address, and it needs a
  title; a project's video address elsewhere is a warning (it shows as a link).
- **In the editor:** the block picker offers Videos (one empty video). Videos are added, moved,
  duplicated and deleted as cards are; the poster uses the usual image slot; a Video panel sets
  the address and says whether it is recognised.
- **The builder** writes videos, and the local examples use them: Aniděti's films page and
  Punk Film's trailers (already stored as video addresses).

No document format change: only new node types.

Not in this change: other providers, self-hosted video files, background video in the hero
(with `hero-slideshow`), playlists, and fetching titles from the providers. (Their pictures are fetched once by our server, to
become posters in the media library.)

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: the videos block, its videos and the accepted addresses; the project's video
  address warning.
- `site-rendering`: the videos block and click-to-play, the script rule in "Output escaping",
  and the project page's trailer in "Item page rendering".
- `site-export`: `assets/video.js` in the file tree when a page has a video.
- `site-editing`: inserting videos, their items and the Video panel; the block list in "Block
  structure".

## Impact

- **Model:** schema and types (`videos`, `video`), a `videoEmbed(url)` parser (YouTube and Vimeo
  IDs), validation, the builder.
- **Render:** the videos block and the shared player markup, the project page's trailer, the
  script file and its inclusion, styles, html-validate.
- **Export:** writing `assets/video.js`.
- **Admin:** canvas components, inserter and picker drawing, item handles, the Video panel, texts
  in both languages; the preview serving the script.
- **Tests:** model (address parsing), render, export, editor unit tests and e2e (including that
  nothing is requested from the providers before play).
- **Local examples** (not committed): Aniděti and Punk Film rebuilt.
