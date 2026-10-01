# Spec Delta

## ADDED Requirements

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
