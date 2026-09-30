# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
