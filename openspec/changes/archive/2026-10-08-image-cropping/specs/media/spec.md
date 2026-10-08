## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Media library
Each project SHALL have a library of its images, listing for each its media key, original file name, width, height and upload time, newest first. For an image made by editing another, the list SHALL also give its source's media key and the edit (turn and crop rectangle) relative to that source. The upload time of an edited image SHALL be the time of the edit. Images removed from the library SHALL NOT be listed.

#### Scenario: List after upload
- **WHEN** a member uploads two images
- **THEN** the library lists both, the second one first

#### Scenario: List after an edit
- **WHEN** a member crops `pult-3f9a2c1d` to x 1008, y 0, width 2016, height 2016
- **THEN** the library lists the crop first, with the source `pult-3f9a2c1d`, no turn and that rectangle, and lists `pult-3f9a2c1d` without a source

### Requirement: Cleanup of unreferenced files
An admin command on the server SHALL delete the files and records of images that are removed from the library and not referenced by any stored version of any document of their project. It SHALL NOT delete an image that is the source of an image it keeps. It SHALL report what it deleted and SHALL leave every other image untouched.

#### Scenario: Cleanup
- **WHEN** a project has one removed image that no version references and one removed image that an older version references, and the cleanup command runs
- **THEN** the first image's files are deleted and the second image's files remain

#### Scenario: Source of a kept crop
- **WHEN** a removed image that no version references is the source of a crop that the site uses, and the cleanup command runs
- **THEN** both images' files remain
