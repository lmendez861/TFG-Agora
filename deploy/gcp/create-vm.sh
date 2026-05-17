#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  PROJECT_ID=mi-proyecto ./deploy/gcp/create-vm.sh

Variables opcionales:
  INSTANCE_NAME=agora-vm
  ZONE=europe-west1-b
  MACHINE_TYPE=e2-standard-2
  BOOT_DISK_SIZE=30GB
  BOOT_DISK_TYPE=pd-balanced
  IMAGE_PROJECT=ubuntu-os-cloud
  IMAGE_FAMILY=ubuntu-2404-lts-amd64
  NETWORK_TAGS=http-server,https-server

Requisitos:
  - gcloud autenticado
  - Compute Engine API habilitada
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
INSTANCE_NAME="${INSTANCE_NAME:-agora-vm}"
ZONE="${ZONE:-europe-west1-b}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-standard-2}"
BOOT_DISK_SIZE="${BOOT_DISK_SIZE:-30GB}"
BOOT_DISK_TYPE="${BOOT_DISK_TYPE:-pd-balanced}"
IMAGE_PROJECT="${IMAGE_PROJECT:-ubuntu-os-cloud}"
IMAGE_FAMILY="${IMAGE_FAMILY:-ubuntu-2404-lts-amd64}"
NETWORK_TAGS="${NETWORK_TAGS:-http-server,https-server}"

gcloud compute instances create "${INSTANCE_NAME}" \
  --project "${PROJECT_ID}" \
  --zone "${ZONE}" \
  --machine-type "${MACHINE_TYPE}" \
  --image-project "${IMAGE_PROJECT}" \
  --image-family "${IMAGE_FAMILY}" \
  --boot-disk-size "${BOOT_DISK_SIZE}" \
  --boot-disk-type "${BOOT_DISK_TYPE}" \
  --tags "${NETWORK_TAGS}"

echo "VM creada: ${INSTANCE_NAME}"
echo "Para ver la IP publica:"
echo "  gcloud compute instances describe ${INSTANCE_NAME} --project ${PROJECT_ID} --zone ${ZONE} --format='get(networkInterfaces[0].accessConfigs[0].natIP)'"
