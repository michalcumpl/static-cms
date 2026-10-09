#!/bin/sh
# Prepares a new server (admin-on-aws design.md decision 1). The user data built by
# infra/src/admin.ts first writes /etc/webmio/server.env and the other files in infra/server/,
# then runs this.
set -eu

dnf install -y docker jq amazon-cloudwatch-agent
systemctl enable --now docker

mkdir -p /var/lib/webmio /var/lib/caddy
chown 1000:1000 /var/lib/webmio

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s \
  -c file:/etc/webmio/cloudwatch-agent.json

systemctl daemon-reload
# Without blocking: the admin keeps retrying until an image has been deployed.
systemctl enable --now --no-block webmio-caddy.service webmio-restore.service \
  webmio-litestream.service webmio-admin.service webmio-replica-lag.timer
