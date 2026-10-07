## ADDED Requirements

### Requirement: Taking a deleted website offline
Deleting a published project SHALL first delete its Netlify site, which also releases its custom domain, and only then delete the project. When Netlify can't be reached or refuses the workspace's token, the project SHALL NOT be deleted, and the owner SHALL see why (as for a failed publish, asking to reconnect Netlify when the token is refused). When the workspace is no longer connected to Netlify, the project SHALL be deleted and its Netlify site left as it is. A restored project SHALL have no site, address or domain: publishing it again creates a new site.

#### Scenario: Offline at once
- **WHEN** an owner deletes a website published on Netlify with the domain `pekarnaulipy.cz`
- **THEN** its Netlify site is deleted, and the domain can be connected to another project right away

#### Scenario: Netlify down
- **WHEN** an owner deletes a published website while Netlify can't be reached
- **THEN** the website isn't deleted, stays online, and the owner is told Netlify couldn't be reached

#### Scenario: Publish after restoring
- **WHEN** an owner restores a deleted website and publishes it
- **THEN** a new Netlify site is created for it
