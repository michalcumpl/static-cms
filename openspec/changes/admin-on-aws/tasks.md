# Tasks

## 1. The admin, ready for a server

- [x] 1.1 Add `GET /healthz` (spec "Health endpoint": 200 once the database is open and migrated, 503 otherwise, no sign-in, no data); verify route tests for both answers and that it needs no session
- [x] 1.2 Add `media-store.ts` with the folder store and the S3 store (design decision 2), selected by `MEDIA_BUCKET`; verify a contract test suite against the folder store, and against S3 when `MEDIA_S3_CONTRACT=1` with a bucket
- [x] 1.3 Move `media.ts`, the media route and `purgeProject` onto the store, making their file operations async, and add the immutable cache header to the media route; verify the existing media, cropping, import, export and deletion tests pass unchanged against the folder store, plus a media test suite run against an in-memory store
- [x] 1.4 Add the `pnpm admin media-upload` command (copies `MEDIA_DIR` into `MEDIA_BUCKET` under the same keys, skipping same-size objects, printing what it copied); verify a test against a folder-to-memory store copy and the command's usage text
- [x] 1.5 Add the SES mode to `createMailer` (`MAIL_TRANSPORT=ses`, nodemailer's SES transport over `@aws-sdk/client-sesv2`, `MAIL_FROM` required); verify mail tests with a mocked SES client cover the message sent and the missing-`MAIL_FROM` error, and that SMTP and the outbox behave as before
- [x] 1.6 Add `apps/admin/Dockerfile` and `.dockerignore` (design decision 7); verify the image builds for `linux/arm64`, starts with an empty data folder, answers `/healthz`, and serves the sign-in page

## 2. Infrastructure (`infra/`)

- [x] 2.1 Split `infra/src/index.ts` into `hosting.ts`, `admin.ts`, `github.ts` and `index.ts` (design decision 10) and extract the hosting policy into a function; verify `pulumi preview --stack dev` shows no changes to existing resources
- [x] 2.2 Add the media and backups buckets (private; versioned with a 30-day lifecycle for backups), the ECR repository with its lifecycle policy, the SSM parameters (environment, Caddyfile, Litestream configuration, image tag, `adminSecretKey`), and the stack settings `adminDomain`, `adminZone`, `alertEmail`, `localAdminUser`; verify `pulumi preview --stack dev`
- [x] 2.3 Add the SES identity for `mail.<netDomain>` with Easy DKIM, the custom MAIL FROM domain, SPF and DMARC records in the `netDomain` zone; verify `pulumi preview --stack dev`
- [x] 2.4 Add the instance (design decision 1): the role and instance profile (design decision 4), the security group, the Elastic IP, the `adminZone` A record, and the user-data bootstrap installing Docker, the CloudWatch agent, the systemd units, `webmio-deploy` and the replication-lag timer; verify the bootstrap scripts with `shellcheck` and `pulumi preview --stack dev`
- [x] 2.5 Add the alert topics in `eu-central-1` and `us-east-1`, the Route 53 health check, the alarms of design decision 8 (EC2 recover on system status failure) and the log groups; verify `pulumi preview --stack dev`
- [x] 2.6 Add the GitHub OIDC provider and the deploy role (design decision 6: trust only `main` and the `dev` environment; ECR push, SSM send-command on the tagged instance); verify `pulumi preview --stack dev`

## 3. Deploys

- [x] 3.1 Add `.github/workflows/deploy.yml` (after CI succeeds on `main`, plus `workflow_dispatch` for `dev`): ARM runner, OIDC, build and push, `webmio-deploy` through SSM, failing when it fails; verify it with `actionlint`
- [x] 3.2 Deploy the `dev` stack (`pulumi up`, operator approves) and run the first deploy by `workflow_dispatch`; verify `https://app.dev.webmio.net/healthz` answers 200 over a valid certificate and that HTTP redirects to HTTPS

## 4. Verification on `dev`

- [ ] 4.1 Through `app.dev.webmio.net`: sign in with a link sent by SES (from `mail.dev.webmio.net`, signed DKIM, passing SPF and DMARC), upload a 19 MB photo, publish to Webmio hosting; verify the images are in the media bucket and the website is live
- [x] 4.2 Deploy a version whose `/healthz` never answers (a temporary branch, `workflow_dispatch`); verify the previous version is running again and the workflow failed; then deploy `main` again
- [ ] 4.3 Restore drill: terminate the `dev` instance and let Pulumi (`pulumi up`) or the recover action bring a new one; verify the admin starts with the data from before, and record how long it took and how many seconds of writes were lost
- [ ] 4.4 Restore an earlier moment with `litestream restore -timestamp` as the guide describes; verify the admin shows what it held then
- [ ] 4.5 Trigger each alarm (stop the admin container, fill the disk past 80 % with a temporary file, stop Litestream); verify each email arrives and its recovery email follows

## 5. Documentation and `prod`

- [ ] 5.1 Write the operator guide in `infra/README.md`: first deploy, seeding an existing installation (`seed/app.db`, `media-upload`), restoring an earlier moment, replacing the server, SES production access, the `app.webmio.eu` A record; update the README's production section and the roadmap's phase 7 row; verify every command in the guide ran during group 4
- [ ] 5.2 Run `pnpm lint`, `pnpm typecheck` and `pnpm test` from the root and the end-to-end suite; verify all pass
- [ ] 5.3 Deploy `prod` with the operator: `own-hosting`'s delegations of `webmio.site` and `webmio.net`, `pulumi up --stack prod`, the `app.webmio.eu` A record, the SES production access request, the first deploy; verify `https://app.webmio.eu/healthz` and a sign-in email
