## ADDED Requirements

### Requirement: Item pages in What you offer
The Services and Projects lists SHALL each start with the choice "Each service has its own page" ("Each project has its own page"), off or on, and when on, the page that lists them, chosen from the language's pages other than the home page. Turning it on SHALL give every item without an address one made from its name, unique within the collection, in the same undoable step. Turning it off SHALL keep the addresses.

While the collection has a listing page, every item SHALL show its address as a field with the full path before it (`/prace/`), and a link "Open page" to its page in the preview. A service SHALL then also show its page text, edited with paragraphs, subheadings, lists, bold, italic and links. A new item's address SHALL follow its name as it is typed, until the owner changes the address.

#### Scenario: Give the practice areas pages
- **WHEN** the owner turns on "Each service has its own page" for Mareš Partners, chooses "Specializace" and saves
- **THEN** each of the eight services has an address made from its name, a page text field, and an "Open page" link to `/specializace/<address>/` in the preview

#### Scenario: Address already taken
- **WHEN** two projects are both named "Designblok" when pages are turned on
- **THEN** they get the addresses `designblok` and `designblok-2`

#### Scenario: Home page not offered
- **WHEN** the owner chooses the projects' listing page
- **THEN** the home page is not among the choices

## MODIFIED Requirements

### Requirement: What you offer section
The What you offer section (`/p/<project>/offer`) SHALL show, for one language, three lists:
- **Services:** each with its name, description and price, and when services have their own pages, its address and page text (see "Item pages in What you offer");
- **Projects:** each with its name, category, summary, text (paragraphs, subheadings, lists, bold, italic and links), facts (a label and a value each, added, moved and removed in the form), cover image, photos with their captions (added several at once, moved and removed), video address, and when projects have their own pages, its address. The list SHALL also hold the project categories: added, renamed, moved and deleted there. Deleting a category SHALL leave its projects without a category and its blocks showing all categories, in the same undoable step, after saying how many projects and blocks use it;
- **Questions:** each with its question and answer.

Each list SHALL be edited as "List forms" says, and SHALL say which pages show it (see "Where a list is shown"). The section SHALL save as "Saving settings" says.

#### Scenario: Change a price
- **WHEN** the owner changes the price of "Chléb" in What you offer and chooses Save
- **THEN** the editor opened afterwards shows the new price on every page that shows "Chléb"

#### Scenario: First question
- **WHEN** the site has no questions and the owner chooses "Add a question"
- **THEN** an empty question appears with the caret in it, and Save is enabled

#### Scenario: Add a project
- **WHEN** the owner chooses "Add a project", types "PETROF 160", picks the category "Výstavy", adds the facts "Rok: 2024" and "Klient: Národní technické muzeum", a cover and seven photos, and saves
- **THEN** the project is the last of the collection, and every block showing all projects of all categories or of "Výstavy" shows its tile

#### Scenario: Delete a category
- **WHEN** the owner deletes the category "Eventy", which 24 projects and one block use, and confirms
- **THEN** the 24 projects have no category, the block shows all categories, and one Undo brings everything back
