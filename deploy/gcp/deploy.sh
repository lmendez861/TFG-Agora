#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env.gcp"

if [ ! -f "${ENV_FILE}" ]; then
    echo "Falta ${ENV_FILE}. Copia .env.gcp.example a .env.gcp y completa los valores."
    exit 1
fi

set -a
. "${ENV_FILE}"
set +a

for required_var in APP_SECRET POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD APP_EXTERNAL_BASE_URL MAILER_DSN APP_MAIL_FROM APP_INTERNAL_MFA_EMAIL; do
    if [ -z "${!required_var:-}" ]; then
        echo "Falta la variable ${required_var} en ${ENV_FILE}."
        exit 1
    fi
done

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps

echo "Despliegue completado."
echo "Prueba recomendada: ${SCRIPT_DIR}/smoke-test.sh"
