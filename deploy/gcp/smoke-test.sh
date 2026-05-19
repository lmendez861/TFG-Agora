#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.gcp"

if [ ! -f "${ENV_FILE}" ]; then
    echo "Falta ${ENV_FILE}."
    exit 1
fi

normalize_env_value() {
    local value="$1"
    if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
        value="${value:1:-1}"
    elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
        value="${value:1:-1}"
    fi
    printf '%s' "${value}"
}

load_env_file() {
    while IFS= read -r line || [ -n "${line}" ]; do
        case "${line}" in
            ''|'#'*)
                continue
                ;;
        esac

        local key="${line%%=*}"
        local value="${line#*=}"
        value="$(normalize_env_value "${value}")"
        export "${key}=${value}"
    done < "${ENV_FILE}"
}

load_env_file

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
