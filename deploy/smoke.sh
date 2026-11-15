#!/usr/bin/env bash
set -euo pipefail
base=${PUBLIC_BASE_URL:?Set PUBLIC_BASE_URL=https://your-domain}
[[ "$base" == https://* ]] || { echo 'Public smoke requires HTTPS'; exit 1; }
curl --fail --silent --show-error --retry 4 --retry-all-errors --retry-delay 3 "$base/api/health" | python3 -c 'import json,sys; assert json.load(sys.stdin)["status"] == "ok"'
curl --fail --silent --show-error "$base/signin" -o /dev/null
curl --fail --silent --show-error "$base/api/products" | python3 -c 'import json,sys; assert isinstance(json.load(sys.stdin),list)'
curl --fail --silent --show-error "$base/api/payments/config" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["configured"], "Payment merchant configuration missing"; print("Payment environment:",d["environment"])'
code=$(curl --silent --output /dev/null --write-out '%{http_code}' "$base/api/admin/orders")
[[ "$code" == 401 ]] || { echo 'Anonymous admin access should return 401'; exit 1; }
echo 'HTTPS, database, frontend, menu, payment configuration and auth smoke passed.'
