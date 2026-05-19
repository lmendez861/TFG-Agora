#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env.gcp"

log() {
    printf '[agora-startup] %s\n' "$*"
}

require_file() {
    local path="$1"
    if [ ! -f "${path}" ]; then
        log "Falta el fichero requerido: ${path}"
        exit 1
    fi
}

upsert_env_var() {
    local key="$1"
    local value="$2"

    if grep -q "^${key}=" "${ENV_FILE}"; then
        sed -i "s|^${key}=.*$|${key}=${value}|" "${ENV_FILE}"
    else
        printf '%s=%s\n' "${key}" "${value}" >>"${ENV_FILE}"
    fi
}

refresh_public_host_if_needed() {
    local auto_nip_io="${APP_PUBLIC_HOST_AUTO_NIP_IO:-0}"
    if [ "${auto_nip_io}" != "1" ]; then
        return 0
    fi

    local external_ip
    external_ip="$(curl -fsS -H 'Metadata-Flavor: Google' 'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip')"

    if [ -z "${external_ip}" ]; then
        log "No se pudo resolver la IP publica desde el metadata server."
        exit 1
    fi

    local host_prefix="${APP_PUBLIC_HOST_NIP_IO_PREFIX:-agora}"
    local computed_host="${host_prefix}.${external_ip}.nip.io"
    local computed_url="https://${computed_host}"

    if [ "${APP_PUBLIC_HOST:-}" = "${computed_host}" ] && [ "${APP_EXTERNAL_BASE_URL:-}" = "${computed_url}" ] && [ "${DEFAULT_URI:-}" = "${computed_url}" ]; then
        log "Host publico nip.io ya alineado con la IP actual: ${computed_host}"
        return 0
    fi

    log "Actualizando host publico a ${computed_host}"
    upsert_env_var "APP_PUBLIC_HOST" "${computed_host}"
    upsert_env_var "APP_EXTERNAL_BASE_URL" "${computed_url}"
    upsert_env_var "DEFAULT_URI" "${computed_url}"

    APP_PUBLIC_HOST="${computed_host}"
    APP_EXTERNAL_BASE_URL="${computed_url}"
    DEFAULT_URI="${computed_url}"
}

require_file "${ENV_FILE}"
require_file "${COMPOSE_FILE}"

set -a
. "${ENV_FILE}"
set +a

refresh_public_host_if_needed

for required_var in APP_SECRET POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD APP_EXTERNAL_BASE_URL APP_PUBLIC_HOST MAILER_DSN APP_MAIL_FROM APP_INTERNAL_MFA_EMAIL; do
    if [ -z "${!required_var:-}" ]; then
        log "Falta la variable ${required_var} en ${ENV_FILE}."
        exit 1
    fi
done

log "Levantando stack Agora con Docker Compose"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
log "Arranque completado."
