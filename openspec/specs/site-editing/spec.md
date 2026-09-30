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
The owner SHALL be able to edit every visible text of the page in place: the hero heading, text and call-to-action label; paragraphs, subheadings and list items; the services heading and each service's name, description and price; and the navigation labels. Pressing Enter in a paragraph or list item SHALL split it into two; single-line texts (headings, labels, names, prices) SHALL NOT accept line breaks.

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
The owner SHALL be able to insert, delete and reorder the blocks of a page. Inserting SHALL offer hero, rich text, services, text with image, gallery, team and partner logos blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them.

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

### Requirement: Item structure
The owner SHALL be able to insert, delete and reorder list items, service items, gallery items, people and logo items within their list.

#### Scenario: Add a service
- **WHEN** the owner adds a service item after the last one
- **THEN** a new, empty service item appears at the end of the services list

#### Scenario: Reorder gallery photos
- **WHEN** the owner moves the third photo of a gallery to the first place
- **THEN** the gallery and the document show the new order

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
The editor SHALL list the document's validation problems after each save and whenever the document changes, and clicking a problem SHALL select the node it concerns when that node is on the current page, or switch to the page containing it. A problem about a page's own settings (title, slug, SEO description, home page) SHALL switch to that page and focus the matching field in the page settings panel. A problem about a link inside text SHALL switch to the page containing that text and select exactly the linked words.

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

### Requirement: Adding pages
The owner SHALL be able to add a page by giving it a title. The new page SHALL get a slug made from the title, made unique within the site with a numeric suffix when taken. It SHALL start with one text block with placeholder content, SHALL get a navigation item at the end of the menu labelled with its title, and the editor SHALL switch to it. The whole addition SHALL be one undoable action.

#### Scenario: Add a page
- **WHEN** the owner adds a page titled "Ceník"
- **THEN** a page "Ceník" with slug `cenik` and one text block exists, it is last in the menu, and the canvas shows it

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
The owner SHALL be able to delete a page other than the home page, after confirming. Deleting SHALL remove the page, its blocks and its navigation items as one undoable action. Before deleting, the editor SHALL say how many links elsewhere in the site point to the page. Those links SHALL stay in place and be reported as problems. When the deleted page is the one being edited, the editor SHALL switch to the home page. The home page SHALL NOT be deletable, and the editor SHALL explain that another page must be set as home first.

#### Scenario: Delete a page with links to it
- **WHEN** the owner deletes the page "Kontakt", which two text links on other pages point to, and confirms
- **THEN** the page and its menu item are gone, the canvas shows the home page, and the problems panel lists two links to a page that no longer exists

#### Scenario: Home page can't be deleted
- **WHEN** the owner looks at the delete action for the home page
- **THEN** it is disabled with an explanation to set another page as home first

#### Scenario: Cancel deletion
- **WHEN** the owner starts deleting a page and cancels the confirmation
- **THEN** nothing changes

### Requirement: Setting the home page
The owner SHALL be able to make any page the home page. Setting the home page SHALL NOT change any page's slug, the menu, or the order of pages, and SHALL be one undoable action. The previous home page SHALL keep its slug and become reachable at that slug.

#### Scenario: Set as home
- **WHEN** the owner sets the page "Služby" (slug `sluzby`) as home
- **THEN** "Služby" is marked as home in the sidebar, the previous home page is not, and both pages keep their slugs

### Requirement: Page settings panel
The editor SHALL show a settings panel for the current page with its title, slug, SEO description, a "show in menu" switch, and the actions to duplicate, delete, and set it as home. Changes to the title and SEO description SHALL apply to the document as the owner types. The slug field SHALL apply its value when the owner leaves the field or confirms it, normalised by slugifying; while typing, the panel SHALL show the slug that will be applied and the page's resulting address. For the home page, the panel SHALL explain that the page is served at the site root and that its slug is used only if it stops being home. An empty title or an empty slug after normalising SHALL be reported as a problem rather than refused.

#### Scenario: Edit the title
- **WHEN** the owner types "O nás" into the title field of a page without a hero
- **THEN** the page title on the canvas and in the sidebar shows "O nás"

#### Scenario: Normalise the slug
- **WHEN** the owner types `O Nás!` into the slug field and leaves it
- **THEN** the page's slug is `o-nas`

### Requirement: Slug and menu label follow the title
When the owner changes a page's title, the page's slug SHALL change to the slugified new title if it was equal to the slugified old title, and each navigation item for the page SHALL change its label to the new title if it was equal to the old title. Otherwise they SHALL keep their values. These follow-up changes SHALL be part of the same undoable action as the title change.

#### Scenario: Slug and label follow
- **WHEN** a page titled "O nás" has slug `o-nas` and menu label "O nás", and the owner changes the title to "O firmě"
- **THEN** the slug becomes `o-firme` and the menu label becomes "O firmě"

#### Scenario: Customised slug and label are kept
- **WHEN** a page titled "O nás" has slug `about` and menu label "Kdo jsme", and the owner changes the title to "O firmě"
- **THEN** the slug stays `about` and the menu label stays "Kdo jsme"

### Requirement: Menu management
The owner SHALL be able to reorder the menu, to add a page to the menu or remove it (the "show in menu" switch, or moving it between the sidebar's sections), and to add, edit and remove external links in the menu. A page added to the menu SHALL get a navigation item at the end of the menu labelled with its title. A page SHALL have at most one navigation item created by the editor. External link addresses SHALL be checked with the same rules as the link dialog. Menu labels SHALL stay editable in place on the canvas, but the canvas SHALL NOT add, remove or reorder menu items. Every menu action SHALL be one undoable action. Menu items SHALL NOT have sub-items.

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
The owner SHALL be able to add, replace and remove the image of a text with image block and the portrait of a person, and replace the image of a gallery item or a logo item, through the media library, in the same way as the hero image. A gallery item or a logo item SHALL be removed as a whole rather than losing its image. For a text with image block, the Image panel SHALL let the owner put the image on the left or the right. For a logo, the Image panel SHALL let the owner link it to a page of the site or an address, with addresses checked as in the link dialog, and remove the link. Each of these actions SHALL be one undoable action.

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
