#!/usr/bin/env bash
# Roll back images only. Never blindly undo migrations or discard new orders.
source "$(dirname "$0")/common.sh"
export IMAGE_TAG=${1:?Pass a previous image tag compatible with the current database schema}
[[ "$IMAGE_TAG" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$ ]] || exit 1
exec 9>.deploy/deploy.lock
flock -n 9 || { echo 'Another deployment is in progress.'; exit 1; }
compose pull api web
compose up -d --wait --wait-timeout 180 api web proxy
PUBLIC_BASE_URL="https://$(config_value DOMAIN)" bash deploy/smoke.sh
printf '%s\n' "$IMAGE_TAG" > .deploy/current
echo 'Application image rollback completed; data and migrations retained.'
