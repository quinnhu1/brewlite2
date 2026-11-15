#!/usr/bin/env bash
# For a fresh Ubuntu VPS. Review conflicts first; do not remove an existing Docker installation.
set -euo pipefail
[[ $(id -u) -eq 0 ]] || { echo 'Run: sudo bash deploy/bootstrap-ubuntu.sh'; exit 1; }
. /etc/os-release
[[ "$ID" == ubuntu ]] || { echo 'Ubuntu is required'; exit 1; }
if command -v docker >/dev/null; then
  docker version
  docker compose version
  echo 'Docker is already installed; no package replacement was performed.'
  exit 0
fi
apt-get update
apt-get install -y ca-certificates curl openssl python3 unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<APT
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
APT
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker version
docker compose version
