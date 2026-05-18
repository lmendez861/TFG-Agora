#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.gcp"

if [ ! -f "${ENV_FILE}" ]; then
    echo "Falta ${ENV_FILE}."
    exit 1
fi

set -a
. "${ENV_FILE}"
set +a

BASE_URL="${APP_EXTERNAL_BASE_URL:-http://127.0.0.1:${APP_HTTP_PORT:-80}}"

echo "Comprobando portal interno..."
curl -fsS "${BASE_URL}/app" >/dev/null

echo "Comprobando portal externo..."
curl -fsS "${BASE_URL}/externo" >/dev/null

if [ -n "${SMOKE_API_USER:-}" ] && [ -n "${SMOKE_API_PASSWORD:-}" ]; then
    echo "Comprobando autenticacion API con credenciales de smoke..."
    curl -fsS -u "${SMOKE_API_USER}:${SMOKE_API_PASSWORD}" "${BASE_URL}/api/empresas" >/dev/null
fi

if [ -n "${SMOKE_MONITOR_USER:-}" ] && [ -n "${SMOKE_MONITOR_PASSWORD:-}" ]; then
    echo "Comprobando monitor con credenciales de smoke..."
    curl -fsS -u "${SMOKE_MONITOR_USER}:${SMOKE_MONITOR_PASSWORD}" "${BASE_URL}/api/monitor" >/dev/null
fi

echo "Smoke test completado correctamente sobre ${BASE_URL}."
