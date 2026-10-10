# Proposal

## Why

An imported site with a logo always gets "show the site name in the header" on, so a logo that
already spells out the name shows it twice: on marespartners.cz the header reads "MAREŠ PARTNERS
sdružení advokátů" (the logo) and "Mareš Partners" again beside it. Most small business logos
contain the name; the old site's header tells us whether it showed the name as text too.

## What Changes

- The import turns "show the site name in the header" off when the old header shows its logo
  without the site's name as visible text beside it: only an image, or a logo drawn by CSS whose
  name is in text hidden from sight (for screen readers, such as `.offscreen` or `.sr-only`).
- It stays on when the old header shows the name as text next to the logo, when no logo was
  found, or when the logo came only from structured data and the header shows no logo.
- A language imported later keeps the primary's switch (it is shared), so nothing changes there.

Not in this change: reading the name from the logo image itself (text recognition), or changing
projects imported before.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `site-import`: "Images" (the site's logo) says when the name is shown beside it.

## Impact

- `packages/import/src/site.ts`: the home page's logo element, and whether its name is visible;
  `site.logo(…, { showName })` (the builder already takes it).
- `packages/import/src/content.ts`: the hidden-element selectors, shared with the new check.
- Tests: `site.test.ts` (the bakery's image-only logo now hides the name; its snapshot), a
  CSS-drawn logo with off-screen text, a logo with the name beside it.
