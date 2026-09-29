# Spec Delta

## MODIFIED Requirements

### Requirement: Validation result
Validation SHALL return all problems found, not only the first. Each problem SHALL have a severity (`error` or `warning`), a category, a machine-readable code, a human-readable message, and the ID of the node (and property, when applicable) it concerns. The category SHALL be `structure` for problems with the document's shape (identifiers, node types, property values, references, mark ranges, cycles, reachability) and `site` for problems with the site rules (pages, slugs, links, headings, images, theme). A document with any error SHALL be considered invalid. Warnings alone SHALL NOT make a document invalid.

#### Scenario: Multiple problems reported together
- **WHEN** a document has a duplicate slug and an image without alt text
- **THEN** validation returns both errors in one result

#### Scenario: Warnings only
- **WHEN** a document's only problem is an unreachable node
- **THEN** the document is considered valid and the warning is returned

#### Scenario: Problem categories
- **WHEN** a document has a dangling reference and an empty subheading
- **THEN** the dangling reference is reported with category `structure` and the empty subheading with category `site`
