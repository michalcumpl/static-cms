# Tasks

## 1. Building a site from answers (`@webmio/templates`)

- [x] 1.1 Add `SetupAnswers` and `SETUP_TYPES` (the ten types: schema.org type, Czech and English labels, suggested layouts) in `setup.ts`, exported; verify a test that every type maps to a `BUSINESS_TYPES` value and suggests only existing layouts, Home first
- [x] 1.2 Implement `siteFromSetup(answers, template, lang, sizes)` (design decision 2): business, main location with hours, services, logo, description, the ticked pages from layouts in the menu, the main photo in the hero, the other photos as a gallery on About us or Home, and empty collection blocks hidden; verify tests for "Finishing the café" (pages, services, hours, hero photo), a site with only the type and name, photos without About us going to Home, and that every result validates without errors

## 2. Storage and the flow (admin)

- [x] 2.1 Add the `project_setups` table with a Drizzle migration (numbered after the latest on `main` when implementing), and `lib/server/setup.ts` to create a project with its setup, read it, merge a step's answers with their checks, and finish it; verify `db.test.ts` lists the table and unit tests for "A wrong answer" (closing before opening, a bad phone) and merging answers step by step
- [x] 2.2 Add step 1 at `/w/[workspace]/setup` (owners only) creating the project and redirecting to step 2, and steps 2–6 at `/p/[project]/setup/[step]` with their forms (design, contact and hours, services, photos uploaded through the media API, pages), Back and Continue, "Step N of 7", redirects to the step reached and, once finished, to the Overview; Czech and English strings; verify route tests for each step's action, the redirects, and members who aren't owners being refused
- [x] 2.3 Add step 7: the preview at `/p/[project]/setup/preview/[...path]` serving `siteFromSetup` of the answers, shown in a frame, the note when the starter site was edited, and "Create my website" saving one version, finishing the setup and opening the Overview; verify "Preview without saving" and finishing with one new version and the setup closed

## 3. Ways in

- [x] 3.1 Make "Tell us about your business" the New project page's main way in, the import beside it, "Start empty" a small link; the Overview leading to an unfinished setup's next step; and "Finish setting up" on the projects page; verify route tests for the Overview redirect and the projects page data, and update the accounts e2e tests that start empty

## 4. Documentation and integration

- [x] 4.1 End-to-end test "Finishing the café": the wizard from the New project page through every step (photos uploaded from the e2e media fixtures), leaving after the contact step and coming back through "Finish setting up", the preview, and the finished site's pages, services and hours in the editor; run `pnpm turbo run typecheck test build`, Biome and the admin's end-to-end tests, and verify everything passes
- [x] 4.2 Describe the guided setup in `README.md`'s feature list if it has one and set the roadmap's "Where we are"; verify the links resolve
