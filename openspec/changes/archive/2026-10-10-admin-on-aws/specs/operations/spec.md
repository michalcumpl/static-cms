## Purpose

Runs the admin as a service for customers: at its address over HTTPS, with every customer's data kept somewhere other than the one server, new versions deployed safely, problems reported to the operator, and mail delivered from Webmio's own domain.

## ADDED Requirements

### Requirement: The admin's address
The admin SHALL be served at `https://app.webmio.eu` in production, with a certificate that renews itself. Plain HTTP requests SHALL be redirected permanently to HTTPS. Uploads up to the media library's limit SHALL reach the admin.

#### Scenario: Sign-in page over HTTPS
- **WHEN** a person opens `http://app.webmio.eu/signin`
- **THEN** they are redirected (301) to `https://app.webmio.eu/signin`, which is served with a valid certificate

#### Scenario: A large upload
- **WHEN** a member uploads a 19 MB photo
- **THEN** it reaches the media library and is accepted

### Requirement: Health endpoint
The admin SHALL answer `GET /healthz` with status 200 once its database is open and its migrations are applied, and with status 503 otherwise. The answer SHALL say nothing about customers or their data, and SHALL need no sign-in.

#### Scenario: Healthy admin
- **WHEN** the admin is running with its database migrated
- **THEN** `GET /healthz` answers 200

#### Scenario: Database unavailable
- **WHEN** the database can't be opened
- **THEN** `GET /healthz` answers 503

### Requirement: Data kept off the server
Nothing customers create SHALL exist only on the admin's server:
- Uploaded images, their sizes, icons and share images SHALL be stored in object storage.
- Every change to the database SHALL be replicated off the server within a few seconds.

When the server is lost, a new one SHALL start from the latest replicated database and the stored images, with at most the last few seconds of changes missing. An operator SHALL be able to restore the database as it was at an earlier moment within the last 30 days.

#### Scenario: Server replaced
- **WHEN** the admin's server is terminated and the infrastructure creates a new one
- **THEN** the new admin starts with the projects, saved versions, users and images that existed seconds before the old server stopped

#### Scenario: Restoring an earlier moment
- **WHEN** an operator restores the database as it was at 9:00 yesterday
- **THEN** the admin holds exactly what it held then, and the images those projects use are still there

#### Scenario: An uploaded image
- **WHEN** a member uploads an image
- **THEN** its original and its sizes are in object storage before the upload is reported as done

### Requirement: Deploying new versions
A new version of the admin SHALL be deployed only after the project's checks passed on its main branch. A deploy SHALL replace the running admin and wait for the new one to answer its health endpoint. If it doesn't answer within two minutes, the previous version SHALL be started again. A deploy SHALL never lose or roll back data: the database and images stay as they are. Deploying SHALL need no AWS key stored outside AWS.

#### Scenario: A successful deploy
- **WHEN** a change is merged to the main branch and its checks pass
- **THEN** the new version is running at `app.webmio.eu` within minutes, and the deploy is recorded with its version

#### Scenario: A version that doesn't start
- **WHEN** a new version's admin never answers its health endpoint
- **THEN** the previous version is running again, and the deploy is reported as failed

#### Scenario: Checks fail
- **WHEN** the checks of a change on the main branch fail
- **THEN** nothing is deployed

### Requirement: Alerts
The operator SHALL be told by email when:
- the admin doesn't answer its health endpoint over HTTPS for three minutes;
- the server's status checks fail;
- the server's disk is more than 80 % full;
- database replication hasn't completed for more than five minutes.

They SHALL be told again when it recovers. A server whose status checks fail SHALL be recovered automatically.

#### Scenario: The admin is down
- **WHEN** the admin stops answering for three minutes
- **THEN** the operator gets an email saying the admin is down, and another once it answers again

#### Scenario: Backups stop
- **WHEN** replication of the database fails for more than five minutes
- **THEN** the operator gets an email saying backups are falling behind

### Requirement: Sending mail
In production the admin SHALL send sign-in links and invitations from an address at `mail.webmio.net`. The domain SHALL be authenticated, so receiving servers can check that the mail is Webmio's (DKIM, SPF and DMARC). The address SHALL accept no incoming mail.

#### Scenario: Sign-in link
- **WHEN** a person asks for a sign-in link at `app.webmio.eu`
- **THEN** they receive it from `mail.webmio.net`, and their mail service reports it as signed (DKIM) and passing SPF and DMARC
