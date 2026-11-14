#!/usr/bin/env bash
# Dump the BrewLite PostgreSQL database to $BACKUP_DIR and prune old dumps.
#
# release.sh calls this before every migration. For offsite copies schedule it
# from cron and push the directory with restic/rclone, e.g.:
#
#   15 2 * * *  cd /opt/brewlite && bash deploy/backup.sh >> backups/backup.log 2>&1
#
# Restore:
#   gunzip -c backups/brewlite-<stamp>.sql.gz | \
#     docker exec -i brewlite-db-1 psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
set -Eeuo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/brewlite}"
BACKUP_DIR="${BACKUP_DIR:-$DEPLOY_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
PROJECT="${COMPOSE_PROJECT:-brewlite}"

cd "$DEPLOY_DIR"
[[ -f .env ]] || { echo "backup: missing $DEPLOY_DIR/.env" >&2; exit 1; }

set -a
# shellcheck source=/dev/null
. ./.env
set +a

: "${POSTGRES_USER:?set POSTGRES_USER in .env}"
: "${POSTGRES_DB:?set POSTGRES_DB in .env}"

# Resolve the container by compose labels so this works without IMAGE_TAG.
db_id="$(docker ps -q \
  --filter "label=com.docker.compose.project=$PROJECT" \
  --filter "label=com.docker.compose.service=db")"
[[ -n "$db_id" ]] || { echo "backup: database container is not running" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/brewlite-$stamp.sql.gz"

docker exec "$db_id" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists |
  gzip -9 >"$target.part"
mv "$target.part" "$target"

find "$BACKUP_DIR" -maxdepth 1 -name 'brewlite-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "backup: $target"
