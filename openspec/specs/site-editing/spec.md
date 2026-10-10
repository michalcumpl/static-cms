# site-editing Specification

## Purpose

Lets a site owner edit their website directly on the page in the browser (text, formatting, links, blocks and image descriptions) while the result stays a valid site document that renders to the published site.

## Requirements

### Requirement: Editor per page
The editor SHALL be available per project, at `/p/<project>/edit/<page-id>/` for every page, to signed-in members of the project's workspace. `/p/<project>/edit/` SHALL open the home page. The editor's address for a page SHALL NOT change when the page's title or slug changes, or when it becomes or stops being the home page. It SHALL show the page's navigation and blocks laid out and styled like the published page, using the site's stylesheet. An address naming a page that isn't in the site SHALL show a not-found page.

#### Scenario: Open the home page
- **WHEN** a member opens `/p/<project>/edit/`
- **THEN** the home page's blocks are shown in edit mode with the site's theme applied

#### Scenario: Open a page by ID
- **WHEN** a member opens `/p/<project>/edit/<id of the Kontakt page>/`
- **THEN** the Kontakt page is shown in edit mode

#### Scenario: Unknown page
- **WHEN** a member opens `/p/<project>/edit/does-not-exist/`
- **THEN** a not-found page is shown

#### Scenario: Address survives a slug change
- **WHEN** the owner is editing the Kontakt page and changes its slug
- **THEN** the editor stays on the Kontakt page at the same address

#### Scenario: Someone else's project
- **WHEN** a signed-in person who isn't a member of the project's workspace opens its editor
- **THEN** a not-found page is shown

### Requirement: Page switching
The editor SHALL show a sidebar with two sections: "Menu", listing the site's navigation items in menu order (pages and external links), and "Not in menu", listing the pages that have no navigation item. The home page SHALL be marked as home. Choosing a page in either section SHALL switch the canvas to it. The sidebar SHALL reflect the current document, including unsaved changes. Switching pages SHALL keep unsaved edits made on other pages, and saving SHALL save the whole site.

#### Scenario: Edits survive switching pages
- **WHEN** the owner edits the home page hero, switches to the `kontakt` page, and switches back without saving
- **THEN** the hero edit is still shown and still unsaved

#### Scenario: Page outside the menu
- **WHEN** a site has a page "Děkujeme" with no navigation item
- **THEN** the sidebar lists it under "Not in menu", and choosing it opens it on the canvas

#### Scenario: Renamed page in the sidebar
- **WHEN** the owner changes a page's title without saving
- **THEN** the sidebar shows the new title

### Requirement: Text editing in place
The owner SHALL be able to edit every visible text of the page in place: the hero heading, text and call-to-action label; paragraphs, subheadings and list items; the services heading and each service's name, description and price; the call to action's heading, text and button labels; each testimonial's quote, name and detail; and the navigation labels. Pressing Enter in a paragraph or list item SHALL split it into two; single-line texts (headings, labels, names, prices) SHALL NOT accept line breaks.

#### Scenario: Edit a heading
- **WHEN** the owner types in the hero heading
- **THEN** the heading shows the new text and the document's hero heading contains it

#### Scenario: Split a list item
- **WHEN** the caret is in the middle of a list item and the owner presses Enter
- **THEN** the list has one more item, holding the text after the caret

### Requirement: Inline formatting
The owner SHALL be able to make selected text bold or italic, and remove that formatting again, wherever the document allows those marks.

#### Scenario: Make text bold
- **WHEN** the owner selects a word in a paragraph and applies bold
- **THEN** the word is shown bold and the paragraph has a bold mark over that word

### Requirement: Links
The owner SHALL be able to turn selected text into a link to a page of the site, or to an external address. External addresses SHALL be accepted only when they are http(s), mailto or tel URLs; anything else SHALL be refused in the link dialog with an explanation. Links to pages SHALL be stored by page ID. While editing, links SHALL NOT navigate when clicked.

#### Scenario: Link to a page
- **WHEN** the owner selects "stránce Kontakt" and links it to the Kontakt page
- **THEN** the text is marked as an internal link to that page's ID

#### Scenario: Unsafe address refused
- **WHEN** the owner enters `javascript:alert(1)` as a link address
- **THEN** the link is not created and the dialog explains which addresses are allowed

### Requirement: Block structure
The owner SHALL be able to insert, delete, duplicate and reorder the blocks of a page. A block SHALL be inserted at a place the owner chose on the canvas: between two blocks, above the first, after the last, above or below a given block, or on an empty page. The left column SHALL NOT offer inserting blocks. Inserting SHALL offer hero, rich text, services, text with image, gallery, team, partner logos, contact, opening hours, call to action, testimonials, questions, key figures, steps, projects, cards, videos and jobs blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero, and no block SHALL be offered above an existing hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them. A new contact block SHALL start with every switch on, and a new contact or opening hours block SHALL start with a placeholder heading. A new call to action SHALL start with a placeholder heading, an empty text and one button to the home page labelled "Tlačítko". A new testimonials block SHALL start with a placeholder heading and one empty testimonial. A new key figures block SHALL start with an empty heading and three empty figures; a new steps block with a placeholder heading and three empty steps. A new projects block SHALL show every project of every category. A new cards block SHALL start with an empty heading, the look `below`, and three cards with empty titles and no images or links. A new videos block SHALL start with an empty heading and one video with an empty address and title. A new jobs block SHALL start with a placeholder heading, an empty note and one job with an empty title and no description or contact.

Duplicating a block SHALL insert a copy right after it, with everything it contains (texts with their marks, items, images with their descriptions, buttons and their targets) under new node IDs, and select the copy. It SHALL be one undoable step. A hero SHALL NOT be duplicated.

#### Scenario: Insert a services block
- **WHEN** the owner inserts a services block after the hero
- **THEN** a services block with a heading and one service item appears after the hero

#### Scenario: Hero only at the top
- **WHEN** the owner opens the inserter below the first block
- **THEN** the hero is not offered

#### Scenario: Reorder blocks
- **WHEN** the owner moves the rich text block above the services block
- **THEN** the page and the document show the new order

#### Scenario: Insert a text with image block
- **WHEN** the owner inserts a text with image block
- **THEN** a block with a placeholder heading, an empty paragraph and an "Add image" button appears

#### Scenario: Insert a contact block
- **WHEN** the owner inserts a contact block on a site whose business has a phone
- **THEN** a block with a placeholder heading appears, showing the phone

#### Scenario: Insert a call to action
- **WHEN** the owner inserts a call to action
- **THEN** a block with a placeholder heading and a button "Tlačítko" appears, and the button links to the home page

#### Scenario: Nothing above the hero
- **WHEN** the owner chooses a place above a page's hero
- **THEN** no block can be inserted there

#### Scenario: Insert at a chosen place
- **WHEN** the caret is in the hero, and the owner chooses "+ Add block" between the services and the text block and picks a gallery
- **THEN** the gallery is inserted between the services and the text block, not after the hero

#### Scenario: Duplicate a services block
- **WHEN** the owner duplicates a services block with three services, one description with a bold word
- **THEN** a second services block with the same heading, the same three services and the bold word appears right after it, selected, and none of its nodes share an ID with the original
- **AND** one undo removes the copy

#### Scenario: Edit the copy only
- **WHEN** the owner duplicates a text with image block and changes the copy's heading
- **THEN** the original's heading is unchanged

#### Scenario: Hero is not duplicated
- **WHEN** the hero is selected
- **THEN** duplicating it is not available

#### Scenario: Insert key figures
- **WHEN** the owner inserts a key figures block after the hero
- **THEN** a block with three empty figures appears, with the caret in the first figure's value

#### Scenario: Insert cards
- **WHEN** the owner inserts a cards block after the hero
- **THEN** a block with three empty cards appears, each with an "Add image" button, with the caret in the first card's title

#### Scenario: Insert jobs
- **WHEN** the owner inserts a jobs block after the hero
- **THEN** a block with a heading and one empty job appears, with the caret in the job's title

### Requirement: Item structure
The owner SHALL be able to insert, delete, duplicate and reorder list items, gallery items, logo items, figures and steps within their list, and service items, people, testimonials and FAQ items within the collection blocks that show them (see "Items in collection blocks"). Duplicating an item SHALL insert a copy right after it, with its texts, marks and image, under new node IDs, select the copy, and be one undoable step.

#### Scenario: Add a service
- **WHEN** the owner adds a service item after the last one in a block showing all services
- **THEN** a new, empty service item appears at the end of the services list and of the site's services collection

