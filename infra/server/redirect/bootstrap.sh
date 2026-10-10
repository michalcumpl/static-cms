#!/bin/sh
# Prepares a new redirect server (bare-domain-redirect design.md decision 3). The user data built
# by infra/src/redirect.ts first writes /etc/webmio/server.env, the Caddyfile and the unit, then
# runs this.
set -eu

# A t4g.nano has 512 MB: dnf loading the repository's metadata runs out of memory without swap.
if [ ! -e /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=1024 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  echo '/swapfile none swap defaults 0 0' >>/etc/fstab
fi
swapon -a

dnf install -y docker
systemctl enable --now docker

mkdir -p /var/lib/caddy

systemctl daemon-reload
systemctl enable --now --no-block webmio-redirect.service
