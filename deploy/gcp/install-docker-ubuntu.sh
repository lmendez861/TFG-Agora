#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

cat <<'EOF' | sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: __UBUNTU_CODENAME__
Components: stable
Architectures: __ARCH__
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo sed -i "s/__UBUNTU_CODENAME__/$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")/" /etc/apt/sources.list.d/docker.sources
sudo sed -i "s/__ARCH__/$(dpkg --print-architecture)/" /etc/apt/sources.list.d/docker.sources

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

if ! groups "${USER}" | grep -q '\bdocker\b'; then
    sudo usermod -aG docker "${USER}"
fi

echo "Docker instalado."
echo "Cierra la sesion SSH y vuelve a entrar para usar 'docker' sin sudo."
echo "Comprobacion recomendada: docker compose version"
