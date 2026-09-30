# Spec Delta

## ADDED Requirements

### Requirement: Image source and dimensions
Every `image` node's `src` SHALL be a media key: a plain file name of letters, digits, dots, dashes and underscores that starts with a letter or digit. Its `width` and `height` SHALL be the pixel dimensions of the image and SHALL be greater than zero, because the image's variants and its layout space are derived from them.

#### Scenario: Unknown dimensions
- **WHEN** an image node has width 0
- **THEN** validation reports a missing-image-size error for that image, with category `site`

#### Scenario: Path in source
- **WHEN** an image node's `src` is `../secret.png`
- **THEN** validation reports an invalid-media-key error
