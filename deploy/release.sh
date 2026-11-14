#!/usr/bin/env bash
# Release one immutable BrewLite commit tag on this host (ADR-003).
#
# Invoked by the "Deploy to VPS" job after it uploads docker-compose.prod.yml,
# deploy/ and this script into $DEPLOY_DIR:
#
#   ssh ... "cd /opt/brewlite && ... && bash deploy/release.sh <commit-sha>"
#
# Order matters: pull -> backup -> migrate -> start -> verify. A failed
# migration aborts before the new version starts, and unhealthy containers roll
# back to the previous good tag.
set -Eeuo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/brewlite}"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
TAG="${1:-}"

log() { printf 'release: %s\n' "$*" >&2; }
die() { log "$*"; exit 1; }

[[ "$TAG" =~ ^[a-f0-9]{40}$ ]] || die "usage: release.sh <40-char commit sha>"
cd "$DEPLOY_DIR" || die "cannot enter $DEPLOY_DIR"
[[ -f "$COMPOSE_FILE" ]] || die "missing $COMPOSE_FILE"
[[ -f .env ]] || die "missing $DEPLOY_DIR/.env (copy deploy/env.example and fill it in)"
command -v docker >/dev/null || die "docker is not installed"
docker compose version >/dev/null || die "docker compose plugin is missing"
command -v curl >/dev/null || die "curl is required for health checks"
command -v flock >/dev/null || die "flock (util-linux) is required for the deploy lock"

# Serialise releases so two workflow runs cannot migrate or restart the stack
# at the same time.
exec 9>"$DEPLOY_DIR/.release.lock"
flock -n 9 || die "another release is already running in $DEPLOY_DIR"

set -a
# shellcheck source=/dev/null
. ./.env
set +a

: "${GITHUB_REPOSITORY:?set GITHUB_REPOSITORY in .env (owner/repo)}"
: "${PUBLIC_DOMAIN:?set PUBLIC_DOMAIN in .env (bare hostname, no scheme)}"
export IMAGE_TAG="$TAG"

# CURL_OPTS=--insecure is only for a local trial run with Caddy's internal CA.
CURL_OPTS="${CURL_OPTS:-}"

compose() { docker compose -f "$COMPOSE_FILE" --project-directory "$DEPLOY_DIR" "$@"; }

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  printf '%s' "$GHCR_TOKEN" |
    docker login ghcr.io --username "${GHCR_USER:-$GITHUB_REPOSITORY}" --password-stdin >/dev/null
  log "logged in to ghcr.io as ${GHCR_USER:-$GITHUB_REPOSITORY}"
fi

PREVIOUS_TAG=""
[[ -s .last-good-tag ]] && PREVIOUS_TAG="$(<.last-good-tag)"

log "pulling ghcr.io/$GITHUB_REPOSITORY-{api,web}:$TAG"
compose pull --quiet api web caddy

if [[ "${SKIP_BACKUP:-false}" != "true" ]]; then
  log "backing up the database before migrating"
  bash "$DEPLOY_DIR/deploy/backup.sh" || die "database backup failed; refusing to migrate"
fi

log "applying migrations with the new image"
if ! compose run --rm --no-deps api npx prisma migrate deploy; then
  die "migration failed; the previous version is still running"
fi

log "starting containers"
compose up -d --remove-orphans

wait_healthy() {
  local name="$1" url="$2"
  for _ in {1..60}; do
    # shellcheck disable=SC2086
    if curl -fsS $CURL_OPTS --max-time 5 "$url" >/dev/null 2>&1; then
      log "$name is healthy"
      return 0
    fi
    sleep 2
  done
  log "$name did not become healthy at $url"
  return 1
}

has_catalog() {
  # shellcheck disable=SC2086
  curl -fsS $CURL_OPTS --max-time 10 "https://${PUBLIC_DOMAIN}/api/products" |
    grep -q '"productId"'
}

# The public URLs exercise Caddy and TLS as well, not just the containers.
if wait_healthy "api" "https://${PUBLIC_DOMAIN}/api/health" &&
  wait_healthy "web" "https://${PUBLIC_DOMAIN}/"; then
  if has_catalog; then
    log "catalog is served"
  elif [[ "${REQUIRE_CATALOG:-false}" == "true" ]]; then
    die "catalog is empty; seed the database before releasing (REQUIRE_CATALOG=true)"
  else
    log "warning: catalog is empty; run the seed before the demo"
  fi
  printf '%s\n' "$TAG" >.last-good-tag
  log "released $TAG"
  exit 0
fi

compose logs --tail 80 api web caddy >&2 || true

if [[ -n "$PREVIOUS_TAG" && "$PREVIOUS_TAG" != "$TAG" ]]; then
  log "rolling back to previous good tag $PREVIOUS_TAG"
  log "note: migrations already applied above are not reverted"
  export IMAGE_TAG="$PREVIOUS_TAG"
  compose pull --quiet api web || true
  compose up -d --remove-orphans || true
fi

die "release $TAG failed"
