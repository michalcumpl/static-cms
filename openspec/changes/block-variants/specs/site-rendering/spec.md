## ADDED Requirements

### Requirement: Block variant rendering
Each variant SHALL render as semantic HTML with a class naming it on the block's root, so templates can style it:
- **hero `cover`:** the image fills the block behind the text (`hero-cover`); the text sits on a shade made from the theme's text colour, in the theme's background colour, so it reads over any photo. The image is not lazy-loaded and is sized for the full width. Without an image the hero renders as `beside`.
- **services `list`** (`services-as-list`): one row per service with its name and price side by side and the description under them, without card borders.
- **services `accordion`** (`services-as-accordion`): one `<details>` per service with a description, its `<summary>` holding the name and the price; a service without a description is a plain row. It works without JavaScript.
- **team `list`** (`team-as-list`): one row per person with the name, role and text, and no portraits.
- **gallery `whole`** (`gallery-whole`): each image shown complete inside the same cell size, on the theme's secondary colour.

The default variants SHALL render exactly as before format 9. Every variant SHALL pass the site's HTML validation.

#### Scenario: Full-photo hero
- **WHEN** a hero with the layout `cover`, an image and a button is rendered
- **THEN** the section has the classes `hero` and `hero-cover`, the image has `sizes="100vw"` and is not lazy, and the heading and button come after it

#### Scenario: Practice areas as an accordion
- **WHEN** a services block in the `accordion` layout shows eight services with descriptions
- **THEN** it renders eight `<details>` elements, each `<summary>` with the service's name and price, all closed

#### Scenario: Team as a list
- **WHEN** a team block in the `list` layout shows a person with a portrait
- **THEN** the person's row has the name, role and text and no image

#### Scenario: Whole screenshots
- **WHEN** a gallery with the image fit `whole` is rendered
- **THEN** its grid carries the class `gallery-whole`, and the images keep their links to the largest variant
