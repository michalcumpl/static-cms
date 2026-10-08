# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`), and every
site string to each site language. The type check and the untranslated-text test enforce this.

## 1. Model

- [ ] 1.1 The schema and types of decision 3 (`project`, `project_category`, `fact`, `projects`,
  the new site and service properties), `projects` in `COLLECTIONS`, `projectsShown` (category
  and limit), `toVersion10`, fixtures at format 10 with `demo-site-v9.json` kept. Verify with unit
  tests "Upgrade the bakery" (version 9 → 10, defaults), "One category", "Latest four", and the
  existing tests passing on the new fixtures.
- [ ] 1.2 Validation: projects and facts, categories, the projects block's category and limit,
  listing pages, item slugs only while pages are on, the video address's link safety, messages
  by position. Verify with unit tests for every site-document scenario of the delta ("A project
  with everything", "Category that doesn't exist", "Fact without a value", "Project without a
  cover", "Video that isn't https", "Negative number", "Practice areas with pages", "Two
  projects with one address", "Home page as the listing page", "Addresses don't matter without
  pages").
- [ ] 1.3 Languages: the shared-field merge for projects and categories, per-language item
  slugs and listing pages (decision 3). Verify with unit tests "Project translated to English"
  and "New project in Czech" at the merge level.
- [ ] 1.4 The builder (decision 7). Verify: its every-block site has projects with pages and
  services with pages, and validates.

## 2. Rendering and export

- [ ] 2.1 Item routes in `RenderContext`, item pages in `renderSite` and in each language's page
  map (decision 4). Verify with unit tests for the routes, "Alternates between languages" and
  "Language without a listing page".
- [ ] 2.2 The project and service page recipes with their head and menu state (decision 5).
  Verify with unit tests "Project page" and "Service page with a scope list", `html-validate` on
  both, and a snapshot of each.
- [ ] 2.3 The projects block and the links from service cards (decision 4), with styles. Verify
  with unit tests "Tiles that link", "Latest four with a link to all", "No listing page", "Card
  links to its page", "Unchanged without pages" (existing snapshots unchanged apart from the
  stylesheet), and `html-validate` on a page with every layout.
- [ ] 2.4 Export: item pages in the tree and the sitemap. Verify with the export test "Project
  pages in the sitemap" and one with 100 projects.

## 3. Admin

- [ ] 3.1 What you offer: the Projects list with `FormProject`, `FormBody`, `FormFacts`,
  `FormPhotos` and the categories (decision 6), and the services' page fields. Verify with unit
  tests for the category deletion and filling addresses, and e2e "Add a project", "Delete a
  category" and "Give the practice areas pages".
- [ ] 3.2 The listing page switch and choice, "Open page", addresses on first typing (project-page
  delta). Verify with unit tests "Address already taken" and "Home page not offered".
- [ ] 3.3 The canvas Projects block, its tiles and the block panel's category, number and "Edit
  projects"; the inserter. Verify with unit tests (one undo step each, new and duplicated blocks)
  and e2e "Category page", "Latest work on the home page" and "New project from the canvas".
- [ ] 3.4 Deleting a listing page (site-editing delta). Verify with a unit test and e2e "Delete
  the page that lists the projects".

## 4. Examples and checks

- [ ] 4.1 Rebuild Scénografie, Punk Film and Mareš Partners with projects and item pages, and
  reload them (local only, decision 7). Verify: `check.ts` reports no errors, and screenshots of a
  category page, a project page and a practice area page read well.
- [ ] 4.2 Update `docs/layouts.md` (items 4 and 15 done), `docs/roadmap.md` (`collection-pages`
  done) and `docs/tasks.md`. Run the type check, unit tests, lint and the full Playwright suite;
  verify that all pass. Record any deviations in design.md under "Changes made while building".
