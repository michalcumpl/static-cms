## MODIFIED Requirements

### Requirement: Custom domain
A member SHALL be able to connect a domain to a published project, and disconnect it. Connecting SHALL accept a bare domain (such as `anideti.cz`) or a subdomain (such as `web.anideti.cz`). It SHALL show the DNS records to set at the domain's registrar, and the domain's state: waiting for DNS, issuing the certificate, or ready. A member SHALL be able to check the state again on demand. A domain already connected to another project SHALL be refused.

Where the website is served depends on its hosting:
- **Webmio hosting:** a subdomain is served as itself, and a bare domain at its `www.` subdomain. Each needs a CNAME record pointing at the website's own target, `<name>.sites.webmio.net`, where `<name>` is the website's free address name. The target SHALL NOT change for as long as the website exists. The domain SHALL count as pointed only when its CNAME record names this website's target. The website's address is the served hostname. A domain that the CDN refuses because another service uses it SHALL be refused with a message saying so.
- **Webmio hosting, bare domain:** the page SHALL also show an A record for the bare domain pointing at the redirect server, and ask the member to remove the registrar's forwarding and any other A or AAAA records of the bare domain. The bare domain SHALL have a state of its own: waiting for DNS (its addresses aren't exactly the redirect server's), issuing the certificate, or redirecting (`https://<domain>/` answers with a redirect to `https://www.<domain>/`). Checking SHALL request `https://<domain>/` once its DNS points at the redirect server, so its certificate is issued before the first visitor needs it. The domain's state, its address and the free address's redirect SHALL depend on `www.` alone, so a bare domain still forwarded at the registrar doesn't hold the website back. Where Webmio hosting has no redirect server, as in development, the page SHALL ask to forward the bare domain to `https://www.<domain>` at the registrar instead, and show no A record or bare-domain state.
- **Netlify:** `www.` is added alongside a bare domain, with an A record for the bare domain and a CNAME record for `www.`.

#### Scenario: Connect a bare domain on Webmio hosting
- **WHEN** a member connects `pekarna.cz` to the website `pekarna-u-lipy.webmio.site`, and the redirect server's address is `203.0.113.7`
- **THEN** the project shows a CNAME record for `www.pekarna.cz` pointing at `pekarna-u-lipy.sites.webmio.net` and an A record for `pekarna.cz` pointing at `203.0.113.7`, asks to remove the registrar's forwarding and other records of `pekarna.cz`, and shows the state "waiting for DNS" for both

#### Scenario: Bare domain redirecting
- **WHEN** `pekarna.cz` has only the A record `203.0.113.7`, and a member checks again
- **THEN** `https://pekarna.cz/` is requested, it redirects to `https://www.pekarna.cz/`, and the bare domain's state is "redirecting"

#### Scenario: Bare domain with a leftover record
- **WHEN** `pekarna.cz` has the A records `203.0.113.7` and the registrar's forwarding address, and a member checks again
- **THEN** the bare domain's state stays "waiting for DNS", and the page still asks to remove the other records

#### Scenario: Bare domain still forwarded at the registrar
- **WHEN** the CNAME record for `www.pekarna.cz` is set and its certificate issued, but `pekarna.cz` still points at the registrar's forwarding
- **THEN** the domain's state is "ready" and the site's address is `https://www.pekarna.cz`, while the bare domain's state is "waiting for DNS"

#### Scenario: No redirect server
- **WHEN** a member connects `pekarna.cz` on Webmio hosting without a redirect server
- **THEN** the project shows the CNAME record for `www.pekarna.cz` and asks to forward `pekarna.cz` to `https://www.pekarna.cz` at the registrar

#### Scenario: Connect a subdomain on Webmio hosting
- **WHEN** a member connects `web.anideti.cz` to the website `anideti.webmio.site`
- **THEN** the project shows a CNAME record for `web.anideti.cz` pointing at `anideti.sites.webmio.net`, and no A record

#### Scenario: Domain becomes ready on Webmio hosting
- **WHEN** the CNAME record for `www.pekarna.cz` points at `pekarna-u-lipy.sites.webmio.net`, the certificate has been issued, and a member checks again
- **THEN** the state is "ready", the site's address is `https://www.pekarna.cz`, and the next publish uses it for its sitemap and canonical links

#### Scenario: Pointing at another website's target
- **WHEN** the CNAME record for `www.pekarna.cz` points at `jina-pekarna.sites.webmio.net`, the target of another website, and a member checks again
- **THEN** the state stays "waiting for DNS", and the page still shows the record pointing at `pekarna-u-lipy.sites.webmio.net`

#### Scenario: Domain used elsewhere
- **WHEN** a member connects a domain that the CDN reports as already used by another service
- **THEN** the domain is refused with a message saying it is connected to another service and must be removed there first

#### Scenario: Connect a bare domain
- **WHEN** a member connects `anideti.cz` to a website on Netlify
- **THEN** the project shows an A record for `anideti.cz` and a CNAME record for `www.anideti.cz` pointing at the project's `netlify.app` address, and the state "waiting for DNS"

#### Scenario: Domain becomes ready
- **WHEN** the DNS records are set and Netlify has issued the certificate, and a member checks again
- **THEN** the state is "ready" and the site's address is `https://anideti.cz`

#### Scenario: Invalid domain
- **WHEN** a member enters `https://anideti.cz/kontakt`
- **THEN** the domain is refused with a message asking for a domain name only, such as `anideti.cz`
