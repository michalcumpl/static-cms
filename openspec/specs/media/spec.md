# media Specification

## Purpose

Lets members upload images to a project and pick them for the site. Uploads are checked and stripped of metadata, turned into web-sized variants, and kept in a per-project library that is visible only to the project's members.

## Requirements

### Requirement: Uploading images
A member of a project's workspace SHALL be able to upload an image to the project. The server SHALL accept JPEG, PNG and WebP files of at most 20 MB and at most 40 megapixels, judging the type by the file's content, not by its name or declared type. It SHALL refuse anything else, including SVG, HEIC and files that can't be decoded, with a message saying which files are accepted. An animated image SHALL be refused. A successful upload SHALL return the image's media key, width and height.

#### Scenario: Upload a photo
- **WHEN** a member uploads a 4032×3024 JPEG named `Chléb na pultu.jpg`
- **THEN** the upload succeeds and returns a media key starting with `chleb-na-pultu-`, width 4032 and height 3024

#### Scenario: Disguised file refused
- **WHEN** a member uploads an SVG file renamed to `logo.png`
- **THEN** the upload is refused with a message listing JPEG, PNG and WebP

#### Scenario: Too large
- **WHEN** a member uploads a 25 MB JPEG
- **THEN** the upload is refused with a message stating the 20 MB limit

### Requirement: Metadata removal
Every stored file of an uploaded image SHALL be free of EXIF, GPS, XMP and IPTC metadata. The image's orientation SHALL be applied to the pixels before the metadata is removed, so that it looks the same as before.

#### Scenario: Location removed
- **WHEN** a member uploads a phone photo with GPS coordinates in its EXIF data
- **THEN** none of the image's stored files contain EXIF or GPS data

#### Scenario: Rotated photo
- **WHEN** a member uploads a photo stored sideways with an EXIF orientation of 90°
- **THEN** the stored image is upright and its width and height are those of the upright picture

### Requirement: Media keys
An uploaded image SHALL be identified by a media key made of the slug of its original file name (without extension, `image` when that is empty) and the first 8 hexadecimal characters of the SHA-256 of the uploaded file, joined by a dash. Uploading a file with the same content as an existing image of the project, under any name, SHALL return the existing image instead of adding a second one.

#### Scenario: Same file twice
- **WHEN** a member uploads a file as `pult.jpg`, then uploads the same file again as `IMG_0042.jpg`
- **THEN** both uploads return the key starting with `pult-`, and the library lists the image once

### Requirement: Image variants
For every image, the server SHALL store WebP variants in the widths of the width ladder (480, 960, 1600 and 2400 pixels) that are smaller than the image's width, plus one variant at the image's own width, capped at 2400. Each variant SHALL keep the image's aspect ratio and SHALL be stored as `<media key>-<width>.webp`. The server SHALL also keep the uploaded image, without metadata, as the original, which is never published.

#### Scenario: Variants of a large photo
- **WHEN** a 4032-pixel-wide photo is uploaded
- **THEN** variants 480, 960, 1600 and 2400 pixels wide exist

#### Scenario: Variants of a small image
- **WHEN** a 1000-pixel-wide image is uploaded
- **THEN** variants 480, 960 and 1000 pixels wide exist

### Requirement: Media library
Each project SHALL have a library of its images, listing for each its media key, original file name, width, height and upload time, newest first. For an image made by editing another, the list SHALL also give its source's media key and the edit (turn and crop rectangle) relative to that source. The upload time of an edited image SHALL be the time of the edit. Images removed from the library SHALL NOT be listed.

#### Scenario: List after upload
- **WHEN** a member uploads two images
- **THEN** the library lists both, the second one first

#### Scenario: List after an edit
- **WHEN** a member crops `pult-3f9a2c1d` to x 1008, y 0, width 2016, height 2016
- **THEN** the library lists the crop first, with the source `pult-3f9a2c1d`, no turn and that rectangle, and lists `pult-3f9a2c1d` without a source

### Requirement: Removing images from the library
A member SHALL be able to remove an image from the library. Removing SHALL only hide the image from the library: its files SHALL stay available, so documents, older versions and undo that reference it keep working. Uploading the same file again SHALL bring a removed image back into the library.

#### Scenario: Remove an image in use
- **WHEN** a member removes from the library an image that the saved site uses
- **THEN** the library no longer lists it, and the site's preview still shows the image

### Requirement: Cleanup of unreferenced files
An admin command on the server SHALL delete the files and records of images that are removed from the library and not referenced by any stored version of any document of their project. It SHALL NOT delete an image that is the source of an image it keeps. It SHALL report what it deleted and SHALL leave every other image untouched.

#### Scenario: Cleanup
- **WHEN** a project has one removed image that no version references and one removed image that an older version references, and the cleanup command runs
- **THEN** the first image's files are deleted and the second image's files remain

#### Scenario: Source of a kept crop
- **WHEN** a removed image that no version references is the source of a crop that the site uses, and the cleanup command runs
- **THEN** both images' files remain

### Requirement: Access to media
A project's images and the library SHALL be available only to members of the project's workspace. Others SHALL get "not found", or 401 when not signed in. Uploading and removing SHALL be refused when the request comes from another site's page.

