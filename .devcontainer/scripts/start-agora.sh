#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  bash .devcontainer/scripts/start-agora.sh [--reset-demo]

Opciones:
  --reset-demo   Elimina la SQLite y los documentos locales del Codespace,
                 vuelve a cargar fixtures y deja la demo en un estado limpio.
EOF
}

reset_demo=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --reset-demo)
      reset_demo=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Argumento no reconocido: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Falta el comando requerido: $1" >&2
    exit 1
  fi
}

require_command php
require_command composer
require_command npm
require_command curl

normalize_path_for_php() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -m "$1"
    return
  fi

  printf '%s' "$1"
}

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
backend_dir="${workspace_root}/backend"
frontend_app_dir="${workspace_root}/frontend/app"
frontend_external_dir="${workspace_root}/frontend/company-portal"

port="${PORT:-8000}"
host="${HOST:-0.0.0.0}"
sqlite_path="${AGORA_CODESPACES_SQLITE_PATH:-${backend_dir}/var/data_dev.sqlite}"
document_storage_dir="${APP_DOCUMENT_STORAGE_DIR:-${backend_dir}/var/document-storage}"

if [[ "${reset_demo}" -eq 1 ]]; then
  rm -f "${sqlite_path}"
  rm -rf "${document_storage_dir}"
fi

mkdir -p "${backend_dir}/var" "${document_storage_dir}" "$(dirname "${sqlite_path}")"

if [[ ! -f "${backend_dir}/vendor/autoload.php" ]]; then
  composer install --working-dir "${backend_dir}" --no-interaction --prefer-dist
fi

if [[ ! -d "${frontend_app_dir}/node_modules" ]]; then
  npm ci --prefix "${frontend_app_dir}"
fi

if [[ ! -d "${frontend_external_dir}/node_modules" ]]; then
  npm ci --prefix "${frontend_external_dir}"
fi

public_base_url="${APP_EXTERNAL_BASE_URL:-}"
if [[ -z "${public_base_url}" && "${CODESPACES:-}" == "true" && -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  public_base_url="https://${CODESPACE_NAME}-${port}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
fi
if [[ -z "${public_base_url}" ]]; then
  public_base_url="http://127.0.0.1:${port}"
fi
public_base_url="${public_base_url%/}"
sqlite_path_for_php="$(normalize_path_for_php "${sqlite_path}")"
document_storage_dir_for_php="$(normalize_path_for_php "${document_storage_dir}")"

export APP_ENV="${APP_ENV:-dev}"
export APP_DEBUG="${APP_DEBUG:-1}"
export APP_SECRET="${APP_SECRET:-codespaces-demo-secret}"
export DATABASE_URL="${DATABASE_URL:-sqlite:///${sqlite_path_for_php}}"
export APP_DOCUMENT_STORAGE_DIR="${document_storage_dir_for_php}"
export MAILER_DSN="${MAILER_DSN:-null://null}"
export APP_MAIL_FROM="${APP_MAIL_FROM:-Agora <noreply@example.invalid>}"
export APP_INTERNAL_MFA_EMAIL="${APP_INTERNAL_MFA_EMAIL:-profesora@example.invalid}"
export APP_MFA_TTL_SECONDS="${APP_MFA_TTL_SECONDS:-600}"
export APP_ENABLE_DEMO_TEACHERS="${APP_ENABLE_DEMO_TEACHERS:-1}"
export DEMO_TEACHER_PASSWORD="${DEMO_TEACHER_PASSWORD:-Abrete01}"
export APP_EXTERNAL_BASE_URL="${public_base_url}"
export DEFAULT_URI="${DEFAULT_URI:-${public_base_url}}"
export CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-^https?://([A-Za-z0-9-]+\\.)?github\\.dev$|^http://127\\.0\\.0\\.1(:[0-9]+)?$|^http://localhost(:[0-9]+)?$}"

echo "[Agora Codespaces] Construyendo frontends..."
npm run build:backend --prefix "${frontend_app_dir}"
npm run build:backend --prefix "${frontend_external_dir}"

db_existed=1
if [[ ! -f "${sqlite_path}" ]]; then
  db_existed=0
fi

cd "${backend_dir}"
rm -rf var/cache/*

echo "[Agora Codespaces] Aplicando migraciones..."
php bin/console doctrine:migrations:migrate --no-interaction

if [[ "${db_existed}" -eq 0 || "${reset_demo}" -eq 1 ]]; then
  echo "[Agora Codespaces] Cargando fixtures de demo..."
  php bin/console doctrine:fixtures:load --no-interaction
fi

if [[ "${APP_ENABLE_DEMO_TEACHERS}" == "1" ]]; then
  php bin/console app:user:create profesora "${DEMO_TEACHER_PASSWORD}" --role=ROLE_COORDINATOR --full-name="Profesora evaluadora" --update-if-exists --no-interaction
  php bin/console app:user:create profesor "${DEMO_TEACHER_PASSWORD}" --role=ROLE_COORDINATOR --full-name="Profesor evaluador" --update-if-exists --no-interaction
fi

php -S "${host}:${port}" -t public router.php &
server_pid=$!
trap 'kill "${server_pid}" 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${port}/app" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:${port}/app" >/dev/null 2>&1; then
  echo "Agora no ha arrancado correctamente en el puerto ${port}." >&2
  exit 1
fi

if [[ "${CODESPACES:-}" == "true" && -n "${CODESPACE_NAME:-}" ]] && command -v gh >/dev/null 2>&1; then
  gh codespace ports visibility "${port}:public" -c "${CODESPACE_NAME}" >/dev/null 2>&1 || true
fi

echo
echo "Agora lista en Codespaces."
echo "Local: http://127.0.0.1:${port}/app"
echo "Panel interno: ${public_base_url}/app"
echo "Portal externo: ${public_base_url}/externo"
echo "Monitor: ${public_base_url}/monitor"
echo "API monitor: ${public_base_url}/api/monitor"
echo
echo "Credenciales de prueba:"
echo "  profesora / ${DEMO_TEACHER_PASSWORD}"
echo "  profesor / ${DEMO_TEACHER_PASSWORD}"
echo
if [[ "${MAILER_DSN}" == "null://null" ]]; then
  echo "Correo en modo nulo: el registro externo, MFA por correo y verificacion de empresas no enviaran emails hasta configurar secrets reales."
fi
if [[ "${CODESPACES:-}" == "true" && -n "${CODESPACE_NAME:-}" ]]; then
  echo "Si el puerto no queda publico desde el primer intento:"
  echo "  gh codespace ports visibility ${port}:public -c ${CODESPACE_NAME}"
fi
echo

wait "${server_pid}"
