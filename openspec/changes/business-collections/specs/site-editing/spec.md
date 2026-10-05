# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
