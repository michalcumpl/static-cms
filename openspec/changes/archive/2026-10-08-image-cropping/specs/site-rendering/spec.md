## MODIFIED Requirements

### Requirement: Images
Images SHALL render as `<img>` with `src`, `srcset`, `sizes`, `alt`, `width` and `height`, and `loading="lazy"` except in a hero. The `srcset` SHALL list every variant of the image's width ladder (the ladder widths 480, 960, 1600 and 2400 that are smaller than the image's width, plus the image's own width capped at 2400) as `<base path>assets/images/<media key>-<width>.webp <width>w`. The `src` SHALL be the largest of those variants that is at most 1600 pixels wide. `width` and `height` SHALL be the image's dimensions, so the browser reserves its space. `sizes` SHALL depend only on the block the image is in, not on the theme. A decorative image SHALL render with `alt=""`. An image whose focal point isn't the centre (50, 50) SHALL carry the class `focus-<x>-<y>`, and the page's `<head>` SHALL end with one `<style>` element holding, for each such class on the page, the rule `.focus-<x>-<y>{object-position:<x>% <y>%}`, so that wherever the stylesheet cuts the image to a shape, the cut keeps the focal point in view. A page without such images SHALL have no `<style>` element. Pages SHALL carry no `style` attributes.

#### Scenario: Decorative image
- **WHEN** rendering an image marked decorative
- **THEN** the output is an `<img>` with `alt=""`

#### Scenario: Large hero image
- **WHEN** rendering a hero image with media key `pult-3f9a2c1d`, width 4032 and height 3024, at the default base path
- **THEN** its `srcset` lists `/assets/images/pult-3f9a2c1d-480.webp 480w`, `…-960.webp 960w`, `…-1600.webp 1600w` and `…-2400.webp 2400w`, its `src` is `/assets/images/pult-3f9a2c1d-1600.webp`, and it has `width="4032" height="3024"` and no `loading` attribute

#### Scenario: Small image
- **WHEN** rendering an image with media key `hero.png`, width 320 and height 180
- **THEN** its `srcset` lists only `/assets/images/hero.png-320.webp 320w` and its `src` is that file

#### Scenario: Portrait framed on the face
- **WHEN** rendering a page with a testimonial photo whose focal point is 40, 30
- **THEN** the `<img>` has the classes `testimonial-photo focus-40-30`, the page's head ends with `<style>.focus-40-30{object-position:40% 30%}</style>`, and the page passes `html-validate`

#### Scenario: Centred image
- **WHEN** rendering a page whose images all have the focal point 50, 50
- **THEN** the page has no `<style>` element and no focal point class, and the output is the same as before focal points existed

#### Scenario: Only where shown
- **WHEN** the site's contact page shows a framed photo and no other page does
- **THEN** only the contact page has a `<style>` element
