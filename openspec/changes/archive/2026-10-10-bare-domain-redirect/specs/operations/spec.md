## MODIFIED Requirements

### Requirement: Alerts
The operator SHALL be told by email when:
- the admin doesn't answer its health endpoint over HTTPS for three minutes;
- the server's status checks fail;
- the server's disk is more than 80 % full;
- database replication hasn't completed for more than five minutes;
- the redirect server for bare domains doesn't answer for three minutes;
- the redirect server's status checks fail.

They SHALL be told again when it recovers. A server whose status checks fail, the admin's or the redirect server, SHALL be recovered automatically.

#### Scenario: The admin is down
- **WHEN** the admin stops answering for three minutes
- **THEN** the operator gets an email saying the admin is down, and another once it answers again

#### Scenario: Backups stop
- **WHEN** replication of the database fails for more than five minutes
- **THEN** the operator gets an email saying backups are falling behind

#### Scenario: The redirect server is down
- **WHEN** the redirect server stops answering for three minutes
- **THEN** the operator gets an email saying bare domains aren't redirecting, and another once it answers again
