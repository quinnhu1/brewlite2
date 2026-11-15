#!/usr/bin/env bash
# Apply a tested image pair. Usage: bash deploy/release.sh COMMIT_SHA [--local]
source "$(dirname "$0")/common.sh"
export IMAGE_TAG=${1:?Pass the full tested Git commit SHA (or a local tag)}
[[ "$IMAGE_TAG" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$ ]] || exit 1
exec 9>.deploy/deploy.lock
flock -n 9 || { echo 'Another deployment is in progress.'; exit 1; }
umask 077
compose config --quiet
if [[ "${2:-}" != '--local' ]]; then compose --profile ops pull db migrate api web proxy; fi
compose up -d --wait --wait-timeout 120 db
# Quiesce checkout/workers before the database snapshot.
compose stop api web
backup="backups/predeploy-$(date -u +%Y%m%dT%H%M%SZ)-$IMAGE_TAG.dump"
if ! compose exec -T db pg_dump -U brewlite -d brewlite -Fc > "$backup" || [[ ! -s "$backup" ]]; then
  echo 'Backup failed; migration was not started.'
  compose start api web || true
  exit 1
fi
# Apply migrations while checkout is paused; bounded maintenance window.
if ! compose --profile ops run --rm -T migrate; then
  echo 'Migration failed; database backup retained. Inspect logs and restore service before retrying.'
  compose start api web || true
  exit 1
fi
if ! compose up -d --wait --wait-timeout 180 api web proxy; then
  echo 'New containers are unhealthy. Use rollback.sh with the previous compatible SHA.'
  exit 1
fi
# Reload routing even when the proxy container itself was not recreated.
compose exec -T proxy caddy reload --config /etc/caddy/Caddyfile
PUBLIC_BASE_URL="https://$(config_value DOMAIN)" bash deploy/smoke.sh
if [[ -f .deploy/current ]]; then cp .deploy/current .deploy/previous; fi
printf '%s\n' "$IMAGE_TAG" > .deploy/current
printf '%s\n' "Release $IMAGE_TAG healthy. Backup: $backup"
