#!/usr/bin/env bash
set -euo pipefail

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "[Agora Codespaces] Instalando dependencias del backend..."
composer install --working-dir "${workspace_root}/backend" --no-interaction --prefer-dist

echo "[Agora Codespaces] Instalando dependencias del panel interno..."
npm ci --prefix "${workspace_root}/frontend/app"

echo "[Agora Codespaces] Instalando dependencias del portal externo..."
npm ci --prefix "${workspace_root}/frontend/company-portal"

mkdir -p "${workspace_root}/backend/var/document-storage"

cat <<'EOF'

[Agora Codespaces] Dependencias listas.
Ejecuta:
  bash .devcontainer/scripts/start-agora.sh

Para reiniciar la demo desde cero:
  bash .devcontainer/scripts/start-agora.sh --reset-demo
EOF
