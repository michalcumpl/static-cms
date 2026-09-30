# Spec Delta

## MODIFIED Requirements

### Requirement: Image description
For the hero image, the owner SHALL be able to edit the alt text and mark the image as decorative. Marking it decorative SHALL clear the alt text. When an image has just been placed and has neither alt text nor the decorative flag, the Image panel SHALL ask for a description.

#### Scenario: Mark as decorative
- **WHEN** the owner marks the hero image as decorative
- **THEN** the image's decorative flag is set and its alt text is empty

#### Scenario: Description asked for after choosing
- **WHEN** the owner chooses an image for the hero
- **THEN** the Image panel is shown with the alt text field focused and a hint to describe the image or mark it decorative

## ADDED Requirements

### Requirement: Hero image
The owner SHALL be able to add an image to a hero that has none, replace the hero's image, and remove it. Adding and replacing SHALL open the media library. Replacing SHALL keep the image's alt text and decorative flag only if the owner chooses the same image again; otherwise the new image starts without alt text. Each of these actions SHALL be one undoable action, and SHALL store the image's media key, width and height in the document.

#### Scenario: Add an image to a hero
- **WHEN** the owner uses "Add image" on a hero without an image and chooses an image in the library
- **THEN** the hero shows the image, and the document's hero has one image node with that image's media key, width and height

#### Scenario: Remove the hero image
- **WHEN** the owner selects the hero image and uses "Remove", then undoes
- **THEN** the hero first has no image, then has the same image with its alt text again

### Requirement: Media library dialog
The editor SHALL offer a media library dialog that lists the project's images as thumbnails with their file names, lets the owner upload images by choosing files or dropping them onto the dialog, shows the progress and outcome of each upload, and lets the owner choose an image or remove one from the library. A refused upload SHALL show the server's reason. A newly uploaded image SHALL appear in the list and be selectable without reloading.

#### Scenario: Upload and choose
- **WHEN** the owner opens the library from the hero, uploads a JPEG, and chooses it
- **THEN** the dialog closes, the hero shows the uploaded image, and the change is unsaved

#### Scenario: Refused upload
- **WHEN** the owner drops a PDF onto the library dialog
- **THEN** the dialog shows that only JPEG, PNG and WebP images are accepted, and nothing is added
