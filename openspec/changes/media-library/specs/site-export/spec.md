# Spec Delta

## MODIFIED Requirements

### Requirement: Media files
The caller SHALL supply the bytes of every image file the document uses, keyed by file name (the variant files `<media key>-<width>.webp`). Export SHALL include exactly those files under `assets/images/`, and SHALL fail with an error naming the missing file if a used file's bytes were not supplied.

#### Scenario: Missing media
- **WHEN** a hero image has media key `team-1a2b3c4d` and width 800, and no bytes were supplied for `team-1a2b3c4d-800.webp`
- **THEN** export fails with an error naming `team-1a2b3c4d-800.webp`

#### Scenario: Unused media
- **WHEN** bytes are supplied for an image file that no node uses
- **THEN** that file is not included in the export

#### Scenario: All variants exported
- **WHEN** exporting a site whose hero image is 1000 pixels wide with media key `pult-3f9a2c1d`
- **THEN** the tree contains `assets/images/pult-3f9a2c1d-480.webp`, `…-960.webp` and `…-1000.webp`, and no original
