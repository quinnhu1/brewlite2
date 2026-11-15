#!/usr/bin/env bash
# Sourced by scripts, never source .env.production as shell code.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[[ -f .env.production ]] || { echo 'Run bash deploy/init-env.sh first.'; exit 1; }
compose() { docker compose --env-file .env.production -f docker-compose.prod.yml "$@"; }
config_value() { awk -F= -v name="$1" '$1 == name {sub(/^[^=]*=/, ""); sub(/\r$/, ""); print; exit}' .env.production; }
if [[ -z "${IMAGE_TAG:-}" && -f .deploy/current ]]; then export IMAGE_TAG=$(cat .deploy/current); fi
mkdir -p .deploy backups
chmod 700 .deploy backups
