# Tasks

## 1. Groundwork in the model and the admin

- [x] 1.1 Add a backslash escape (`\*`, `\[`, `\]`, `\\`) to the inline text syntax in `packages/model/src/block-nodes.ts`, and verify builder tests for literal asterisks and brackets while the example sites' documents (`load-site.test.ts`) stay unchanged
- [x] 1.2 Split `loadSite` into `readFolder` and a shared `createSiteProject(db, workspaceId, userId, site, { allowSiteProblems })` taking documents and in-memory files (design decision 8); verify `load-site.test.ts` passes unchanged and a new test that `allowSiteProblems` keeps a document with a missing-alt error but still refuses a structural problem, leaving no project behind
- [x] 1.3 Add the `imports` and `page_origins` tables to `db/schema.ts` with a Drizzle migration (`drizzle/0002_…`), and verify `db.test.ts` opens a fresh and an existing database with both tables

## 2. `@webmio/import`: package and fixtures

- [x] 2.1 Scaffold `packages/import` (depends on `@webmio/model`, `@webmio/templates`, `cheerio`, `css-tree`; pinned in the catalog), with a `boundaries.test.ts` allowing those and no Node modules; verify `pnpm --filter @webmio/import build` and the boundary test pass
- [x] 2.2 Write the invented fixture sites in `packages/import/fixtures/`: a Czech bakery (JSON-LD LocalBusiness with hours, a grouped menu, lazy and `srcset` images, a CSS background photo, an SVG logo, `<details>`, a form, a hidden email, a YouTube embed, a logo row, a gallery), a one-page English studio, and a script-built page; verify each parses with cheerio in a smoke test

## 3. `@webmio/import`: crawling helpers

- [x] 3.1 Implement `robotsRules(text)` (rules for `*`, longest match, `Allow` over `Disallow`) and verify tests for "Disallowed by robots.txt" and a missing file
- [x] 3.2 Implement `menuLinks(html, base)` (navigation order, one level of groups, same host or `www.` twin, normalised addresses, social links set apart) and `sitemapLinks(xml)` (with one level of index), and verify tests on the bakery's menu and a sitemap index
- [x] 3.3 Implement `looksBuiltByScript(html)` and verify the script-built fixture is detected and the bakery's pages are not

## 4. `@webmio/import`: reading a site

- [x] 4.1 Implement HTML-to-inline-text conversion (bold, italic, links, internal links as `page:slug`, escaping) and verify unit tests including a literal `*` and `[`
- [x] 4.2 Implement the content area and the block walk (text blocks split at main headings, heading levels ranked without skips, text with image, gallery, logos, videos, questions; forms and other embeds reported) and verify the spec scenarios "A text page", "Questions" and "A contact form" on the bakery fixture
- [x] 4.3 Implement pages and menu (titles, home titled from the Home layout's name, slugs unique, menu order and groups, old paths) and verify "Bakery pages" and "Grouped menu"
- [x] 4.4 Implement business details (JSON-LD and `@graph`, microdata, `tel:`/`mailto:` with percent-decoding, `+420` for Czech numbers, hours from structured data, social profiles, hidden emails reported) and verify "Structured data" and "Hidden email"
- [x] 4.5 Implement image references (`src`, `srcset`, lazy attributes, CSS backgrounds, best candidates up to 1600 w, size-suffix variants, alt texts, logo and favicon) and verify "Lazy image" and the logo's and favicon's references on the bakery
- [x] 4.6 Implement the guessed theme (weighted colours, catalogue fonts by name or generic family, contrast adjustment) and verify "Unknown brand font" and "Low-contrast brand colour", and that every guessed theme passes `validateSite`'s contrast checks
- [x] 4.7 Implement language detection (primary subtag, fallback, other languages reported) and verify "Czech site with English pages"
- [x] 4.8 Assemble `readSite(pages, options)` with `siteBuilder` (home hero, Standard template) returning the document, image references, origins and report; verify that each fixture gives a document without structural problems whose only site-rule errors are images without descriptions, and snapshot the bakery's report

## 5. Admin: fetching and the job

- [x] 5.1 Implement `safeFetch` (schemes, ports, checked `lookup` for every address form, manual redirects up to 5, decoded size limits, timeouts, browser headers, test-only `allowHosts`) and verify tests against a local server for: redirect to `169.254.169.254`, a name resolving to `10.0.0.5` (stubbed resolver), IPv4-mapped IPv6, too many redirects, an oversized gzip body, a slow response
- [x] 5.2 Implement the crawl (robots.txt, home, menu then sitemap until 20 pages, stylesheets, two at a time, the 5-minute deadline, reasons for everything left out) and verify "Menu first, then the sitemap", "Built in the browser" and "Site down" against the fixture server
- [x] 5.3 Implement image fetching (candidates in order, SHA-256 de-duplication, SVG to PNG for logo and favicon only, at most 100, failures reported) and verify "One photo on two pages" and "SVG logo"
- [x] 5.4 Implement the job (`startImport` with its refusals, progress updates, `createSiteProject` with `allowSiteProblems`, `page_origins` rows, `done`/`failed` with no leftovers, interrupted imports failed in `getDb`) and verify tests for "Done", a failure leaving no project, version or media file, and an interrupted import
- [x] 5.5 Add `GET /api/imports/[id]` for the import's owner (others get "not found") and verify a route test

## 6. Admin: publishing redirects

- [x] 6.1 Make `redirectsFrom` take the language's `page_origins` (pages still existing, paths not already page addresses, no queries) and pass them from `publish.ts`; verify the spec scenarios "Imported page" and "Imported page deleted" and that a `?page_id=` origin is skipped

## 7. Admin: interface

- [x] 7.1 Turn the New website page into two choices, "Start empty" and "Start from your current website" (address, confirmation, errors from `startImport`), with Czech and English strings, and verify "New project", "No confirmation" and "Not a web address" in an end-to-end test
- [x] 7.2 Add the progress page (`routes/w/[workspace]/imports/[id]`) that polls the import and opens the review when done, or shows the failure, and verify it end to end against the fixture server, including leaving and coming back
- [x] 7.3 Add the import review (`routes/p/[project]/(panel)/import`): counts, pages with old and new addresses, what was left out page by page, problems leading to their fields, links to the editor and sections, Dismiss; verify "Review after the import" and "Dismissed" end to end
- [x] 7.4 Link the review from the Overview until dismissed, and verify "Imported project" and that a project not made by an import shows no link

## 8. Admin command

- [x] 8.1 Add `import-site <workspace> <address>` to the admin commands, printing progress, counts, what was left out and the project's address, and verify an admin-commands test against the fixture server

## 9. Documentation and integration

- [x] 9.1 Update `docs/import-mapping.md` (which rules v1 does, and where in `@webmio/import`), add the package to `README.md`, and verify the links resolve
- [x] 9.2 Run the import by hand on the seven example sites with the admin command, note in `docs/import-mapping.md` what each produced and what it missed, and turn every wrong result that a v1 rule should handle into a fixture test
- [x] 9.3 Run `pnpm turbo run typecheck test build`, Biome, and the admin's end-to-end tests, and verify everything passes