#### Scenario: Reorder gallery photos
- **WHEN** the owner moves the third photo of a gallery to the first place
- **THEN** the gallery and the document show the new order

#### Scenario: Duplicate a person
- **WHEN** the owner duplicates a person "Jana Nováková" with a portrait
- **THEN** a second person "Jana Nováková" with the same portrait image (media key and description) appears right after her

#### Scenario: Add a step
- **WHEN** the caret is at the end of the second step's title and the owner adds an item
- **THEN** an empty step appears as the third, the steps after it move down, and their numbers follow

### Requirement: Image description
For every image, the owner SHALL be able to edit the alt text and mark the image as decorative, except for logos, whose name is their description. Marking an image decorative SHALL clear the alt text. When an image has just been placed and has neither alt text nor the decorative flag, the Image panel SHALL ask for a description. A portrait added to a person SHALL start as decorative, since the person's name is next to it.

#### Scenario: Mark as decorative
- **WHEN** the owner marks the hero image as decorative
- **THEN** the image's decorative flag is set and its alt text is empty

#### Scenario: Description asked for after choosing
- **WHEN** the owner chooses an image for the hero
- **THEN** the Image panel is shown with the alt text field focused and a hint to describe the image or mark it decorative

#### Scenario: Portrait starts decorative
- **WHEN** the owner adds a portrait to a person
- **THEN** the portrait is marked decorative and the document is valid

#### Scenario: Logo image panel
- **WHEN** the owner selects a logo's image
- **THEN** the Image panel shows the logo's name as its description and offers no alt text field

### Requirement: Undo and redo
Every editing action SHALL be undoable and redoable, with the usual keyboard shortcuts and with toolbar buttons. This includes page and menu actions and changes made in the page settings panel. Undo and redo shortcuts pressed while a field of the page settings panel has focus SHALL act on the editor's history, not only on that field. Consecutive typing in one panel field SHALL be undone together rather than one character at a time.

#### Scenario: Undo a deletion
- **WHEN** the owner deletes a block and then undoes
- **THEN** the block is back in its place with its content

#### Scenario: Undo a page deletion
- **WHEN** the owner deletes the Kontakt page and then undoes
- **THEN** the Kontakt page, its blocks and its menu item are back in their places

#### Scenario: Undo from a panel field
- **WHEN** the owner types a new page title in the page settings panel and presses Ctrl/Cmd+Z while the title field has focus
- **THEN** the title, and the slug and menu label that followed it, return to their previous values

### Requirement: Preview width
The editor SHALL let the owner switch between a desktop and a mobile preview width while editing.

#### Scenario: Mobile width
- **WHEN** the owner selects the mobile preview
- **THEN** the page is laid out at a phone width, using the site's responsive styles

### Requirement: Unsaved changes
The editor SHALL indicate when there are unsaved changes and SHALL warn before the owner leaves the editor with unsaved changes.

#### Scenario: Leaving with unsaved edits
- **WHEN** the owner has unsaved edits and tries to close the tab or leave the editor
- **THEN** the browser asks for confirmation before leaving

### Requirement: Problems panel
The editor SHALL list the document's validation problems after each save and whenever the document changes, and clicking a problem SHALL select the node it concerns when that node is on the current page, or switch to the page containing it. A problem about a page's own settings (title, slug, SEO description, home page) SHALL switch to that page and focus the matching field in the page settings panel. A problem about a theme field or the logo SHALL open the Design tab at the field. A problem about a link inside text SHALL switch to the page containing that text and select exactly the linked words. A problem about the business's fields SHALL open the Business section, and one about the site's settings the Website section, as "Settings from the editor" says (see the project-page capability).

The panel SHALL be in the editor's left column, under the pages list, with its own scrolling when the list is long, so the pages stay in view. It SHALL show the number of problems in its heading, and say when there are none. The details column SHALL hold only the settings of the Page and Design tabs and the panel of the selected block.

#### Scenario: Empty heading reported
- **WHEN** the owner inserts a rich text block and leaves its subheading empty
- **THEN** the problems panel lists an empty-heading problem for that subheading

#### Scenario: Go to a problem
- **WHEN** the owner clicks a problem that concerns a node on the current page
- **THEN** that node is selected in the editor

#### Scenario: Go to a slug problem
- **WHEN** the owner clicks a duplicate-slug problem for the Kontakt page
- **THEN** the editor switches to the Kontakt page and focuses its slug field

#### Scenario: Go to a broken text link
- **WHEN** the Kontakt page has been deleted, and the owner, while on another page, clicks the problem "This link points to a page that no longer exists" about the words "stránce Kontakt" on the home page
- **THEN** the editor switches to the home page and selects the words "stránce Kontakt"

#### Scenario: Under the pages
- **WHEN** the editor is open on a site with three problems
- **THEN** the left column shows the pages list and, under it, the problems panel with "3 problems", and the details column has no problems list

#### Scenario: Long list
- **WHEN** the site has thirty problems
- **THEN** the problems list scrolls inside its panel and the pages list stays fully visible above it

#### Scenario: Go to a business problem
- **WHEN** the owner clicks the problem that the phone number isn't in international form
- **THEN** the Business section opens with the phone field focused

### Requirement: Adding pages
The owner SHALL be able to add a page by giving it a title and choosing what it starts from: "Blank page" or one of the layouts of the site's template (see "Layouts" in the templates capability), each shown with its name and description. "Blank page" SHALL be chosen when the dialog opens. Choosing a layout while the title is empty, or still equal to the name of the layout chosen before, SHALL set the title to the chosen layout's name in the site's language.

The new page SHALL get a slug made from the title, made unique within the site with a numeric suffix when taken. A blank page SHALL start with one text block with placeholder content; a page from a layout SHALL start with the layout's blocks (see "Making a page from a layout" in the templates capability). The page SHALL get a navigation item at the end of the menu labelled with its title, and the editor SHALL switch to it. The whole addition SHALL be one undoable action.

#### Scenario: Add a page
- **WHEN** the owner adds a page titled "Ceník" from "Blank page"
- **THEN** a page "Ceník" with slug `cenik` and one text block exists, it is last in the menu, and the canvas shows it

#### Scenario: Add a page from a layout
- **WHEN** on a Czech site with services the owner chooses the Services layout and keeps the title "Služby" it fills in
- **THEN** a page "Služby" with slug `sluzby` exists with a text block, a services block showing all services and a call to action, and one undo removes it

#### Scenario: Owner's own title kept
- **WHEN** the owner types "Co děláme" and then chooses the Services layout
- **THEN** the title stays "Co děláme"

#### Scenario: Slug already taken
- **WHEN** the owner adds a page titled "Kontakt" and a page with slug `kontakt` already exists
- **THEN** the new page gets slug `kontakt-2`

#### Scenario: Empty title
- **WHEN** the owner tries to add a page with an empty title
- **THEN** no page is added and the owner is asked for a title

### Requirement: Duplicating pages
The owner SHALL be able to duplicate a page. The copy SHALL have the same blocks and content under new node IDs, the title `<title> (copy)` and a unique slug made from that title. When the original has a navigation item, the copy SHALL get one right after it. The editor SHALL switch to the copy. Links in the copy SHALL keep pointing where the original's did. The duplication SHALL be one undoable action.

#### Scenario: Duplicate a page
- **WHEN** the owner duplicates the page "Služby" (slug `sluzby`), which is second in the menu
- **THEN** a page "Služby (copy)" with slug `sluzby-copy` and the same blocks exists, it is third in the menu, and editing it does not change "Služby"

### Requirement: Deleting pages
The owner SHALL be able to delete a page other than the home page, after confirming. Deleting SHALL remove the page, its blocks and its navigation items as one undoable action. Before deleting, the editor SHALL say how many links elsewhere in the site point to the page. Those links SHALL stay in place and be reported as problems. When the deleted page is the one being edited, the editor SHALL switch to the home page. When the page lists services or projects (see "Item pages" in the site-document capability), the confirmation SHALL say that their pages will no longer be published, and deleting SHALL also clear that listing page, in the same undoable action. The home page SHALL NOT be deletable, and the editor SHALL explain that another page must be set as home first.

#### Scenario: Delete a page with links to it
- **WHEN** the owner deletes the page "Kontakt", which two text links on other pages point to, and confirms
- **THEN** the page and its menu item are gone, the canvas shows the home page, and the problems panel lists two links to a page that no longer exists

#### Scenario: Home page can't be deleted
- **WHEN** the owner looks at the delete action for the home page
- **THEN** it is disabled with an explanation to set another page as home first

