# Tasks

Open questions and loose ends that don't belong to a change yet. Everything with a change name
(and its status) is in [`roadmap.md`](roadmap.md); decisions are listed there too. When an item
here becomes a change, move it to the roadmap and delete it here.

## To confirm

- [ ] **Slogan:** "Small business web. Solved!" as the lead (see [`strategy.md`](strategy.md));
  write the Czech versions.

## Loose ends

- [ ] **Translate validation messages:** problem messages are English in both interface
  languages. Decide whether `@webmio/model` returns message keys or the admin maps codes to text.
- [ ] **AVIF** next to WebP: measure the size gain on the example sites before adding a format.
- [ ] **Clips without Vimeo:** hero slideshow clips uploaded to the media library, so pages
  don't contact Vimeo on open. Needs video processing (size limits, transcoding) on our side.
- [ ] **Checking connected domains on their own:** the free address stops redirecting to a broken
  domain only when the domain is checked, which happens when its Domain page is opened.
  `scheduled-jobs` or `website-health` could check every ready domain regularly.
- [ ] **Other Punk Film trailers:** only The Last Race has a trailer address in the local
  example; collect the others' from their site.

## Research

- [ ] **ChatGPT sites:** how OpenAI's website creation works; where it overlaps the guided setup
  and the AI plans, and what it can't do (hosting, domains, health, keeping a site maintained).
- [ ] **Competitors:** check the notes in the strategy (Publii themes, Decap Turbo, CloudCannon
  pricing) again before the beta.
