# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`). The type
check and the untranslated-text test enforce this.

## 1. Forms on Svedit

- [ ] 1.1 Spike (design risk 1): `createConfig(view)` and the `view` option of `EditorState`
  (decision 2), `FormSite` and `FormService`, and the `offer` route with the services list only.
  Verify by hand and with one e2e test that typing a name, Undo, Save and a reload work, then
  record anything Svedit needed in a new design decision 9 before going on.
- [ ] 1.2 `collectionView` and `pagesShowing` in `collections.ts` (decisions 3 and 5), with
  `otherPagesShowing` built on the same walk. Verify with unit tests: add, move, duplicate and
  delete through a collection view leave blocks showing chosen items unchanged (except delete),
  and `pagesShowing` finds pages through both block modes.
- [ ] 1.3 The item actions and "Add" buttons, the delete dialog with "Shown on N pages", and the
  "Shown on" line with its editor links (decisions 3 and 5). Verify with the e2e scenarios "Move
  a service", "Delete a highlighted service", "First question" and "Services on two pages".
- [ ] 1.4 The formatting toolbar and shared shortcuts (`useEditorKeys`), and `LinkDialog` in the
  section (decision 4). Verify with "Bold in an answer" and a link added in a service
  description, and that the editor's shortcuts still pass their e2e tests.

## 2. Sections

- [ ] 2.1 What you offer complete: `FormQuestion`, and the questions list. Verify with "Change a
  price" and "Questions on no page".
- [ ] 2.2 About you: the `about` route, `FormPerson` and `FormTestimonial`, and item images
  through `ImageSetting` (decision 6). Verify with "Add a person with a portrait" and "Duplicate
  a person".
- [ ] 2.3 Other languages (decision 8): disabled actions with the reason, locked images and the
  link to the primary language. Verify with "Translate a service".

## 3. Panel and problems

- [ ] 3.1 The section bar entries, the dashboard's two cards linking to the sections, and the
  `Overview` requirement's wording in the page (decision 1). Verify with "Offer card", "Keep the
  language between sections" (English Business, then What you offer) and "Not a member" for
  `/offer`.
- [ ] 3.2 Item problems (decision 7): `settingsTarget` and `settingsFieldId` for items,
  `problemHref`, the caret placed by `?focus=`, and the model's `ITEM_HOMES`. Verify with
  `locate.test.ts` and `page.server.test.ts` cases, the model's message test ("edit it in What
  you offer"), and the e2e scenarios "Go to an item's problem" and "An item's problem leads to
  its field".

## 4. Integration

- [ ] 4.1 Run the type check, unit tests, lint and the full Playwright suite; look at
  screenshots of both sections at desktop and phone width. Verify that all pass.
- [ ] 4.2 Update `apps/admin/README.md` (routes) and `docs/roadmap.md` (milestone B:
  `offer-and-about` done, and the archived `control-panel` link). Verify by reading.
