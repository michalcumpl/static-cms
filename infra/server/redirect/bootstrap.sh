#!/bin/sh
# Prepares a new redirect server (bare-domain-redirect design.md decision 3). The user data built
# by infra/src/redirect.ts first writes /etc/webmio/server.env, the Caddyfile and the unit, then
# runs this.
set -eu

dnf install -y docker
systemctl enable --now docker

mkdir -p /var/lib/caddy

systemctl daemon-reload
systemctl enable --now --no-block webmio-redirect.service
