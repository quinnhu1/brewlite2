#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
umask 077
export IMAGE_TAG=$(cat .deploy/current)
file="backups/brewlite-$(date -u +%Y%m%dT%H%M%SZ).dump"
compose exec -T db pg_dump -U brewlite -d brewlite -Fc > "$file"
[[ -s "$file" ]]
echo "$file"
# Copy encrypted backups off this VPS; local disk alone is not disaster recovery.
