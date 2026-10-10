# Spec Delta

## ADDED Requirements

### Requirement: Banner rendering
A banner SHALL render as a full-width band.

With an image, the band SHALL be filled by the photo, cropped around its focal point. Over the
photo, a panel SHALL show the banner's heading as an `<h2>`, its text when not empty, and its
button. The panel SHALL be the same as the full-photo hero's, so its text keeps the theme's
contrast whatever the photo. The photo SHALL load lazily and be offered in the sizes of a
full-width image.

Without an image, the band SHALL have the theme's primary colour, with the heading, text and
button in the colour that contrasts with it.

A banner SHALL need no script.

#### Scenario: A photo band
- **WHEN** the home page renders a banner "Last minute" with a photo and a button "Všechny
  zájezdy"
- **THEN** the page has a full-width band with the photo, and over it a panel with `<h2>Last
  minute</h2>` and the button

#### Scenario: A colour band
- **WHEN** a banner has no image
- **THEN** it renders as a band in the primary colour with its heading, text and button, and no
  image

#### Scenario: The photo loads when needed
- **WHEN** a banner with a photo is rendered
- **THEN** its `<img>` has `loading="lazy"` and `sizes="100vw"`
