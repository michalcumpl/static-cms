# Tasks

## 1. Document format 3 in `packages/site`

- [x] 1.1 Add the site properties `description`, `favicon`, `share_image`, `allow_ai_search` and `allow_ai_training`, and the page property `share_image`, to the schema and types; set `SCHEMA_VERSION` to 3 and chain `migrateSite` 1 → 2 → 3 (design.md decision 1). Verify with unit tests for "Upgrade a version-2 site", "Upgrade a two-page site" (now reaching version 3), "Already upgraded", and "Unsupported schema version" (a version-2 document validated without upgrading).
- [x] 1.2 Update the test fixtures, snapshots' source documents, the demo site and the e2e fixture documents to version 3. Verify that `pnpm --filter @static-cms/site test` passes, and that the admin's stored-document tests still upgrade older versions.
- [x] 1.3 Add validation (decision 7): at most one favicon and one share image, the favicon's exemption from the alt rule, the share image's missing-alt message, `small-share-image`, `small-favicon` and `no-description`. Verify with unit tests for "Two favicons", "Two share images", "Favicon without description", "Share image without description", "Small share image", "Small favicon", "No description anywhere" and "Site description as fallback", and extend the owners'-words test with the new messages.

## 2. Rendering in `packages/site`

- [x] 2.1 Replace `usedImageFiles` with `usedMediaFiles` (decision 3). Verify with unit tests for "Files of the demo site", "Favicon and share image", and that images in blocks still give their variants.
- [x] 2.2 Move the head into `render/head.ts`, and add the description fallback, Open Graph and Twitter tags, and favicon links (decision 4). Verify with unit tests for "Site description as fallback", "Page description wins", "Page with the site's share image", "Page's own share image", "No site address", "Site with a favicon" and "Site without a favicon", and with `html-validate` on a page with full metadata.
- [x] 2.3 Add the JSON-LD `WebSite` and `Organization` on the home page (decision 4). Verify with unit tests for "Home page structured data", "Script-ending text in the name" and "Other pages", and a test that the JSON parses back to the expected graph.
- [x] 2.4 Add the not-found page and `render/strings.ts` (decisions 5 and 6), returned as `notFound` by `renderSite`. Verify with unit tests for "Czech site" and "Other language", links under a base path, no canonical or share tags, and `html-validate`.

## 3. Export in `packages/site`

- [x] 3.1 Write the ICO writer (`export/ico.ts`). Verify with a unit test of the header and directory fields, and that the embedded bytes equal the PNG.
- [x] 3.2 Place media in export (decision 5): share files under `assets/images/`, and the favicon as `favicon.ico`, `apple-touch-icon.png` and `icon-512.png`. Verify with unit tests for "Favicon files", "Share file", "Missing media" (for a missing icon file) and "Unused media".
- [x] 3.3 Write `404.html`, and leave it out of the sitemap; extend the `no-base-url` warning's message. Verify with unit tests for the "Two-page site" layout and "Sitemap with base URL", and that the export snapshot is unchanged apart from the new files.
- [x] 3.4 Write `robots.txt` from `export/robots.ts`. First check each vendor's current crawler documentation (OpenAI, Anthropic, Perplexity, Google, Apple, Common Crawl, Meta, ByteDance) and correct the two user-agent lists in design.md decision 5 where they differ, dating the lists in a comment. Verify with unit tests for "Everything allowed", "No AI training", AI search off, both off, and "No base URL".

## 4. Media on the server

- [x] 4.1 Implement `derivedFile` in `media.ts` (decision 3): name parsing, the source (original, pre-library file, or largest variant), `contain` icons with transparent or white padding, the `cover` share JPEG, metadata stripped, and files kept for reuse. Make `mediaFiles` async over variants and derived names. Verify with unit tests for "Share file of a portrait photo", "Icons of a small logo", "Icons of a wide logo", "Made once" and "Unknown derived name", and a pre-library image as the source.
- [x] 4.2 Switch the preview route, publishing and the project page's media route and ZIP download to `usedMediaFiles` and the async `mediaFiles`; serve `404.html` for unknown preview paths. Verify with the existing preview, publishing and ZIP tests updated, and a route test that a derived file is served to members and "not found" to others.
- [x] 4.3 Extend `cleanupMedia` to delete derived files. Verify with the unit test "Cleanup of a removed favicon", and that a referenced image's derived files remain.

## 5. Editor

- [x] 5.1 Add editor operations in `lib/editor/site.ts` (decision 8), and include `share_image` in `addPage` and `duplicatePage`. Verify with unit tests: each operation is one undo step, choosing and removing images, and a duplicated page's share image being a deep copy.
- [x] 5.2 Add the Page and Site tabs, `SiteSettings.svelte` and `ImageSetting.svelte`, and the share image in `PageSettings.svelte`. Verify with component or e2e tests for "Rename the site", "Choose a favicon", "Switch off AI training", "Choose a share image" and "Undo removing the share image".
- [x] 5.3 Extend `locate.ts` for the site's favicon and share image and pages' share images, so the problems panel opens the right tab and field. Verify with unit tests for locating each, and an e2e test for "Missing description problem".

## 6. End to end and docs

- [x] 6.1 e2e: set the site name, description, favicon and share image; the preview page's head has the description, `og:*` and icon links, and the preview serves `favicon.ico`. Then switch off AI training and publish to the fake Netlify: the deployed `robots.txt` disallows `GPTBot`, `404.html` is deployed, and the home page has JSON-LD with the netlify.app address.
- [x] 6.2 Update the README (`robots.txt` and the AI switches, and what they can't enforce) and the roadmap (Milestone 3: SEO settings, favicon and site metadata done; `LocalBusiness` with the business blocks). Verify by reading both.
- [x] 6.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [x] 6.4 Manual check by the owner after publishing a real site: paste a page's link into WhatsApp or Messenger and check the preview (title, description, image), check the favicon in a browser tab, and open a missing address to see the 404 page. Record the outcome in design.md.
