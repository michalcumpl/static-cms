## MODIFIED Requirements

### Requirement: Collections
The site SHALL hold four collections, each an ordered list of items held once per site:
- **services:** service items, each with a name, a description (bold, italic and links) and an optional price text;
- **team:** people, each with a name, an optional role, an optional short text (bold, italic and links) and at most one portrait image;
- **testimonials:** testimonials, each with a quote, the person's name, an optional detail and at most one photo;
- **FAQs:** FAQ items, each with a question and an answer (bold, italic and links; line breaks allowed).

An item SHALL belong to exactly one collection and SHALL NOT appear inside a block. Every item SHALL have:
- a non-empty name (services, people, testimonials);
- a non-empty quote (testimonials);
- a non-empty question and answer (FAQ items).

Images SHALL follow the image accessibility rule. Messages about an item SHALL name the collection and the item's position, such as "Service 3" or "Question 2", never a node ID. Each message SHALL say where the item can be fixed: the What you offer section for services and questions, the About you section for people and testimonials (see the project-page capability). An empty collection SHALL be valid.

#### Scenario: Valid collections
- **WHEN** the site has two services with names, one person with a name and a described portrait, one testimonial with a quote and a name, and one FAQ item with a question and an answer
- **THEN** the document is valid

#### Scenario: Service without a name
- **WHEN** the third service in the collection has an empty name
- **THEN** validation reports an empty-name error for "Service 3", which says to edit it in What you offer

#### Scenario: Question without an answer
- **WHEN** the second FAQ item has the question "Do you deliver?" and an empty answer
- **THEN** validation reports an error that question 2 needs its answer

#### Scenario: Item inside a block
- **WHEN** a `services` block's chosen list references a `service_item` node directly instead of an item reference
- **THEN** validation reports a disallowed-type error for that block
