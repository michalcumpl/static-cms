# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **The document is the only input to rendering.**
  - `packages/site` renders and exports, in Node and in the browser. The ZIP download runs `exportSite` in the browser.
  - The site node has `name`, `lang`, `base_url` and `theme`; pages have `title`, `slug` and `seo_description`.
  - `SCHEMA_VERSION` is 2, and `migrateSite` upgrades version 1.
- **Optional images are `node_array`s of at most one `image` node** (the hero, text with image, a person). An image node carries `src` (the media key), `alt`, `decorative`, `width` and `height`.
- **Media:**
  - WebP variants are made with sharp at upload; `usedImageFiles(doc)` lists the variant files a document needs.
  - Callers fetch the bytes: the preview route and publishing through `mediaFiles` (synchronous file reads), and the browser ZIP download through the project's media route, one file at a time.
  - `cleanupMedia` deletes the variants and originals of removed, unreferenced images. It finds references by scanning every `image` node of every stored version.
- **Editor:**
  - The settings column holds `PageSettings.svelte`, and editor operations live in `lib/editor/pages.ts` as one transaction each.
  - `locate.ts` maps a problem's node to its place, so the problems panel can select it.
  - Nothing edits the site node today: the site's name is set only when a project is created.
- **Rendering:**
  - `renderPage` writes the head: the title, the description when not empty, the stylesheet, and the canonical link when rendering is given `siteUrl`.
  - Publishing passes `siteUrl` (the site's address); the preview and the ZIP download don't.

## Goals / Non-Goals

**Goals:**
- All new settings live in the document, so they're versioned, undoable, previewed and published like everything else.
- Keep rendering pure and deterministic. The derived image files are supplied by the caller like variants.
- Keep the existing media contract ("caller supplies named files") and extend its names.

**Non-Goals:**
- Changing how the ZIP download or preview choose `siteUrl`. They still have no address, so no absolute-URL tags.
- An in-browser image pipeline: derived files are always made on the server.
- Per-language strings beyond the 404 page (Milestone 5).

## Decisions

### 1. Settings live in the document (schema version 3)

New site properties:
- `description: string`;
- `favicon: node_array<image>`;
- `share_image: node_array<image>`;
- `allow_ai_search: boolean` (default `true`);
- `allow_ai_training: boolean` (default `true`).

New page property: `share_image: node_array<image>`.

`migrateSite` becomes a chain, 1 → 2 → 3. Version 3 adds the empty and default values, and `SCHEMA_VERSION` becomes 3. Stored documents are already upgraded when read (`readSite`) and saved in the new format on the next save.

*Alternative:* project settings in the database. That would give the renderer a second input, and the settings would have no history or undo, and no preview before publishing.

### 2. Favicon and share images are image nodes, not bare media keys

A one-item `node_array<image>` reuses what already exists:
- media key validation and dimensions;
- alt text (the share image's alt becomes `og:image:alt`);
- the library chooser;
- cleanup's reference scan, which finds every image node, so derived files of a referenced image are never deleted.

Validation exempts the favicon from the alt rule: it's never shown as an image, and asking owners for a description would be noise. The favicon's image node is created with `decorative: false` and empty alt.

*Alternative:* `favicon: string` with the key. It would need its own width and height fields, and special cases in cleanup and validation.

### 3. Derived files: names, making them, keeping them

**Names**, all from the media key:
- `<key>-icon-32.png`, `<key>-icon-180.png`, `<key>-icon-512.png`;
- `<key>-share.jpg`.

`packages/site` replaces `usedImageFiles` with `usedMediaFiles(doc)`:
- images in blocks give their WebP variants, as today;
- the favicon gives the three icon names;
- the site's and each page's share image give the share name.

The walk skips the `favicon` and `share_image` properties when collecting variants. Its three callers (the preview route, publishing and the project page) switch to it, and `usedImageFiles` is removed.

**Making them.** `media.ts` gains `derivedFile(projectId, name)`, which is async. It parses the name against one allowlist pattern and looks up the image. If the file is already in the project's folder, it returns it. Otherwise it makes the file with sharp from the source and stores it with `writeAtomically`, which makes concurrent requests safe. The source is:
- the original in `originals/`;
- else the top-level file of an image from before the library;
- else the largest variant.

The processing:
- **Icons:** `resize(size, size, { fit: "contain", background })`, with a transparent background, or white for 180 (iOS shows transparency as black).
- **Share file:** `resize(1200, 630, { fit: "cover", position: "centre" })`, then JPEG at quality 82.

Both use the same `rotate()`-then-strip path as uploads, so no metadata survives.

`mediaFiles` becomes async, and handles variants and derived names alike. The preview route, publishing and the media route used by the browser ZIP download await it. The media route's name check extends to the derived pattern, and anything else stays "not found".

*Alternative:* make them at upload. That would cost every upload four extra encodes for files only a favicon or share image needs.

**Formats.** Share images are JPEG, not WebP: link-preview scrapers (Facebook, WhatsApp, LinkedIn, Slack, iMessage) all accept JPEG, while WebP support varies. The 32-pixel icon is wrapped into `favicon.ico` by export (decision 5). Browsers and crawlers still request `/favicon.ico` directly.

### 4. Head metadata is built in one place

`render/head.ts` builds the `<head>` for pages and for the 404 page. It adds, in a fixed order:
- the title and meta description, with the fallback to the site description;
- the stylesheet;
- the canonical link;
- icon links;
- Open Graph;
- Twitter;
- JSON-LD, on the home page only.

The rules for each:
- **Absolute URLs** come only from `siteUrl`, never from `base_url`, which the editor doesn't expose; export already prefers `siteUrl`.
- **Without an address,** `og:url`, `og:image` and JSON-LD are left out, and the existing `no-base-url` warning names what's missing.
- **The share image** is the page's own, else the site's default.
- **`og:title`** is the page title, or the site name on the home page; `og:site_name` carries the name anyway.
- **JSON-LD** is `JSON.stringify` of an `@graph` with `WebSite` and `Organization` linked by `@id`. `<` is replaced with `<` and the result inserted raw, so no text can close the script.
- **`og:locale` is left out:** it needs a region (`cs_CZ`) that `lang` doesn't carry.

### 5. Export adds `favicon.ico`, the icons, `robots.txt` and `404.html`

**`favicon.ico`.** A tiny ICO writer in `packages/site/src/export/ico.ts`, pure bytes so it also works in the browser. It writes a 6-byte `ICONDIR` (reserved 0, type 1, count 1), one 16-byte `ICONDIRENTRY` (32 × 32, 0 colours, 1 plane, 32 bpp, size, offset 22), and the PNG bytes. PNG-in-ICO is supported by every current browser.

**Other icons.** The 180 and 512 icons are copied to `apple-touch-icon.png` and `icon-512.png`.

**`robots.txt`**, from `export/robots.ts`:

```
User-agent: <each disallowed agent>      one group per switched-off category
Disallow: /

User-agent: *
Allow: /

Sitemap: <siteUrl>/sitemap.xml            when there is a base URL
```

The user-agent lists are two exported constants with a comment dating them. The starting lists are:
- **AI search and answers:** `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Meta-WebIndexer`, `Meta-ExternalFetcher`.
- **AI training:** `GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `Applebot-Extended`, `Meta-ExternalAgent`, `Bytespider`.

Task 3.4 checked them against each vendor's documentation on 2026-09-30 (OpenAI, Anthropic, Perplexity, Google, Apple, Common Crawl, Meta). What it found:
- Meta has two AI crawlers the first list lacked: `Meta-WebIndexer` (Meta AI search) and `Meta-ExternalFetcher` (fetches at a user's request).
- `facebookexternalhit` fetches link previews and must never be listed.
- `ChatGPT-User`, `Perplexity-User` and `Meta-ExternalFetcher` say they may ignore `robots.txt`. Anthropic says all three of its agents follow it.
- `Google-Extended` and `Applebot-Extended` are tokens, not crawlers, and blocking them doesn't affect search.
- ByteDance publishes no current documentation for `Bytespider`, which is kept on the widely used lists' word. `Disallow: /` is used even with a base path, because crawlers only read `robots.txt` at the host root anyway.

**`404.html`.** `renderSite` returns `notFound` next to `pages`, and export writes it as `404.html`. Netlify serves `/404.html` for missing paths automatically, and the preview route can serve it for unknown preview paths. All its links use `ctx.url`, which is already absolute from the base path, so it works at any depth.

### 6. Not-found wording in the site's language

`render/strings.ts` has a small table keyed by the language's primary subtag:
- `cs`: "Stránka nenalezena", "Tuto stránku jsme nenašli.", "Přejít na úvodní stránku";
- `en`: the English wording.

Any other language uses English. It's the first site-language text the renderer writes itself, and Milestone 5 can grow the table.

*Alternative:* an editable 404 page. It would need a special page kind in the document, with no slug and never in the menu. That isn't worth it yet.

### 7. Validation

New codes, all in category `site`:
- `no-description` (warning): only when neither the page nor the site has one;
- `small-share-image` (warning, under 600 pixels wide);
- `small-favicon` (warning, longer side under 180).

`too-many-items` and `missing-alt` are reused. The share image's missing-alt message says "The share image of "Kontakt" needs a description…", and the favicon is exempt. Messages follow the owners'-words rule: no IDs and no property names.

### 8. Editor: a Site tab next to Page

The settings column gets two tabs, **Page** and **Site**. The Site tab shows `SiteSettings.svelte`:
- name and description inputs, applied as the owner types, like the page title;
- favicon and default share image pickers, which open the existing `MediaLibrary` `open()`;
- the share image's description field;
- the two AI switches, each with one explanatory sentence.

`PageSettings` gains the same image picker component (`ImageSetting.svelte`) for the page's share image, with a note when the site default applies.

Editor operations go in `lib/editor/site.ts`: `setSiteName`, `setSiteDescription`, `setAiSearch`, `setAiTraining`, `setSiteImage(slot, chosen | undefined)` and `setPageShareImage`. Each is one transaction, so each is one undo step. The image operations reuse the image-node builder from `transforms.ts`.

`addPage` and `duplicatePage` include `share_image`. A duplicated page gets a deep copy of its share image node, as blocks do.

`locate.ts`:
- a node under the site's `favicon` or `share_image` locates to the Site tab and field;
- a page's `share_image` locates to that page's settings;
- `no-description` (the page node, `seo_description`) already locates to the page's description field.

*Alternative:* a modal dialog. The tab keeps the canvas visible, so renaming the site shows in the header at once, and it reuses the column's keyboard handling for undo (`data-history-keys`).

### 9. Tests

- **`packages/site`:**
  - migration 2 → 3 and 1 → 3;
  - validation codes;
  - head metadata for each rule (fallbacks, without an address, JSON-LD escaping, the home page only);
  - `usedMediaFiles`;
  - ICO bytes (header fields, and the PNG round-trips);
  - `robots.txt` for every combination of the switches;
  - `404.html` in `cs`, `de` and with a base path;
  - `html-validate` on the 404 page and a page with full metadata;
  - updated snapshots.
- **`apps/admin` unit tests:**
  - `derivedFile`: sizes, `contain` padding and the white 180 background, the share crop, no EXIF, kept on the second call, and unknown names refused;
  - media route access for derived names;
  - cleanup deletes derived files;
  - editor operations and undo;
  - `locate`.
- **e2e:**
  - set the site name, description, favicon and share image in the Site tab; the preview's head has the tags and `/favicon.ico` loads;
  - switch off AI training and publish to the fake Netlify: the deployed `robots.txt` disallows `GPTBot`, and `404.html` is deployed;
  - a missing-description problem selects the page's description field.

## Risks / Trade-offs

- **[Crawler user agents change]** → They're kept in one module with a date comment, and the README says the switches are only as good as crawlers' compliance with `robots.txt`.
- **[User-triggered fetchers may ignore `robots.txt`]** Some vendors say fetches made on a user's request (`ChatGPT-User`, `Claude-User`, `Perplexity-User`) don't follow it. → The switch's explanation says "asks AI services not to…" and doesn't promise blocking.
- **[Centre crop cuts the subject of a share image]** → Owners see the page's share image in the panel, and the roadmap keeps a focal point as later work. A specific share image per page is the workaround.
- **[Rolling back the admin after documents were saved as version 3]** The old code reports "unsupported schema version". → It's a forward-only format bump, as the version-2 one was. A rollback would need a one-off downgrade script, which isn't written unless needed.
- **[Derived files made during a publish slow the first publish]** Four small sharp encodes per image at most. → They're negligible next to the upload, and kept afterwards.
- **[The ZIP download has no address, so no share images or JSON-LD]** → The existing warning says so. Passing the published address to the ZIP download is a separate small follow-up.

## Migration Plan

1. Deploy: documents upgrade to version 3 when read. No database migration is needed; derived files appear on first use.
2. The demo site and the test fixtures are updated to version 3 in the same change.
3. Rollback: see Risks. Documents saved after the deploy need the new code.
