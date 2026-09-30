# Spec Delta

## MODIFIED Requirements

### Requirement: Images
Images SHALL render as `<img>` with `src`, `srcset`, `sizes`, `alt`, `width` and `height`, and `loading="lazy"` except in a hero. The `srcset` SHALL list every variant of the image's width ladder (the ladder widths 480, 960, 1600 and 2400 that are smaller than the image's width, plus the image's own width capped at 2400) as `<base path>assets/images/<media key>-<width>.webp <width>w`. The `src` SHALL be the largest of those variants that is at most 1600 pixels wide. `width` and `height` SHALL be the image's dimensions, so the browser reserves its space. `sizes` SHALL depend only on the block the image is in, not on the theme. A decorative image SHALL render with `alt=""`.

#### Scenario: Decorative image
- **WHEN** rendering an image marked decorative
- **THEN** the output is an `<img>` with `alt=""`

#### Scenario: Large hero image
- **WHEN** rendering a hero image with media key `pult-3f9a2c1d`, width 4032 and height 3024, at the default base path
- **THEN** its `srcset` lists `/assets/images/pult-3f9a2c1d-480.webp 480w`, `…-960.webp 960w`, `…-1600.webp 1600w` and `…-2400.webp 2400w`, its `src` is `/assets/images/pult-3f9a2c1d-1600.webp`, and it has `width="4032" height="3024"` and no `loading` attribute

#### Scenario: Small image
- **WHEN** rendering an image with media key `hero.png`, width 320 and height 180
- **THEN** its `srcset` lists only `/assets/images/hero.png-320.webp 320w` and its `src` is that file

## ADDED Requirements

### Requirement: Image files used by a document
Rendering SHALL be able to report, for a document, the image files its pages use: the variant file names of every image reachable from the site, each once, in a stable order. These SHALL be exactly the image files the rendered pages link to.

#### Scenario: Files of the demo site
- **WHEN** listing the image files of a site whose only image has media key `hero.png` and width 320
- **THEN** the list is `hero.png-320.webp`
