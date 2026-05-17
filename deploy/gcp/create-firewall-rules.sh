#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  PROJECT_ID=mi-proyecto ./deploy/gcp/create-firewall-rules.sh

Variables opcionales:
  NETWORK=default
  HTTP_RULE_NAME=agora-allow-http
  HTTPS_RULE_NAME=agora-allow-https
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Falta el comando requerido: $1" >&2
    exit 1
  fi
}

require_command gcloud

PROJECT_ID="${PROJECT_ID:?Debes definir PROJECT_ID antes de ejecutar el script.}"
NETWORK="${NETWORK:-default}"
HTTP_RULE_NAME="${HTTP_RULE_NAME:-agora-allow-http}"
HTTPS_RULE_NAME="${HTTPS_RULE_NAME:-agora-allow-https}"

if ! gcloud compute firewall-rules describe "${HTTP_RULE_NAME}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud compute firewall-rules create "${HTTP_RULE_NAME}" \
    --project "${PROJECT_ID}" \
    --network "${NETWORK}" \
    --direction INGRESS \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server
fi

if ! gcloud compute firewall-rules describe "${HTTPS_RULE_NAME}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud compute firewall-rules create "${HTTPS_RULE_NAME}" \
    --project "${PROJECT_ID}" \
    --network "${NETWORK}" \
    --direction INGRESS \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags https-server
fi

echo "Reglas de firewall listas para ${PROJECT_ID}."