#### Scenario: Cancel deletion
- **WHEN** the owner starts deleting a page and cancels the confirmation
- **THEN** nothing changes

#### Scenario: Delete the page that lists the projects
- **WHEN** the owner deletes the page "Work", which lists the projects, and confirms
- **THEN** the confirmation said that the projects' pages would no longer be published, the projects have no listing page, and one undo brings back the page and its role

### Requirement: Setting the home page
The owner SHALL be able to make any page the home page. Setting the home page SHALL NOT change any page's slug, the menu, or the order of pages, and SHALL be one undoable action. The previous home page SHALL keep its slug and become reachable at that slug.

#### Scenario: Set as home
- **WHEN** the owner sets the page "Služby" (slug `sluzby`) as home
- **THEN** "Služby" is marked as home in the sidebar, the previous home page is not, and both pages keep their slugs

### Requirement: Page settings panel
The editor SHALL show a settings panel for the current page with:
- its title, slug and SEO description;
- its share image;
- a "show in menu" switch.

The actions to duplicate, delete and set the page as home are in the page's menu in the pages list (see "Page actions menu"), not in this panel.

Changes to the title and SEO description SHALL apply to the document as the owner types. The slug field SHALL apply its value when the owner leaves the field or confirms it, normalised by slugifying; while typing, the panel SHALL show the slug that will be applied and the page's resulting address. For the home page, the panel SHALL explain that the page is served at the site root and that its slug is used only if it stops being home. An empty title or an empty slug after normalising SHALL be reported as a problem rather than refused.

The share image SHALL be:
- chosen from the media library;
- shown as a thumbnail with its description, which the owner can edit;
- changeable and removable.

When the page has none, the panel SHALL say that the site's default share image is used, or that there is none. Choosing, changing and removing the share image SHALL each be one undoable action.

#### Scenario: Edit the title
- **WHEN** the owner types "O nás" into the title field of a page without a hero
- **THEN** the page title on the canvas and in the sidebar shows "O nás"

#### Scenario: Normalise the slug
- **WHEN** the owner types `O Nás!` into the slug field and leaves it
- **THEN** the page's slug is `o-nas`

#### Scenario: Choose a share image
- **WHEN** the owner chooses a photo from the library as the share image of "Kontakt"
- **THEN** the page's share image list holds one image node with that photo's media key, width and height, and the panel shows its thumbnail

#### Scenario: Undo removing the share image
- **WHEN** the owner removes the page's share image and then undoes
- **THEN** the share image is back

### Requirement: Slug and menu label follow the title
When the owner changes a page's title, the page's slug SHALL change to the slugified new title if it was equal to the slugified old title, and each navigation item for the page SHALL change its label to the new title if it was equal to the old title. Otherwise they SHALL keep their values. These follow-up changes SHALL be part of the same undoable action as the title change.

#### Scenario: Slug and label follow
- **WHEN** a page titled "O nás" has slug `o-nas` and menu label "O nás", and the owner changes the title to "O firmě"
- **THEN** the slug becomes `o-firme` and the menu label becomes "O firmě"

#### Scenario: Customised slug and label are kept
- **WHEN** a page titled "O nás" has slug `about` and menu label "Kdo jsme", and the owner changes the title to "O firmě"
- **THEN** the slug stays `about` and the menu label stays "Kdo jsme"

