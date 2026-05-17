#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Uso: $0 PROJECT_ID INSTANCE_NAME [ZONE]" >&2
  exit 1
fi

PROJECT_ID="$1"
INSTANCE_NAME="$2"
ZONE="${3:-europe-west1-b}"

gcloud compute instances describe "${INSTANCE_NAME}" \
  --project "${PROJECT_ID}" \
  --zone "${ZONE}" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
