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

echo "Comprobando autenticacion del profesor de prueba..."
curl -fsS -u "profesor:${DEMO_TEACHER_PASSWORD}" "${BASE_URL}/api/empresas" >/dev/null

echo "Comprobando monitor con credenciales del profesor..."
curl -fsS -u "profesor:${DEMO_TEACHER_PASSWORD}" "${BASE_URL}/api/monitor" >/dev/null

echo "Smoke test completado correctamente sobre ${BASE_URL}."
