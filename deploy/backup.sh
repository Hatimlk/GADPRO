#!/usr/bin/env bash
set -euo pipefail
: "${BACKUP_DIR:?BACKUP_DIR requis}"
: "${CENTRAL_DATABASE_URL:?CENTRAL_DATABASE_URL requis}"
: "${CHEQUES_DATABASE_URL:?CHEQUES_DATABASE_URL requis}"
: "${IMPAYES_DATABASE_URL:?IMPAYES_DATABASE_URL requis}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 0700 "$BACKUP_DIR/$stamp"
pg_dump --format=custom --no-owner --file="$BACKUP_DIR/$stamp/identity.dump" "$CENTRAL_DATABASE_URL"
pg_dump --format=custom --no-owner --file="$BACKUP_DIR/$stamp/cheques.dump" "$CHEQUES_DATABASE_URL"
pg_dump --format=custom --no-owner --file="$BACKUP_DIR/$stamp/impayes.dump" "$IMPAYES_DATABASE_URL"
sha256sum "$BACKUP_DIR/$stamp"/*.dump > "$BACKUP_DIR/$stamp/SHA256SUMS"
