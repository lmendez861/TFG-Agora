#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-agora}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
RUN_USER="${RUN_USER:-${SUDO_USER:-$USER}}"
RUN_GROUP="${RUN_GROUP:-docker}"
ENV_FILE="${SCRIPT_DIR}/.env.gcp"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
STARTUP_SCRIPT="${SCRIPT_DIR}/startup.sh"
RUN_HOME="$(getent passwd "${RUN_USER}" | cut -d: -f6)"

if [ ! -f "${ENV_FILE}" ]; then
    echo "Falta ${ENV_FILE}. Copia .env.gcp.example a .env.gcp antes de instalar el servicio." >&2
    exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "Falta ${COMPOSE_FILE}." >&2
    exit 1
fi

if [ ! -f "${STARTUP_SCRIPT}" ]; then
    echo "Falta ${STARTUP_SCRIPT}." >&2
    exit 1
fi

if [ -z "${RUN_HOME}" ]; then
    echo "No se pudo resolver el HOME del usuario ${RUN_USER}." >&2
    exit 1
fi

chmod +x "${STARTUP_SCRIPT}"

cat <<EOF | sudo tee "${SERVICE_FILE}" >/dev/null
[Unit]
Description=Agora cloud stack
Requires=docker.service network-online.target
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=${RUN_USER}
Group=${RUN_GROUP}
WorkingDirectory=${PROJECT_ROOT}
Environment=HOME=${RUN_HOME}
ExecStart=${STARTUP_SCRIPT}
ExecReload=${STARTUP_SCRIPT}
ExecStop=/usr/bin/docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE} down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}.service"
sudo systemctl restart "${SERVICE_NAME}.service"

echo "Servicio instalado: ${SERVICE_NAME}.service"
echo "Comandos utiles:"
echo "  sudo systemctl status ${SERVICE_NAME}.service"
echo "  sudo systemctl restart ${SERVICE_NAME}.service"
echo "  sudo journalctl -u ${SERVICE_NAME}.service -n 100 --no-pager"
