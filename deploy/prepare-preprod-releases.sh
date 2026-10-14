#!/usr/bin/env bash
# One-time setup on OVH, as root. No database operations.
set -euo pipefail
[[ $EUID == 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
base=/var/www/gadpro-preprod
[[ -d "$base/app" && -f "$base/app/.env" ]]
install -d -m 755 -o ubuntu -g ubuntu "$base/releases"
install -d -m 700 -o ubuntu -g ubuntu "$base/shared"

if [[ ! -L "$base/app" ]]; then
  [[ ! -e "$base/shared/.env" ]] || { echo 'Existing shared environment; inspect before continuing.' >&2; exit 1; }
  initial="$base/releases/initial-$(date -u +%Y%m%dT%H%M%S)"
  [[ ! -e "$initial" ]]
  # Service and reminder EnvironmentFile paths remain /app/.env.
  mv "$base/app/.env" "$base/shared/.env"
  chown ubuntu:ubuntu "$base/shared/.env"
  chmod 600 "$base/shared/.env"
  ln -s "$base/shared/.env" "$base/app/.env"
  mv "$base/app" "$initial"
  ln -s "$initial" "$base/app"
fi
chown ubuntu:ubuntu "$base"
install -m 755 -o root -g root "$base/app/deploy/gadpro-preprod-deploy.sh" /usr/local/sbin/gadpro-preprod-deploy
echo 'Release layout prepared. Current application and environment retained.'