#### Scenario: Media of another workspace
- **WHEN** a member of workspace A requests an image or the library of a project in workspace B
- **THEN** the response is "not found"

### Requirement: Media from before the library
On startup, every image file in a project's media folder that has no library record SHALL be registered under its existing file name as its media key, and SHALL get its variants and a metadata-free original. Documents referencing it SHALL need no change.

#### Scenario: Imported demo image
- **WHEN** the server starts with a project whose media folder holds `hero.png` (320×180) from before this change
- **THEN** the library lists `hero.png`, and a variant `hero.png-320.webp` exists

### Requirement: Icon and share files
The server SHALL provide, for any image of a project, two kinds of derived file. Both SHALL be scaled up when the image is smaller, and carry no metadata:
- **Icon files** `<media key>-icon-32.png`, `<media key>-icon-180.png` and `<media key>-icon-512.png`: square PNGs of those sizes. The whole image SHALL fit inside the square, centred, so a wide logo is not cut. The padding SHALL be transparent, except in the 180-pixel icon (for phones' home screens), where it SHALL be white.
- **A share file** `<media key>-share.jpg`: a JPEG of 1200 × 630 pixels, cut from the centre of the image.

They SHALL be made from the image's original, or from its largest variant when the image has no original (images from before the library). Each SHALL be made when first needed and kept for later use. The preview, the ZIP download and publishing SHALL get these files like variant files. The same access rules as for variants SHALL apply. Other names derived from a media key SHALL NOT be served.

#### Scenario: Share file of a portrait photo
- **WHEN** the share file of a 3000 × 4000 photo is requested
- **THEN** it is a 1200 × 630 JPEG cut from the middle of the photo, without EXIF or GPS data

#### Scenario: Icons of a small logo
- **WHEN** the icon files of a 100 × 100 logo are requested
- **THEN** they are 32 × 32, 180 × 180 and 512 × 512 PNGs

#### Scenario: Icons of a wide logo
- **WHEN** the icon files of a 400 × 100 logo are requested
- **THEN** the 512-pixel icon shows the whole logo, 512 × 128 pixels, centred on a transparent square

#### Scenario: Made once
- **WHEN** the share file of an image is needed for a second publish
- **THEN** the file kept from the first time is used

#### Scenario: Unknown derived name
- **WHEN** the preview is asked for `pult-3f9a-icon-64.png`
- **THEN** the response is "not found"

### Requirement: Cleanup of derived files
The cleanup command SHALL delete the icon and share files together with the rest of an image's files, and on the same condition: the image is removed from the library and referenced by no stored version.

#### Scenario: Cleanup of a removed favicon
- **WHEN** a removed image with icon files is referenced by no version, and the cleanup command runs
- **THEN** its variants, original and icon files are all deleted

### Requirement: Editing images
A member SHALL be able to make a new image from an image of the library by turning it and cutting it. The edit SHALL be a turn of 0°, 90°, 180° or 270° clockwise, followed by a crop rectangle given in pixels of the turned picture, which SHALL lie within it and be at least 64 pixels wide and high. The new image SHALL be cut from the source's original, or from its largest variant when the source has no original. It SHALL be stored like an upload: free of metadata, with its own original and its variants. Its original file name SHALL be the source's, and its media key SHALL be made like an upload's, from the slug of that name and the SHA-256 of its stored original. The request SHALL return the new image's media key, width and height.

The source SHALL stay unchanged. An edit of an image that was itself made by an edit SHALL apply to that image's source, with the turn and rectangle given relative to the source, so an image is never cut from a cut. An edit that results in an image the library already holds SHALL return that image, and bring it back into the library if it was removed. An edit that neither turns nor cuts SHALL return the source itself. An edit outside these rules SHALL be refused with the reason, and nothing SHALL be stored. Editing SHALL follow the same access rules as uploading.

#### Scenario: Crop a photo
- **WHEN** a member edits `pult-3f9a2c1d` (4032 × 3024) with no turn and the rectangle x 1008, y 0, width 2016, height 2016
- **THEN** the response is a new image 2016 × 2016 with a key starting with `pult-`, and the library lists it as well as `pult-3f9a2c1d`, which is unchanged

#### Scenario: Turn a sideways scan
- **WHEN** a member edits a 3000 × 2000 image with a turn of 90° and a rectangle covering all of the turned picture (2000 × 3000)
- **THEN** the new image is 2000 × 3000 and shows the picture turned clockwise

#### Scenario: Edit an edited image
- **WHEN** a member edits a 1000 × 1000 crop of `pult-3f9a2c1d` with the rectangle x 0, y 0, width 4032, height 3024
- **THEN** the result is cut from `pult-3f9a2c1d`'s original, and as nothing is turned or cut, `pult-3f9a2c1d` itself is returned

#### Scenario: Same edit twice
- **WHEN** a member makes the same crop of the same image twice
- **THEN** both requests return the same media key, and the library lists that image once

#### Scenario: Crop outside the picture
- **WHEN** a member edits a 1000 × 800 image with the rectangle x 500, y 0, width 600, height 400
- **THEN** the edit is refused with a message that the crop must lie within the picture, and nothing is added

#### Scenario: Too small
- **WHEN** a member edits an image with a rectangle 40 pixels wide
- **THEN** the edit is refused with a message stating the 64-pixel minimum
