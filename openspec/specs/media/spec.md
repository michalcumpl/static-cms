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
Each project SHALL have a library of its images, listing for each its media key, original file name, width, height and upload time, newest first. Images removed from the library SHALL NOT be listed.

#### Scenario: List after upload
- **WHEN** a member uploads two images
- **THEN** the library lists both, the second one first

### Requirement: Removing images from the library
A member SHALL be able to remove an image from the library. Removing SHALL only hide the image from the library: its files SHALL stay available, so documents, older versions and undo that reference it keep working. Uploading the same file again SHALL bring a removed image back into the library.

#### Scenario: Remove an image in use
- **WHEN** a member removes from the library an image that the saved site uses
- **THEN** the library no longer lists it, and the site's preview still shows the image

### Requirement: Cleanup of unreferenced files
An admin command on the server SHALL delete the files and records of images that are removed from the library and not referenced by any stored version of any document of their project. It SHALL report what it deleted and SHALL leave every other image untouched.

#### Scenario: Cleanup
- **WHEN** a project has one removed image that no version references and one removed image that an older version references, and the cleanup command runs
- **THEN** the first image's files are deleted and the second image's files remain

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
