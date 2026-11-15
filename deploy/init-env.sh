#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ ! -e .env.production ]] || { echo '.env.production exists; edit it instead of regenerating database credentials.'; exit 1; }
read -r -p 'Domain (without https://): ' domain
read -r -p 'Email for TLS certificate: ' email
read -r -p 'Public IPv4 [52.64.177.7]: ' ipv4
ipv4=${ipv4:-52.64.177.7}
read -r -p 'Image prefix (ghcr.io/owner/repository, lowercase): ' registry
[[ "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || { echo 'Invalid domain'; exit 1; }
[[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || { echo 'Invalid email'; exit 1; }
[[ "$ipv4" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Invalid IPv4'; exit 1; }
[[ "$registry" =~ ^ghcr.io/[a-z0-9_.-]+/[a-z0-9_.-]+$ ]] || { echo 'Invalid image prefix'; exit 1; }
umask 077
cat > .env.production <<ENV
DOMAIN=$domain
ACME_EMAIL=$email
VPS_IPV4=$ipv4
IMAGE_REGISTRY=$registry
IMAGE_TAG=local
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 48)
PAYMENT_PROVIDER=vnpay
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_REFUND_ENABLED=false
PAYMENT_ALLOW_MOCK_IN_PRODUCTION=false
PAYMENT_MOCK_ALLOW_OVERRIDE=false
ENV
echo 'Created .env.production. Set your VNPay sandbox credentials locally on this server.'
