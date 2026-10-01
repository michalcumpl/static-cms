# Spec Delta

## MODIFIED Requirements

### Requirement: Site node
The root node SHALL be of type `site`. It SHALL carry:
- the schema version (`6`);
- the site name;
- a language tag (for example `cs`);
- an optional base URL;
- a site description, which may be empty;
- a favicon, a default share image and a logo, each a list of at most one `image` node;
- a switch "show the site name in the header", `true` or `false`;
- two switches, "allow AI search" and "allow AI training", each `true` or `false`;
- a reference to the theme, a reference to the navigation, and a reference to the business details;
- an ordered list of pages;
- the ID of the home page.

The home page ID SHALL name a page in the site's list of pages. The position of a page in the list SHALL NOT determine which page is home.

#### Scenario: Missing language
- **WHEN** the site node has an empty language
- **THEN** validation reports an error, because every page needs a `lang` attribute

#### Scenario: Home page
- **WHEN** a site lists pages `page_contact`, `page_home` and its home page ID is `page_home`
- **THEN** `page_home` is treated as the home page, served at the site root

#### Scenario: Home page is not a page of the site
- **WHEN** the site's home page ID is `page_gone`, which is not in its list of pages
- **THEN** validation reports a missing-home error

#### Scenario: Unsupported schema version
- **WHEN** a document has schema version 5
- **THEN** validation reports an unsupported-schema-version error

#### Scenario: Two favicons
- **WHEN** the site's favicon list holds two image nodes
- **THEN** validation reports a too-many-items error

#### Scenario: Two logos
- **WHEN** the site's logo list holds two image nodes
- **THEN** validation reports a too-many-items error

### Requirement: Theme
The theme SHALL define colors (primary, secondary, background, text), a heading font and a body font, a corner radius, and a content width. Color values SHALL be hex colors (`#rgb` or `#rrggbb`). Each font SHALL be an ID from the font catalog (see the theming capability). The radius and content width SHALL be CSS lengths. The colors SHALL meet the contrast rules of the theming capability: text on background, primary on background, text on secondary and primary on secondary, each at least 4.5:1.

#### Scenario: Low-contrast theme
- **WHEN** the theme's text color is `#999999` on background `#ffffff`
- **THEN** validation reports a contrast error with the measured ratio

#### Scenario: Font list instead of an ID
- **WHEN** the theme's body font is `Georgia, serif`
- **THEN** validation reports an invalid-theme-value error saying the body font must be chosen from the catalog

#### Scenario: Low-contrast links
- **WHEN** the theme's primary color is `#7fb2e5` on background `#ffffff`
- **THEN** validation reports a contrast error for links and buttons

### Requirement: Image accessibility
Every `image` node SHALL either have non-empty alt text or be explicitly marked decorative. Three kinds of image are exempt:
- the image of a logo item, whose alt text is the partner's name;
- the site's favicon, which is never shown as an image on a page;
- the site's logo, whose alt text is the site name, or empty when the name is shown next to it.

An image marked decorative SHALL have empty alt text.

#### Scenario: Missing alt text
- **WHEN** an image has empty alt text and is not marked decorative
- **THEN** validation reports an error asking for a description or the decorative flag

#### Scenario: Decorative image
- **WHEN** an image is marked decorative with empty alt text
- **THEN** the document is valid

#### Scenario: Gallery photo without description
- **WHEN** a gallery item's image has empty alt text and is not decorative
- **THEN** validation reports a missing-alt error for that image

#### Scenario: Logo described by its name
- **WHEN** a logo item named "Nadace Harmonie" has an image with empty alt text that is not marked decorative
- **THEN** the document is valid

#### Scenario: Favicon without description
- **WHEN** the site's favicon image has empty alt text and is not marked decorative
- **THEN** the document is valid

#### Scenario: Site logo without description
- **WHEN** the site's logo image has empty alt text and is not marked decorative
- **THEN** the document is valid

#### Scenario: Share image without description
- **WHEN** a page's share image has empty alt text and is not marked decorative
- **THEN** validation reports a missing-alt error saying that the share image of that page needs a description

## ADDED Requirements

### Requirement: Site name in the header without a logo
The switch "show the site name in the header" SHALL only be off when the site has a logo. A site with the switch off and no logo SHALL get a warning, and its header SHALL show the name.

#### Scenario: Name hidden without a logo
- **WHEN** a site has no logo and the switch "show the site name in the header" is off
- **THEN** validation reports a warning that the header shows the name until a logo is chosen, and the document is valid

### Requirement: Upgrading version-5 documents
A version-5 document SHALL be upgradable to version 6 without losing content. The upgrade SHALL:
- replace each theme font list with a catalog ID: a list whose first font is Georgia, or that ends in the generic family `serif`, becomes `georgia`; any other list becomes `system-sans`;
- give the site an empty logo list and the switch "show the site name in the header" on;
- set the schema version to 6.

#### Scenario: Upgrade the starter theme
- **WHEN** a version-5 document with heading font `Georgia, 'Times New Roman', serif` and body font `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` is upgraded
- **THEN** the result has schema version 6, heading font `georgia`, body font `system-sans`, no logo and the site name shown in the header
- **AND** every other node and property is unchanged
