## ADDED Requirements

### Requirement: Bare domains redirect to www
Webmio hosting SHALL answer a website's bare custom domain from a redirect server with a permanent address. The server SHALL answer every request to `http://<domain>/<path>` and `https://<domain>/<path>` with a permanent redirect (301) to `https://www.<domain>/<path>`, keeping the path and query, in one step. Over HTTPS it SHALL use a valid certificate for the domain, which it gets when the domain is first requested. It SHALL get or renew a certificate only for a bare domain that is connected to a website on Webmio hosting, as the admin confirms at that moment. Redirects of domains that already have a certificate SHALL keep working while the admin is down. A domain that isn't connected SHALL get no certificate. Over HTTP the server SHALL redirect any hostname to its `www.` in the same way, without asking the admin, so HTTP redirects don't depend on the admin either. A request by the server's address instead of a hostname SHALL get the "No website here" page with status 404.

#### Scenario: Visitor types the bare domain
- **WHEN** `pekarna.cz` is connected to a website on Webmio hosting, its A record points at the redirect server, and a visitor opens `https://pekarna.cz/menu/?den=pondeli`
- **THEN** they get a valid certificate for `pekarna.cz` and a 301 to `https://www.pekarna.cz/menu/?den=pondeli`

#### Scenario: Over HTTP
- **WHEN** a visitor opens `http://pekarna.cz/kontakt/`
- **THEN** they get a 301 straight to `https://www.pekarna.cz/kontakt/`

#### Scenario: Domain not connected
- **WHEN** `cizi-domena.cz` points at the redirect server but is connected to no website, and a visitor opens `https://cizi-domena.cz/`
- **THEN** no certificate is issued for it and the HTTPS connection fails

#### Scenario: Request by address
- **WHEN** someone opens `http://203.0.113.7/`, the redirect server's address
- **THEN** they get the "No website here" page with status 404

#### Scenario: The admin is down
- **WHEN** the admin is unavailable and a visitor opens `https://pekarna.cz/`, whose certificate the redirect server already has
- **THEN** they get the 301 to `https://www.pekarna.cz/` as usual

## MODIFIED Requirements

### Requirement: Infrastructure defined in the repository
The infrastructure that Webmio hosting runs on SHALL be defined in the repository as code, deployable per environment (`dev`, `prod`) with one command. A deployment SHALL output every value the admin needs to publish to it, including the redirect server's address. The redirect server's address SHALL NOT change for as long as the environment exists, including when the server is replaced, since customers' DNS records name it. The admin SHALL get only the permissions publishing needs: reading and writing the hosting bucket, the hostname store, and the distribution's tenants.

#### Scenario: New environment
- **WHEN** an operator deploys the `dev` environment into an empty AWS account with the `webmio.site` and `webmio.net` zones delegated
- **THEN** the deployment succeeds and prints the values to put in the admin's environment, including the redirect server's address

#### Scenario: Replacing the redirect server
- **WHEN** the redirect server is replaced
- **THEN** it keeps the same address, and bare domains redirect again once it is running, getting their certificates anew on their first visit
