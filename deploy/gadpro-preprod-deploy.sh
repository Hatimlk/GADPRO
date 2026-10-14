#!/usr/bin/env bash
# Root-owned forced SSH command; run as ubuntu, never as root.
set -euo pipefail
umask 022

if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  sha=${BASH_REMATCH[1]}
else
  echo 'Only deploy <40-character commit SHA> is allowed.' >&2
  exit 1
fi

base=/var/www/gadpro-preprod
[[ -L "$base/app" && -f "$base/shared/.env" ]]
exec 9>"$base/.deploy.lock"
flock -w 120 9
previous=$(readlink -f "$base/app")
release=$(mktemp -d "$base/releases/${sha:0:12}-XXXXXXXX")
archive=$(mktemp "$base/.upload-XXXXXXXX.tar.gz")
switched=false

health() {
  for attempt in {1..20}; do
    if curl -fsS --max-time 5 http://127.0.0.1:4100/api/health |
      /usr/bin/node --input-type=module -e 'let s="";for await(const c of process.stdin)s+=c;const x=JSON.parse(s);if(x.status!=="ok")process.exit(1);'; then
      return 0
    fi
    sleep 2
  done
  return 1
}

cleanup() {
  status=$?
  trap - EXIT
  rm -f "$archive" "$base/.app-next"
  if (( status != 0 )) && [[ "$switched" == true ]]; then
    echo 'Deployment failed; restoring previous release.' >&2
    ln -s "$previous" "$base/.app-next"
    mv -Tf "$base/.app-next" "$base/app"
    if sudo -n /usr/bin/systemctl restart gadpro-preprod.service && health; then
      echo 'Previous release restored.' >&2
    else
      echo 'Rollback health check failed; inspect service logs.' >&2
    fi
  fi
  exit "$status"
}
trap cleanup EXIT

cat > "$archive"
# No secret files, symlinks, device nodes or paths outside the release.
python3 - "$archive" <<'PY'
import sys, tarfile
from pathlib import PurePosixPath
with tarfile.open(sys.argv[1], 'r:gz') as archive:
    for member in archive.getmembers():
        path = PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts:
            raise SystemExit('Unsafe archive path')
        if not (member.isfile() or member.isdir()):
            raise SystemExit('Only regular files and directories are allowed')
        if '.git' in path.parts or 'node_modules' in path.parts:
            raise SystemExit('Unexpected repository/dependency directory')
        if path.name.startswith('.env') and not path.name.endswith('.example'):
            raise SystemExit('Secret environment file rejected')
PY
tar --no-same-owner --no-same-permissions -xzf "$archive" -C "$release"
[[ -f "$release/apps/web/dist/index.html" && -f "$release/apps/api/src/server.js" ]]
cd "$release"
# Frontend was built on GitHub with Node 24. API dependencies need no build.
/usr/bin/npm ci --omit=dev --ignore-scripts
ln -s "$base/shared/.env" "$release/.env"
printf '%s\n' "$sha" > "$release/RELEASE_SHA"
find "$release/apps/web/dist" -type d -exec chmod 755 {} +
find "$release/apps/web/dist" -type f -exec chmod 644 {} +

ln -s "$release" "$base/.app-next"
mv -Tf "$base/.app-next" "$base/app"
switched=true
sudo -n /usr/bin/systemctl restart gadpro-preprod.service
health
echo "Preproduction deployed: $sha"
