#!/usr/bin/env bash
# Release one immutable BrewLite commit tag on this host.
#
# Invoked by the "Deploy to VPS" job after it uploads docker-compose.prod.yml
# and this deploy/ directory into $DEPLOY_DIR:
#
#   ssh ... "cd /opt/brewlite && ... && bash deploy/release.sh <commit-sha>"
#
# Requires $DEPLOY_DIR/.env (see deploy/env.example). The script pulls the
# images tagged with <commit-sha>, restarts the stack and rolls back to the
# previous successful tag when the health checks fail.
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

set -a
# shellcheck source=/dev/null
. ./.env
set +a

: "${GITHUB_REPOSITORY:?set GITHUB_REPOSITORY in .env (owner/repo)}"
export IMAGE_TAG="$TAG"

compose() { docker compose -f "$COMPOSE_FILE" --project-directory "$DEPLOY_DIR" "$@"; }

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  printf '%s' "$GHCR_TOKEN" |
    docker login ghcr.io --username "${GHCR_USER:-$GITHUB_REPOSITORY}" --password-stdin >/dev/null
  log "logged in to ghcr.io as ${GHCR_USER:-$GITHUB_REPOSITORY}"
fi

PREVIOUS_TAG=""
[[ -s .last-good-tag ]] && PREVIOUS_TAG="$(<.last-good-tag)"

log "pulling ghcr.io/$GITHUB_REPOSITORY-{api,web}:$TAG"
compose pull api web

log "starting containers"
compose up -d --remove-orphans

wait_healthy() {
  local name="$1" url="$2"
  for _ in {1..45}; do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      log "$name is healthy"
      return 0
    fi
    sleep 2
  done
  log "$name did not become healthy at $url"
  return 1
}

API_URL="http://127.0.0.1:${API_PORT:-3001}/"
WEB_URL="http://127.0.0.1:${WEB_PORT:-3000}/"

if wait_healthy api "$API_URL" && wait_healthy web "$WEB_URL"; then
  printf '%s\n' "$TAG" >.last-good-tag
  log "released $TAG"
  exit 0
fi

compose logs --tail 80 api web >&2 || true

if [[ -n "$PREVIOUS_TAG" && "$PREVIOUS_TAG" != "$TAG" ]]; then
  log "rolling back to previous good tag $PREVIOUS_TAG"
  export IMAGE_TAG="$PREVIOUS_TAG"
  compose pull api web || true
  compose up -d --remove-orphans || true
fi

die "release $TAG failed"