### Requirement: Menu management
The owner SHALL be able to reorder the menu, to add a page to the menu or remove it (the "show in menu" switch, or moving it between the sidebar's sections), and to add, edit and remove external links in the menu. A page added to the menu SHALL get a navigation item at the end of the menu, outside any group, labelled with its title. A page SHALL have at most one navigation item created by the editor. External link addresses SHALL be checked with the same rules as the link dialog. The owner SHALL be able to add a menu group with a label, rename it, move it, and remove it, which keeps its links in the menu where the group was; and to move a page or link into a group, out of it, and within it. Groups SHALL be one level deep. Removing a page from the menu, or deleting it, SHALL remove its link wherever it is, inside a group or not. Menu and group labels SHALL stay editable in place on the canvas, but the canvas SHALL NOT add, remove or reorder menu items or groups. Every menu action SHALL be one undoable action.

#### Scenario: Reorder the menu
- **WHEN** the owner moves "Kontakt" above "Služby" in the sidebar's Menu section
- **THEN** the navigation on the canvas shows "Kontakt" before "Služby", and the document's navigation has the new order

#### Scenario: Hide a page from the menu
- **WHEN** the owner turns off "show in menu" for the page "Děkujeme"
- **THEN** its navigation item is removed, the page is listed under "Not in menu", and the page itself is unchanged

#### Scenario: Add an external link
- **WHEN** the owner adds a menu link labelled "Facebook" with address `https://facebook.com/anideti`
- **THEN** the menu ends with a "Facebook" item linking to that address

#### Scenario: Unsafe external link refused
- **WHEN** the owner enters `javascript:alert(1)` as a menu link address
- **THEN** the link is not added and the owner is told which addresses are allowed

#### Scenario: Group four pages
- **WHEN** the owner adds a group "Projekty" and uses "Move to group" › "Projekty" on "TV a film", "Eventy", "Výstavy" and "Interiéry"
- **THEN** the sidebar lists the four pages indented under "Projekty", the canvas's menu shows "Projekty" in their place, and one undo takes the last page back out of the group

#### Scenario: Remove a group
- **WHEN** the owner uses "Remove group" on "Projekty", which holds four pages and stands second in the menu
- **THEN** the four pages are in the menu from the second place on, in their order, and no group is left

#### Scenario: Hide a page that is in a group
- **WHEN** the owner turns off "show in menu" for "Eventy", which is in the group "Projekty"
- **THEN** "Projekty" holds the other three pages, and "Eventy" is listed under "Not in menu"

#### Scenario: Edit a group's label on the canvas
- **WHEN** the owner places the caret in "Projekty" in the canvas's menu and types
- **THEN** the group's label changes, and its links show under it while the caret is in the group

### Requirement: Hero image
The owner SHALL be able to add an image to a hero that has none, replace the hero's image, and remove it. Adding and replacing SHALL open the media library. Replacing SHALL keep the image's alt text and decorative flag only if the owner chooses the same image again; otherwise the new image starts without alt text. Each of these actions SHALL be one undoable action, and SHALL store the image's media key, width and height in the document.

#### Scenario: Add an image to a hero
- **WHEN** the owner uses "Add image" on a hero without an image and chooses an image in the library
- **THEN** the hero shows the image, and the document's hero has one image node with that image's media key, width and height

#### Scenario: Remove the hero image
- **WHEN** the owner selects the hero image and uses "Remove", then undoes
- **THEN** the hero first has no image, then has the same image with its alt text again

### Requirement: Media library dialog
The editor SHALL offer a media library dialog that lists the project's images as thumbnails with their file names, lets the owner upload images by choosing files or dropping them onto the dialog, shows the progress and outcome of each upload, and lets the owner choose an image or remove one from the library. The file picker SHALL offer JPEG, PNG, WebP and HEIC/HEIF files. A refused upload SHALL show the server's reason. A newly uploaded image SHALL appear in the list and be selectable without reloading.

#### Scenario: Upload and choose
- **WHEN** the owner opens the library from the hero, uploads a JPEG, and chooses it
- **THEN** the dialog closes, the hero shows the uploaded image, and the change is unsaved

#### Scenario: Refused upload
- **WHEN** the owner drops a PDF onto the library dialog
- **THEN** the dialog shows that only JPEG, PNG and WebP images are accepted, and nothing is added

#### Scenario: HEIC files can be chosen
- **WHEN** the owner opens the file picker from the library dialog
- **THEN** the picker offers `.heic` and `.heif` files alongside JPEG, PNG and WebP

### Requirement: HEIC photos converted before upload
Before uploading, the library dialog SHALL convert every HEIC or HEIF file (recognised by its type, its `.heic`/`.heif` extension, or its content) to a JPEG of the file's primary image, upright, at its full size but at most 4096 pixels on its longer side (larger photos are scaled down proportionally), named after the original with the extension `.jpg`, and upload that JPEG instead. It SHALL do so whether the file was chosen or dropped, and in browsers without built-in HEIC support. While converting, the file SHALL be shown as converting. When a file can't be converted, the dialog SHALL say that the photo couldn't be converted and should be exported as JPEG, and SHALL NOT upload anything for it. Files of other types SHALL be uploaded unchanged.

#### Scenario: HEIC photo in Chrome
- **WHEN** the owner chooses `IMG_5420.HEIC` (4032×3024) in the library dialog in Chrome
- **THEN** the dialog shows it converting, then uploading, and the library lists `IMG_5420.jpg` with a media key starting with `img-5420-` and a size of 4032×3024

#### Scenario: Very large HEIC photo
- **WHEN** the owner chooses a 5712×4284 HEIC photo
- **THEN** the uploaded JPEG is 4096×3072

#### Scenario: Dropped HEIC photo
- **WHEN** the owner drops a HEIC file onto the library dialog
- **THEN** it is converted and uploaded as a JPEG, as if it had been chosen

#### Scenario: Unreadable HEIC file
- **WHEN** the owner chooses a file named `photo.heic` whose content isn't a readable HEIC image
- **THEN** the dialog says the photo couldn't be converted and should be exported as JPEG, and nothing is uploaded or added to the library

#### Scenario: Other images unchanged
- **WHEN** the owner uploads a JPEG
- **THEN** the file is sent as chosen, without conversion

### Requirement: Images in blocks
The owner SHALL be able to add, replace and remove the image of a text with image block the portrait of a person and the photo of a testimonial, and replace the image of a gallery item or a logo item, through the media library, in the same way as the hero image. A gallery item or a logo item SHALL be removed as a whole rather than losing its image. For a text with image block, the Image panel SHALL let the owner put the image on the left or the right. For a logo, the Image panel SHALL let the owner link it to a page of the site or an address, with addresses checked as in the link dialog, and remove the link. Each of these actions SHALL be one undoable action.

#### Scenario: Image to the left
- **WHEN** the owner selects the image of a text with image block and chooses "left"
- **THEN** the image moves to the left of the text on the canvas and the block's image side is `left`

#### Scenario: Link a logo
- **WHEN** the owner selects a logo and links it to `https://harmonie.example`
- **THEN** the logo item has a link to that address, and undo removes it again

#### Scenario: Unsafe logo link refused
- **WHEN** the owner enters `javascript:alert(1)` as a logo's link
- **THEN** the link is not set and the owner is told which addresses are allowed

### Requirement: Adding several images at once
For a gallery, a team and a logos block, the owner SHALL be able to open the media library in a multi-select mode, select several images (including ones uploaded in the same session), and add them in one action. Each selected image SHALL become a new item at the end of the block, in the order selected: a gallery item without a caption, a person with the image as a decorative portrait and a placeholder name, or a logo item named after the image's file name. The addition SHALL be one undoable action.

#### Scenario: Add photos to a gallery
- **WHEN** the owner uses "Add photos" on an empty gallery, selects three images in the library and confirms
- **THEN** the gallery shows three photos in the selected order, and one undo removes all three

#### Scenario: Add logos
- **WHEN** the owner adds the images `harmonie.webp` and `p6.webp` to a logos block
- **THEN** two logo items named "harmonie" and "p6" appear, ready to be renamed

### Requirement: Select all within a field
While the caret or a text selection is in a text on the canvas, Cmd+A (Ctrl+A) SHALL select all of that text and nothing more; pressing it again SHALL keep the same selection. It SHALL never select a whole paragraph, item or block; Escape remains the way to select those. When an image or a block is selected, Cmd+A SHALL do nothing.

#### Scenario: Select all, then delete
- **WHEN** the caret is in a paragraph of a text block, and the owner presses Cmd+A twice and then Backspace
- **THEN** the paragraph's text is empty, and the block and its other paragraphs are unchanged

#### Scenario: Escape still selects the block
- **WHEN** the caret is in a paragraph and the owner presses Escape
- **THEN** the paragraph is selected as a whole, as before

### Requirement: Button panel
When a button of a hero or a call to action is selected, or the caret is in its label, the details column SHALL show a button panel. In it, the owner can:
- make the button link to a page of the site, chosen from the list of pages;
- make it link to an address, checked with the same rules as the link dialog; `tel:` and `mailto:` addresses are allowed;
- remove the button.

A call to action's last button SHALL NOT be removable.

When a hero or call to action is selected, or the caret is in it, and it has room for another button, the panel SHALL also offer to add a button. A new button links to the home page and is labelled "Tlačítko".

Each of these actions SHALL be one undoable action. An address that isn't allowed SHALL NOT be applied, and the panel SHALL say which addresses are allowed.

#### Scenario: Point a button at a page
- **WHEN** the owner selects the call to action's button and chooses the page "Kontakt"
- **THEN** the button links to `kontakt/`, and undo restores the previous target

#### Scenario: Call button
- **WHEN** the owner sets a button's address to `tel:+420321123456`
- **THEN** the button links to `tel:+420321123456`

#### Scenario: Unsafe address refused
- **WHEN** the owner enters `javascript:alert(1)` as a button's address
- **THEN** the button keeps its previous target, and the panel says which addresses are allowed

#### Scenario: Give the hero a button
- **WHEN** the caret is in a hero without a button, and the owner adds a button
- **THEN** the hero shows a button "Tlačítko" linking to the home page

#### Scenario: Second button
- **WHEN** the caret is in a call to action with one button, and the owner adds a button
- **THEN** the call to action has two buttons, and the panel no longer offers to add one

### Requirement: Editing a language
When the project has more than one language, the editor SHALL show a language switcher at the top of the left column, listing the project's languages by name, with "(hidden)" for unpublished ones.
- Choosing a language SHALL open that language's document, on the same page when the language has a page with the same translation key, otherwise on its home page.
- Unsaved changes SHALL be handled as when leaving the editor.
- Each language SHALL be edited, undone and saved on its own.
- The preview width and the canvas behave as for one language.

#### Scenario: Switch to English on the same page
- **WHEN** the owner edits the Czech "Kontakt" and chooses English
- **THEN** the editor shows the English page with the same translation key, and saving saves the English document

### Requirement: Translation keys of new pages
Adding a page SHALL give it a translation key of its own, and duplicating a page SHALL give the copy a new translation key, so neither is paired with another language's page.

#### Scenario: Duplicate in English
- **WHEN** the owner duplicates the English "Contact"
- **THEN** the copy's translation key differs from the original's, and the Czech "Kontakt" stays paired with the original

### Requirement: Page in other languages
When the project has more than one language, the page settings panel SHALL have an "In other languages" part. It lists every other language of the project, with the current page's state there:
- **Counterpart:** its title, and a link that opens it in that language's editor.
- **No counterpart:**
  - in the language being edited, the actions "Copy here" (copy this page into that language) and "Link to an existing page" (choose one of that language's pages without a counterpart in the language being edited);
  - "Not translated".
- **Unlink:** an action on a page that has counterparts.

The part SHALL reflect the other languages' saved documents and the editor's current document. Copying SHALL require the page to be saved first, and the editor SHALL say so when it isn't.

#### Scenario: Copy from the editor
- **WHEN** the owner edits the saved Czech "Ceník" and chooses "Copy here" for English
- **THEN** English gets the copy, and the part shows English: "Ceník" with a link to open it

#### Scenario: Unsaved page
- **WHEN** the owner added "Ceník" without saving and chooses "Copy here" for English
- **THEN** nothing is copied, and the editor asks to save first

### Requirement: Untranslated pages in the page list
In a language other than the primary, the editor's page list SHALL mark pages that aren't translated yet (see the languages capability) with "Not translated", and the mark SHALL go as soon as the page no longer counts as not translated, as the owner types.

#### Scenario: Mark goes away
- **WHEN** the English page "Kontakt" (not translated yet) is renamed "Contact" with slug `contact`
- **THEN** its "Not translated" mark goes away

### Requirement: History from the editor
The editor's left column SHALL link to the history of the language being edited. When the editor has unsaved changes, following the link SHALL ask first, as leaving the editor does. After a restore of the language being edited, opening the editor SHALL show the restored document.

#### Scenario: Open the English history
- **WHEN** the owner edits English and follows the History link
- **THEN** the English history opens

### Requirement: Design tab
The editor's settings column SHALL have a Design tab next to Page, with:
- **Presets:** each preset shown by its name, a swatch of its colours and a sample in its heading font. Choosing one applies it (see "Theme presets" in the theming capability).
- **Colours:** primary, secondary, background and text, each with a colour picker and a hex text field. A hex value SHALL be applied as soon as it is a valid colour; an incomplete value SHALL not change the document.
- **Contrast:** each contrast pair (see "Theme colour contrast" in the theming capability) with a sample, its measured ratio and whether it passes, updated as the colours change.
- **Fonts:** a heading font and a body font, each chosen from the catalog, every option shown in its own typeface and labelled with its name and kind.
- **Corner radius:** Square (`0`), Soft (`0.5rem`) and Round (`1rem`).
- **Content width:** Narrow (`56rem`), Standard (`64rem`) and Wide (`76rem`).
- **Logo:** chosen from the media library, shown as a thumbnail, changeable and removable.
- **The switch "Show the site name next to the logo"**, available only while there is a logo.

A radius or width that isn't one of the named choices SHALL be shown as "Custom" and kept until another choice is made. Every change SHALL be one undoable step (typing a hex value batches into one step) and SHALL mark the site as having unsaved changes. Problems about the theme or the logo, when selected in the problems panel, SHALL open the Design tab at the field concerned (for a contrast problem, at the first colour of the pair).

#### Scenario: Apply a preset
- **WHEN** the owner chooses a preset on a site with content width `76rem`
- **THEN** the theme has the preset's colours, fonts and radius, the content width stays `76rem`, and one undo restores the previous theme

#### Scenario: Type a hex colour
- **WHEN** the owner types `#8b` into the primary colour field, then continues to `#8b2f2f`
- **THEN** the document's primary colour is unchanged after `#8b` and is `#8b2f2f` after the last character, and the contrast list updates

#### Scenario: Failing contrast shown
- **WHEN** the owner sets the primary colour to `#7fb2e5` on a white background
- **THEN** the pair "Links and buttons" shows 2.23:1 and that it fails, and the problems panel lists a contrast error

#### Scenario: Go to a contrast problem
- **WHEN** the owner selects the problem about text on panels
- **THEN** the Design tab opens with the text colour field focused

#### Scenario: Choose a logo
- **WHEN** the owner chooses a logo from the library
- **THEN** the site's logo list holds one image node with the logo's media key, width and height, the canvas header shows the logo next to the site name, and the switch "Show the site name next to the logo" is on

#### Scenario: Hide the name
- **WHEN** the site has a logo and the owner switches "Show the site name next to the logo" off
- **THEN** the canvas header shows only the logo

### Requirement: Theme on the canvas
The canvas SHALL be styled with the site's template and the document's current theme, fonts included, and SHALL restyle whenever the theme changes, through editing, a preset, undo or redo, without reloading the editor. While a theme value is not valid (a colour that isn't a hex colour, a font outside the catalog, a length that isn't a CSS length), the canvas SHALL keep the last valid value for that field. Contrast failures SHALL NOT stop the canvas from showing the chosen colours. The canvas header SHALL show the logo and the name as the published site will.

#### Scenario: Live colour
- **WHEN** the owner changes the primary colour to `#8b2f2f`
- **THEN** the canvas's links and buttons turn `#8b2f2f` without a reload, and undo turns them back

#### Scenario: Live font
- **WHEN** the owner chooses `lora` as the heading font
- **THEN** the canvas headings are shown in Lora

#### Scenario: Low contrast still shown
- **WHEN** the owner sets the primary colour to `#7fb2e5` on a white background
- **THEN** the canvas shows the links in `#7fb2e5` while the problems panel lists the contrast error

#### Scenario: Template's spacing on the canvas
- **WHEN** the editor opens a site whose template sets a larger block padding than Standard
- **THEN** the canvas shows its blocks with the template's padding

### Requirement: Block and item handles
Every block of the current page SHALL have a handle at its left edge, and so SHALL every item of the lists named in "Item structure". A handle SHALL show while the pointer is over its block or item, and while the caret or a selection is inside it, so it can be reached without hovering (touch screens). When the caret is in an item, the handles of the item and of its block SHALL both show.

A handle SHALL be a button named after what it acts on, such as "Services block" or "Photo 3". Activating it SHALL select that block or item as a whole and open a menu with:
- Move up;
- Move down;
- Duplicate;
- Delete;
- for a block only, Add block above and Add block below, which open the block picker (see "Adding blocks on the canvas") for that place.

Each entry SHALL do what the editor's existing commands do for the selected block or item, as one undoable step. Entries that can't apply SHALL be shown disabled: Move up for the first block or item of its list, Move down for the last, and Duplicate and Add block above for a hero.

The menu SHALL be operable with the keyboard: arrow keys move between entries, Enter activates one, and Escape closes the menu. Closing it without choosing SHALL keep the block or item selected and return focus to the canvas. After Delete, nothing SHALL stay selected; after Move or Duplicate, the moved block or item, or the copy, SHALL be selected.

The navigation, image slots, buttons, the page title, and the hero's fixed parts SHALL have no handle. Paragraphs and subheadings inside a text block SHALL have none either. Escape on the canvas SHALL still select the paragraph, item or block around the caret, as before.

#### Scenario: Delete a block with the mouse
- **WHEN** the owner points at the services block, clicks its handle and chooses Delete
- **THEN** the services block is gone from the page, and one undo brings it back

#### Scenario: Remove one gallery photo
- **WHEN** the owner clicks into the caption of the third photo of a six-photo gallery, clicks the photo's handle and chooses Delete
- **THEN** the gallery has five photos and the block is still there

#### Scenario: Handle without hovering
- **WHEN** the caret is in the description of a service, and the pointer is elsewhere
- **THEN** the handles of that service and of its services block are shown

#### Scenario: First block
- **WHEN** the owner opens the handle menu of the first block of the page
- **THEN** Move up is disabled, and Move down, Duplicate (unless it is the hero) and Delete are enabled

#### Scenario: Keyboard only
- **WHEN** the owner tabs to a block's handle, presses Enter, presses the down arrow until Duplicate is focused and presses Enter
- **THEN** the block is duplicated and the copy is selected

#### Scenario: Close the menu
- **WHEN** the owner opens a block's handle menu and presses Escape
- **THEN** the menu closes, the block stays selected and the canvas has focus

#### Scenario: No handle on the menu
- **WHEN** the owner points at the site's navigation
- **THEN** no handle is shown

### Requirement: Selection named in the toolbar
While a block or an item is selected as a whole, the toolbar SHALL say what is selected, in words owners use: the block's name ("Services block", "Gallery block", "Call to action block"), or the item's name and position in its list ("Photo 3 of 6", "Service 2 of 3", "Person 1 of 4", "Logo 2 of 5", "Testimonial 1 of 2", "Figure 2 of 4", "Step 1 of 3", "List item 4 of 4"). Nothing SHALL be said for a text selection or the caret. The toolbar's Delete button SHALL say in its description that Escape selects the paragraph, item or block around the caret.

#### Scenario: Photo selected
- **WHEN** the owner selects the third photo of a six-photo gallery with its handle
- **THEN** the toolbar says "Photo 3 of 6 selected"

#### Scenario: Escape reaches the block
- **WHEN** the caret is in a service's name and the owner presses Escape until the services block is selected
- **THEN** the toolbar first says "Service 1 of 3 selected" and then "Services block selected"

#### Scenario: Typing
- **WHEN** the caret is in a paragraph
- **THEN** the toolbar names no selection

### Requirement: Adding blocks on the canvas
The canvas SHALL offer a "+ Add block" button at every place a block can go: above the first block, between two blocks, and after the last. A page without blocks SHALL show one "+ Add block" button at all times. The buttons of a place SHALL show while the pointer is near it, and the ones above and below the block holding the caret or selection SHALL also show, so they can be reached without hovering. They SHALL not cover the page's text.

Activating a "+ Add block" button, or Add block above or below in a block's handle menu, SHALL open a block picker for that place. The picker SHALL show every block type, in a fixed order, as a grid of cards. Each card SHALL have:
- a simple drawing of the block: a wireframe sketch of its layout, with its buttons and accents in the site's primary colour. The drawing is decorative and hidden from assistive technology, since the name and description say the same;
- its standard name, as used elsewhere in the editor;
- a one-line description of what it shows;
- when it can't go at that place, a disabled state and the reason, such as "Only at the top of a page without a hero".

The picker SHALL be operable with the keyboard: arrow keys move between cards, Enter chooses, Escape closes. Escape SHALL close it without inserting and return focus to where it was opened from. Choosing a block SHALL insert it at that place as one undoable step.

After a block is inserted, the editor SHALL:
- scroll it into view when it isn't fully visible;
- highlight it briefly;
- put the caret in its first text, as inserting does today.

#### Scenario: Add between two blocks
- **WHEN** the owner points between the services block and the text block, clicks "+ Add block" and picks Opening hours
- **THEN** an opening hours block appears between them, scrolled into view and briefly highlighted, with the caret in its heading
- **AND** one undo removes it

#### Scenario: Add below from the handle
- **WHEN** the owner opens the services block's handle menu and chooses Add block below, then picks Gallery
- **THEN** a gallery block appears right after the services block

#### Scenario: Hero greyed out with a reason
- **WHEN** the owner opens the picker between two blocks
- **THEN** Hero is disabled and says it only goes at the top of a page without a hero, and every other block is enabled

#### Scenario: Pictures in the picker
- **WHEN** the picker is open
- **THEN** every block is a card with a drawing of the block, its name and its description, such as "Opening hours" with "Your weekly hours, from the business settings"

#### Scenario: Empty page
- **WHEN** the owner opens a page without blocks
- **THEN** one "+ Add block" button is shown, and choosing Text in its picker gives the page a text block with the caret in it

#### Scenario: No Add block buttons in the left column
- **WHEN** the editor is open
- **THEN** the left column has the pages and no buttons for adding blocks

#### Scenario: Close the picker
- **WHEN** the owner opens the picker and presses Escape
- **THEN** the picker closes, nothing is inserted, and focus returns to the button that opened it

#### Scenario: Touch
- **WHEN** the caret is in the services block and the pointer isn't over the canvas
- **THEN** the "+ Add block" buttons above and below the services block are shown

### Requirement: Page actions menu
Every entry of the editor's pages list SHALL have a "⋯" button, named for the entry ("Actions for “Kontakt”"), that opens a menu with the actions for it. Entries of the menu section and of the "Not in menu" section SHALL have it alike. The menu SHALL work as a menu button does: arrow keys move, Enter chooses, Escape closes and returns focus to the button.

For a page the menu SHALL offer:
- **Rename**, which asks for a new title and applies it as the title field does, including the slug and menu label that follow it;
- **Duplicate**;
- **Move up** and **Move down**, for a page in the menu, which move its menu item;
- **Show in menu** or **Remove from menu**;
- **Set as home**;
- **Delete**, which confirms and counts the links to the page as "Deleting pages" says.

For an external link of the menu it SHALL offer **Edit**, **Move up**, **Move down** and **Remove from menu**.

An action that can't be used SHALL be shown disabled with the reason: Move up on the first menu entry, Move down on the last, Set as home on the home page ("Already the home page"), Delete on the home page and on the only page. Each action SHALL be one undoable action. The pages list SHALL NOT have separate ↑ and ↓ buttons; dragging entries SHALL still work.

#### Scenario: Delete from the list
- **WHEN** the owner opens the "⋯" menu of the page "Kontakt" and chooses Delete, and confirms
- **THEN** the page and its menu item are gone, as when deleting from the page's settings before, and one undo brings them back

#### Scenario: Move in the menu
- **WHEN** the owner chooses Move up from the menu of "Kontakt", which is second in the menu
- **THEN** "Kontakt" is first in the menu, on the canvas's navigation too

#### Scenario: Home page can't be deleted
- **WHEN** the owner opens the menu of the home page
- **THEN** Delete is disabled and says another page must be set as home first, and Set as home is disabled and says "Already the home page"

#### Scenario: Rename
- **WHEN** the owner chooses Rename on "O nás" and enters "O firmě"
- **THEN** the page's title is "O firmě", and its slug and menu label follow as they do for the title field

#### Scenario: Keyboard
- **WHEN** the owner tabs to a page's "⋯" button, presses Enter, then the down arrow until Delete is focused, and Enter
- **THEN** the confirmation to delete the page opens

#### Scenario: Not in the menu
- **WHEN** the owner opens the menu of a page under "Not in menu"
- **THEN** it offers "Show in menu" and has no Move up or Move down

### Requirement: Business blocks in the editor
The canvas SHALL show the `contact` and `opening_hours` blocks, and the footer, as the published site will, from the saved business details. The heading of a business block SHALL be editable in place. The details themselves SHALL NOT be editable on the canvas; the block SHALL offer a link to the Business section ("Edit business details"), as "Settings from the editor" says (see the project-page capability). The panel for a selected `contact` or `opening_hours` block SHALL offer its location choice when the business has several locations: "All locations" or one location by name, as one undoable step. The contact block's switches SHALL be shown in the same panel.

#### Scenario: Details follow the settings
- **WHEN** the owner changes the city to "Kolín 2" in the Business section, saves, and opens the editor
- **THEN** the canvas's contact block and footer show "Kolín 2"

#### Scenario: Edit details from a block
- **WHEN** the owner chooses "Edit business details" on a contact block
- **THEN** the Business section opens

#### Scenario: Choose a shop
- **WHEN** the business has the locations "Kolín – Lipová" and "Kutná Hora", and the owner selects a contact block and chooses "Kutná Hora" in its panel
- **THEN** the canvas shows Kutná Hora's details only, and one undo shows all locations again

### Requirement: Design outside the primary language
In a language other than the primary, the Design tab SHALL show the theme and the logo read-only, with the note "Edited in <primary language name>" and a link to the Design tab in the primary language. The whole tab, presets and logo included, SHALL be read-only there. The shared fields of the site and the business are read-only in the same way in the Website and Business sections (see the project-page capability).

#### Scenario: Design in English
- **WHEN** the owner opens the Design tab in English
- **THEN** no preset, colour, font, radius, width, logo or switch can be changed, and the tab says it is edited in Čeština with a link to the Czech Design tab

### Requirement: Items in collection blocks
The canvas SHALL show a `services`, `team`, `testimonials` or `faq` block with the items it shows, as the published page will. The items' texts SHALL be editable in place, and an edit SHALL change the item everywhere it is shown. Images SHALL use the usual image slots.

In a block showing **all** items, item actions SHALL act on the collection:
- adding, moving and duplicating an item change the collection, and so every block showing all of it;
- a new or duplicated item SHALL NOT be added to blocks showing chosen items.

In a block showing **chosen** items:
- moving an item SHALL change only that block's order;
- a handle's menu SHALL offer "Remove from this block" instead of Delete, keeping the item in the collection;
- adding SHALL offer a list of the collection's items the block doesn't show yet, and "New item" ("New service", "New question", …). "New item" creates the item at the end of the collection and adds it to the block;
- duplicating SHALL add the copy to the collection, right after the original, and to the block, right after the original.

Deleting an item from a block showing all items SHALL delete it from the collection and remove it from every block that chose it, as one undoable step. When other pages show the item, the handle menu's Delete entry SHALL say on how many other pages it is shown ("Also shown on 2 other pages").

When two blocks on the same page show the same item, the first block SHALL show it editable and later blocks SHALL show it as a preview. Clicking the preview SHALL put the caret in the editable copy.

Every action SHALL be one undoable step. Items in a FAQ block SHALL be named "Question 2 of 5" in the toolbar, and items of the other collection blocks as today ("Service 2 of 3").

#### Scenario: Edit a highlighted service
- **WHEN** the owner changes the price of "Chléb" in the home page's chosen services block and opens the "Služby" page
- **THEN** "Chléb" shows the new price there too, without saving in between

#### Scenario: Remove a highlight
- **WHEN** the owner chooses "Remove from this block" on "Dorty" in the home page's chosen services block
- **THEN** the home page no longer shows "Dorty", and the "Služby" page's block showing all services still does

#### Scenario: Add an existing service to the highlights
- **WHEN** the owner adds an item to the home page's chosen services block and picks "Dorty" from the collection's items
- **THEN** "Dorty" appears at the end of the block, and the collection is unchanged

#### Scenario: Delete a shown service
- **WHEN** the owner deletes "Rohlíky" from the "Služby" page's block showing all services, and the home page's block chose it
- **THEN** "Rohlíky" is gone from the collection and from both pages, and one undo brings it back in both places

#### Scenario: Same service twice on one page
- **WHEN** the home page has a chosen services block with "Chléb" and, further down, a block showing all services
- **THEN** "Chléb" is editable in the first block and shown as a preview in the second, and clicking the preview puts the caret in the first block's "Chléb"

#### Scenario: Add a question
- **WHEN** the owner adds an item after the last question of an FAQ block showing all questions
- **THEN** a new, empty question appears at the end of the block with the caret in it, and it is the collection's last item

### Requirement: Collection block mode
The block panel of a selected `services`, `team`, `testimonials` or `faq` block SHALL offer a choice between "All services" and "Chosen services" (and likewise "All people", "All testimonials", "All questions"):
- **all to chosen:** the block's chosen list starts as every item in collection order, so the page doesn't change.
- **chosen to all:** the block's chosen list is emptied, and it shows the whole collection.

Each switch SHALL be one undoable step. A new block from the block picker SHALL show all items.

#### Scenario: Switch to chosen
- **WHEN** the owner switches the home page's services block, showing four services, to "Chosen services"
- **THEN** the block still shows the four services, and removing one from the block leaves the collection with four

#### Scenario: New FAQ block
- **WHEN** the owner adds an FAQ block to a page of a site that has three questions
- **THEN** the block shows the three questions

### Requirement: Collections outside the primary language
In a language other than the primary, items' texts SHALL be editable, and their images and the collections' structure SHALL be read-only:
- items can't be added, deleted, duplicated or moved within a block showing all items;
- an image slot of an item shows its image without the change and remove actions, and keeps its description editable while it is the primary's image.

Blocks showing chosen items SHALL remain editable: the owner can choose, order and remove items for that language's page. The handle menu's disabled entries SHALL give the reason "Services are added and removed in <primary language name>".

#### Scenario: Translate a service in English
- **WHEN** the owner opens the English home page and edits the name of the service "Chléb" to "Bread"
- **THEN** the English page shows "Bread", the Czech page still shows "Chléb", and the English collection has the same services in the same order as the Czech one

#### Scenario: No new services in English
- **WHEN** the owner opens the handle menu of a service in an English block showing all services
- **THEN** Duplicate, Delete and Move are disabled, with the reason "Services are added and removed in Čeština"

### Requirement: Choosing a block's look
When a hero, services, team or gallery block is selected, or the caret is in it, the block panel SHALL offer its look as named choices:
- **Hero:** "Beside the text", "Full photo" or "Slideshow";
- **Services:** "Cards", "List" or "Accordion";
- **Team:** "Cards" or "List";
- **Gallery:** "Fill the tiles" or "Whole images".

Choosing SHALL change the block on the canvas at once, as one undoable step. A full-photo hero without an image SHALL show a hint that it needs a photo. On the canvas, an accordion shows every description open, so it can be edited, and a team list hides portraits as the published page does. A new block SHALL start with the default look. Outside the primary language the choice is the page's own, like the rest of its blocks.

#### Scenario: Make the hero a full photo
- **WHEN** the owner selects the home page's hero and chooses "Full photo"
- **THEN** the canvas shows the photo filling the hero with the text over it, and one undo brings back the text beside the photo

#### Scenario: Practice areas as an accordion
- **WHEN** the owner chooses "Accordion" for a services block and saves
- **THEN** the preview shows each service as a closed row that opens to its description

#### Scenario: Full photo without a photo
- **WHEN** the owner chooses "Full photo" for a hero without an image
- **THEN** the panel says the hero needs a photo, and the canvas still shows the text

#### Scenario: Make the hero a slideshow
- **WHEN** the owner chooses "Slideshow" for a hero without slides
- **THEN** the hero gets two empty slides, the canvas shows them side by side, and one undo brings back the previous look without slides

### Requirement: Projects block in the editor
The block picker SHALL offer a Projects block ("Projects": "Your work as photo tiles, all of it or one category"). On the canvas a `projects` block SHALL show its tiles as the published page will, and SHALL behave as "Items in collection blocks" and "Collection block mode" describe for the other collection blocks, with "All projects" and "Chosen projects", and "New project" when adding. A tile's name SHALL be editable in place and its cover SHALL use the usual image slot; the project's other fields SHALL be edited in What you offer, which the block panel links to ("Edit projects").

The block panel of a selected projects block SHALL also offer:
- the category: "All categories" or one of the site's categories;
- how many to show: "All" or a number from 1 to 24.

Each choice SHALL be one undoable step, and the canvas SHALL show its result at once. A new projects block SHALL show all projects of all categories.

#### Scenario: Category page
- **WHEN** the owner adds a Projects block to the page "Výstavy" and chooses the category "Výstavy"
- **THEN** the canvas shows only that category's projects, and one undo shows all projects again

#### Scenario: Latest work on the home page
- **WHEN** the owner sets the home page's projects block to show 4
- **THEN** the canvas shows the first four projects, and the preview ends the block with a link to all projects when the projects have a listing page

#### Scenario: New project from the canvas
- **WHEN** the owner adds an item to a projects block showing all projects
- **THEN** a new project with an empty name and no cover appears at the end of the block and of the collection, with the caret in its name

### Requirement: Cards in the editor
On the canvas a `cards` block SHALL show its cards as the published page will, in its look, with the titles and texts editable in place and each image in the usual image slot. Cards SHALL be added (Enter at the end of a card's text, or the item handle's Add), moved, duplicated and deleted as the items of other blocks are, each as one undoable step; a block SHALL keep at least one card and at most twelve, and the actions that would break that SHALL be disabled with the reason.

The block panel of a selected cards block SHALL offer its look: "Text under the photo" or "Title over the photo", as one undoable step.

While a card is selected or holds the caret, a Card panel SHALL offer its link: "No link", "A page of the site" (with the pages to choose from), "A project or service" (with the projects and services that have their own page), or "An address" (checked as in the link dialog, applied when it is valid). Each change SHALL be one undoable step. When the card links to something that no longer has a page, the panel SHALL say so.

#### Scenario: Category tile
- **WHEN** the owner adds an image to the first card, types "Výstavy" as its title, and links it to the page "Výstavy"
- **THEN** the canvas shows the photo with "Výstavy", and the preview's card is a link to `/vystavy/`

#### Scenario: Link to a project
- **WHEN** the projects are listed on "Realizace" and the owner links a card to the project "PETROF 160"
- **THEN** the preview's card links to `/realizace/petrof-160/`

#### Scenario: Last card can't be deleted
- **WHEN** a cards block has one card
- **THEN** its Delete action is disabled with the reason that a cards block needs at least one card

### Requirement: Videos in the editor
On the canvas a `videos` block SHALL show its videos as the published page shows them before play: the poster, or the title on the secondary colour, with the play symbol. The canvas SHALL NOT load the providers' players. Titles and captions SHALL be editable in place and the poster SHALL use the usual image slot. Videos SHALL be added, moved, duplicated and deleted as cards are, each as one undoable step, keeping one to twelve.

While a video is selected or holds the caret, a Video panel SHALL offer its address: typed or pasted, applied when it is a YouTube or Vimeo video address, with a message when it isn't ("Paste the address of a video on YouTube or Vimeo"). The panel SHALL say which provider and video it recognised, and link to the video on the provider's site. Each change SHALL be one undoable step.

When a recognised address is applied to a video without a poster, the editor SHALL add the provider's picture of the video as its poster: fetched by the server from YouTube or Vimeo, without the black bars of YouTube's smaller pictures, stored in the media library like an upload, and marked decorative, since the title names the video. For a video without a poster the panel SHALL also offer "Use the picture from YouTube" (or Vimeo). Visitors SHALL load the poster from the site, never from the provider.

#### Scenario: Add a film
- **WHEN** the owner inserts a videos block, types the title "Medvídku, vypravuj!" and pastes `https://youtu.be/wNdrFte2T4w` in the Video panel
- **THEN** the panel says it is a YouTube video, the video gets the film's picture from YouTube as its poster, and the preview shows the play link with that poster, loaded from the site

#### Scenario: Not a video address
- **WHEN** the owner pastes `https://www.youtube.com/@anideti` in the Video panel
- **THEN** the panel says to paste the address of a video, and the video's address is unchanged

### Requirement: Slides in the editor
While a hero's look is `slideshow`, the canvas SHALL show its slides side by side, without moving, each with its image in the usual image slot and its title editable in place; the hero's heading, text and button stay editable under them. Slides SHALL be added (Enter at the end of a title, or the item handle's Add), moved, duplicated and deleted as cards are, each as one undoable step, keeping at most eight; choosing "Slideshow" for a hero without slides SHALL add two empty slides in the same step.

While a slide is selected or holds the caret, a Slide panel SHALL offer its link with the Card panel's choices: no link, a page, a project or service with its own page, or an address; and its clip: the address of a Vimeo MP4 file, applied when it is one, with a message when it isn't ("Paste the address of an MP4 file on Vimeo"), and a note that the clip loads from Vimeo when the page opens.

#### Scenario: Link a slide to a project
- **WHEN** the owner gives slide 1 a photo and the title "Poslední závod", and links it to the project "Poslední závod" in the Slide panel
- **THEN** the preview's first slide shows the photo with the title as a link to the project's page

#### Scenario: Add a clip
- **WHEN** the owner pastes a `player.vimeo.com/progressive_redirect/…/file.mp4` address as slide 1's clip and saves
- **THEN** the preview's first slide holds a muted video with that address, over the photo

#### Scenario: Ninth slide
- **WHEN** a slideshow has eight slides
- **THEN** adding or duplicating a slide is disabled with the reason that a slideshow holds at most eight slides

### Requirement: Jobs in the editor
The canvas SHALL show a jobs block with every job's title, summary and description editable in place, the description always open. Jobs SHALL be added, moved, duplicated and deleted with the item handles, at most twelve; a job's description SHALL be edited like a text block's (paragraphs, subheadings, lists). Selecting a job SHALL show a Job panel with its contact's name, email and phone; an email or phone that isn't valid SHALL be refused with the reason, keeping the last valid value. The "no openings" note SHALL be edited in place on the canvas: under the jobs, marked as shown only when there are no openings, and in place of the list when the block has no jobs. Every change SHALL be one undoable step.

#### Scenario: Add a job ad
- **WHEN** the owner adds a job after "Zámečník/svářeč", types "Projektant/konstruktér", a summary and a description with a subheading and a list, and in the Job panel enters the email `pavel.boruvka@scenografie.cz`
- **THEN** the preview shows the job with its summary, a "Full description" to open, and the email as a link

#### Scenario: Thirteenth job
- **WHEN** a jobs block holds twelve jobs
- **THEN** the handle's Duplicate and Add are disabled with the reason "A jobs block holds at most twelve jobs"

#### Scenario: Last job removed
- **WHEN** the owner deletes the only job of a block whose note is "Momentálně nikoho nehledáme."
- **THEN** the canvas and the preview show the note in place of the list

### Requirement: Cropping and rotating images
The editor SHALL offer a crop dialog that shows an image whole, with a crop frame over it. In the dialog the owner SHALL be able to:
- turn the picture a quarter turn left or right, as often as needed;
- move the frame by dragging it, and resize it by dragging its corners and edges;
- move the frame with the arrow keys and resize it with Shift and the arrow keys;
- choose the frame's shape: free, 1:1, 4:3, 3:2 or 16:9, plus "As shown here" when the dialog was opened for a placed image whose block shows it in a fixed shape;
- reset the frame to the whole picture, save, or cancel.

The frame SHALL always stay within the picture, keep the chosen shape, and be at least 64 pixels of the image wide and high. The dialog SHALL open with the previous turn and frame when the image was itself made by an edit, and otherwise with the largest frame of the chosen shape, centred. Saving SHALL create the edited image in the library (see the media capability's "Editing images"), showing progress while the server works and the server's reason when it refuses. Cancelling SHALL change nothing.

The dialog SHALL be opened in four places:
- **the media library dialog**: "Edit" on the selected image. The new image SHALL appear first in the list and be selected, and the source SHALL stay in the list.
- **the Image panel**: "Crop and rotate" for the selected image. The shape SHALL start as "As shown here" where the block has one, otherwise free.
- **the image field of the list forms** (people, testimonials, projects): "Crop and rotate" for the item's image, in the same way.
- **the share image settings** of the site and of a page: "Crop and rotate" for the share image, in the same way.

The fixed shapes SHALL be 4:3 for a gallery item in a gallery whose look is `fill` and for a card, 16:10 for a project's cover, 1:1 for a person's portrait and a testimonial's photo, and 1200:630 for a share image. When saved from the Image panel, a form or a share image setting, the new image SHALL replace the image in that use only, keeping its description and decorative flag and resetting its focal point to the centre, as one undoable step. Crop and rotate SHALL NOT be offered where the image can't be replaced (collection items' images outside the primary language).

#### Scenario: Crop a portrait from a group photo
- **WHEN** the owner selects a person's portrait, uses "Crop and rotate", moves the 1:1 frame over the person's face and saves
- **THEN** the portrait on the canvas shows the cropped image, its description is unchanged, the library lists the crop and the group photo, and one undo brings back the group photo

#### Scenario: Turn a sideways photo in the library
- **WHEN** the owner selects a sideways photo in the library dialog, uses "Edit", turns it right and saves
- **THEN** the upright photo appears first in the library, selected, and the sideways photo is still listed

#### Scenario: Re-crop
- **WHEN** the owner opens "Crop and rotate" for an image that was cropped earlier
- **THEN** the dialog shows the whole source picture with the earlier frame, and the frame can be widened past the earlier crop

#### Scenario: Frame kept in shape
- **WHEN** the owner drags a corner of a 4:3 frame beyond the edge of the picture
- **THEN** the frame stops at the edge and stays 4:3

#### Scenario: Keyboard only
- **WHEN** the owner chooses the square shape, tabs to the crop frame, presses the right arrow three times and Shift and the up arrow twice, then saves
- **THEN** the saved crop is the square frame moved right and made smaller, still square

#### Scenario: Cancel
- **WHEN** the owner turns the picture and moves the frame, then cancels
- **THEN** nothing is added to the library and the document is unchanged

### Requirement: Focal point
For every image whose focal point the site can use, the Image panel and the image field of the list forms SHALL offer a focal point control: a small view of the whole image with a marker at the focal point. Clicking or tapping the view SHALL move the point there. With the control focused, the arrow keys SHALL move it by 1 and Shift and the arrow keys by 10, within 0 to 100. "Centre" SHALL put it back to 50, 50. The canvas SHALL show the image framed on its focal point as the site does. A click SHALL be one undoable step, and a series of key presses SHALL merge into one. Replacing an image with a different one SHALL reset its focal point to the centre. The control SHALL NOT be offered for logos, the favicon and the site logo, which are always shown whole, or where the image can't be replaced.

#### Scenario: Keep a face in view
- **WHEN** the owner selects a hero image in the "Full photo" look and clicks near the top of the focal point view
- **THEN** the canvas shows the top part of the photo, the image node's vertical position is about 15, and one undo restores the centre

#### Scenario: Arrow keys
- **WHEN** the focal point is 50, 50 and the owner presses Shift and the left arrow twice, then the up arrow once
- **THEN** the focal point is 30, 49, and one undo returns it to 50, 50

#### Scenario: Reset
- **WHEN** the owner uses "Centre" on an image whose focal point is 20, 70
- **THEN** the focal point is 50, 50

#### Scenario: No focal point for logos
- **WHEN** the owner selects a logo of a partner logos block
- **THEN** the Image panel offers no focal point control

### Requirement: Template defaults for new blocks
A `hero`, `services`, `team`, `gallery` or `cards` block inserted from the block picker SHALL get the site template's default look for that block, and the block panel SHALL show that look as chosen.

#### Scenario: Template prefers the full photo
- **WHEN** the site's template has the default hero look `cover` and the owner inserts a hero
- **THEN** the hero's look is "Full photo"

#### Scenario: Standard
- **WHEN** a site uses Standard and the owner inserts a services block
- **THEN** its look is "Cards", as before templates existed

### Requirement: Showing and hiding blocks
When a block is selected, or the caret is in it, the block panel SHALL have a switch "Show on website", on for blocks that aren't hidden. Turning it off SHALL hide the block, turning it on SHALL show it again, and each SHALL be one undoable step. The block's handle menu SHALL offer the same as "Hide on website" or "Show on website".

On the canvas a hidden block SHALL stay in its place, editable as before, shown dimmed with a "Hidden" label at its top that says it isn't on the website. The page's entry in the pages list SHALL NOT change.

#### Scenario: Hide the testimonials
- **WHEN** the owner selects the home page's testimonials block and turns "Show on website" off
- **THEN** the block is dimmed with the "Hidden" label, the preview of the home page has no testimonials, and undo shows it again

#### Scenario: Edit a hidden block
- **WHEN** the caret is in a hidden text block's paragraph and the owner types
- **THEN** the text changes and the block stays hidden

### Requirement: Contact form in the editor
The block picker SHALL offer a contact form ("Contact form": "A form visitors send you messages
or callback requests with"). On the canvas the block SHALL show its heading and text editable in
place, and its fields as the website shows them but not usable. Selecting it SHALL show a Contact
form panel with:
- its kind, *Contact us* or *Let us call you back*, which changes the fields shown;
- its button's label;
- where messages go: "Business email (<address>)" by default, or another address, with
  "Waiting for confirmation" until that address confirms; an address that isn't an email SHALL
  be refused with the reason, keeping the last valid one;
- a link to the Messages section.

Every change SHALL be one undoable step.

#### Scenario: Insert a callback form
- **WHEN** the owner inserts a contact form on "Konzultace zdarma", chooses *Let us call you
  back* and types the heading "Zavoláme vám"
- **THEN** the canvas shows the name, phone and when-to-call fields under "Zavoláme vám", and the
  preview has a working form

#### Scenario: A campaign address
- **WHEN** the owner sets the form's address to `kampan@pekarna-ulipy.cz`
- **THEN** the panel says the address is waiting for confirmation, and a confirmation email is
  sent to it once the site is saved
