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
The owner SHALL be able to insert, delete, duplicate and reorder the blocks of a page. A block SHALL be inserted at a place the owner chose on the canvas: between two blocks, above the first, after the last, above or below a given block, or on an empty page. The left column SHALL NOT offer inserting blocks. Inserting SHALL offer hero, rich text, services, text with image, gallery, team, partner logos, contact, opening hours, call to action and testimonials blocks, each created with placeholder content. A hero SHALL only be offered when inserting at the top of a page that has no hero, and no block SHALL be offered above an existing hero. A new text with image block SHALL start without an image; a new gallery, team or logos block SHALL start without items and offer to add them. A new contact block SHALL start with every switch on, and a new contact or opening hours block SHALL start with a placeholder heading. A new call to action SHALL start with a placeholder heading, an empty text and one button to the home page labelled "Tlačítko". A new testimonials block SHALL start with a placeholder heading and one empty testimonial.

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

### Requirement: Item structure
The owner SHALL be able to insert, delete, duplicate and reorder list items, gallery items and logo items within their list, and service items, people, testimonials and FAQ items within the collection blocks that show them (see "Items in collection blocks"). Duplicating an item SHALL insert a copy right after it, with its texts, marks and image, under new node IDs, select the copy, and be one undoable step.

#### Scenario: Add a service
- **WHEN** the owner adds a service item after the last one in a block showing all services
- **THEN** a new, empty service item appears at the end of the services list and of the site's services collection

#### Scenario: Reorder gallery photos
- **WHEN** the owner moves the third photo of a gallery to the first place
- **THEN** the gallery and the document show the new order

#### Scenario: Duplicate a person
- **WHEN** the owner duplicates a person "Jana Nováková" with a portrait
- **THEN** a second person "Jana Nováková" with the same portrait image (media key and description) appears right after her

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
The canvas SHALL be styled with the document's current theme, fonts included, and SHALL restyle whenever the theme changes, through editing, a preset, undo or redo, without reloading the editor. While a theme value is not valid (a colour that isn't a hex colour, a font outside the catalog, a length that isn't a CSS length), the canvas SHALL keep the last valid value for that field. Contrast failures SHALL NOT stop the canvas from showing the chosen colours. The canvas header SHALL show the logo and the name as the published site will.

#### Scenario: Live colour
- **WHEN** the owner changes the primary colour to `#8b2f2f`
- **THEN** the canvas's links and buttons turn `#8b2f2f` without a reload, and undo turns them back

#### Scenario: Live font
- **WHEN** the owner chooses `lora` as the heading font
- **THEN** the canvas headings are shown in Lora

#### Scenario: Low contrast still shown
- **WHEN** the owner sets the primary colour to `#7fb2e5` on a white background
- **THEN** the canvas shows the links in `#7fb2e5` while the problems panel lists the contrast error

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
While a block or an item is selected as a whole, the toolbar SHALL say what is selected, in words owners use: the block's name ("Services block", "Gallery block", "Call to action block"), or the item's name and position in its list ("Photo 3 of 6", "Service 2 of 3", "Person 1 of 4", "Logo 2 of 5", "Testimonial 1 of 2", "List item 4 of 4"). Nothing SHALL be said for a text selection or the caret. The toolbar's Delete button SHALL say in its description that Escape selects the paragraph, item or block around the caret.

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
