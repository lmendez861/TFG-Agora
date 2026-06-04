# Apuntes para defensa: autoarranque en VM y roles

Este documento es material de apoyo para explicar el despliegue cloud y la seguridad interna. No sustituye a la memoria final: sirve para estudiar y para sacar capturas de codigo si hace falta.

## 1. Autoarranque del proyecto en la VM

### Ruta principal

El autoarranque se instala desde:

```text
deploy/gcp/install-agora-service.sh
```

Ese script crea en la VM un servicio de `systemd` en esta ruta del sistema:

```text
/etc/systemd/system/agora.service
```

El servicio no contiene toda la logica del despliegue. Su funcion es arrancar otro script del repositorio:

```text
deploy/gcp/startup.sh
```

Y ese script levanta los contenedores definidos en:

```text
deploy/gcp/docker-compose.yml
```

### Flujo de arranque

```text
VM Google Cloud arranca
  -> systemd arranca docker.service
  -> systemd arranca agora.service
  -> agora.service ejecuta deploy/gcp/startup.sh
  -> startup.sh recalcula URL nip.io si cambia la IP publica
  -> startup.sh ejecuta docker compose up -d --remove-orphans
  -> Docker Compose deja levantados proxy, app y db
```

### Codigo clave del instalador del servicio

Ruta:

```text
deploy/gcp/install-agora-service.sh
```

Fragmento para capturar:

```bash
SERVICE_NAME="${SERVICE_NAME:-agora}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
RUN_USER="${RUN_USER:-${SUDO_USER:-$USER}}"
RUN_GROUP="${RUN_GROUP:-docker}"
ENV_FILE="${SCRIPT_DIR}/.env.gcp"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
STARTUP_SCRIPT="${SCRIPT_DIR}/startup.sh"

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
```

Explicacion por partes:

- `SERVICE_NAME=agora`: define el nombre final del servicio: `agora.service`.
- `SERVICE_FILE=/etc/systemd/system/agora.service`: indica donde se instala el servicio en Linux.
- `RUN_USER`: usuario que ejecutara el servicio, normalmente el usuario de la VM.
- `RUN_GROUP=docker`: permite ejecutar Docker Compose sin depender de una sesion manual.
- `ENV_FILE`: apunta a `.env.gcp`, donde estan variables como dominio, base de datos, correo y claves.
- `COMPOSE_FILE`: apunta al `docker-compose.yml` del despliegue GCP.
- `STARTUP_SCRIPT`: script que realmente prepara la URL publica y levanta los contenedores.
- `[Unit]`: declara que Docker y la red deben estar listos antes de arrancar Agora.
- `[Service]`: define como se ejecuta el servicio.
- `Type=oneshot` y `RemainAfterExit=yes`: el servicio ejecuta una tarea de arranque y queda marcado como activo.
- `ExecStart=${STARTUP_SCRIPT}`: al arrancar la VM se ejecuta `deploy/gcp/startup.sh`.
- `ExecReload=${STARTUP_SCRIPT}`: si se recarga el servicio, vuelve a ejecutar el arranque.
- `ExecStop=... docker compose ... down`: permite parar el stack desde `systemctl stop agora`.
- `[Install] WantedBy=multi-user.target`: hace que arranque en modo normal de servidor.
- `systemctl enable`: activa el arranque automatico.
- `systemctl restart`: arranca el servicio en ese momento.

### Codigo clave del arranque real

Ruta:

```text
deploy/gcp/startup.sh
```

Fragmento para capturar:

```bash
refresh_public_host_if_needed() {
    local auto_nip_io="${APP_PUBLIC_HOST_AUTO_NIP_IO:-0}"
    if [ "${auto_nip_io}" != "1" ]; then
        return 0
    fi

    local external_ip
    external_ip="$(curl -fsS -H 'Metadata-Flavor: Google' \
        'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip')"

    local host_prefix="${APP_PUBLIC_HOST_NIP_IO_PREFIX:-agora}"
    local computed_host="${host_prefix}.${external_ip}.nip.io"
    local computed_url="https://${computed_host}"

    upsert_env_var "APP_PUBLIC_HOST" "${computed_host}"
    upsert_env_var "APP_EXTERNAL_BASE_URL" "${computed_url}"
    upsert_env_var "DEFAULT_URI" "${computed_url}"
}

require_file "${ENV_FILE}"
require_file "${COMPOSE_FILE}"

load_env_file
refresh_public_host_if_needed

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
```

Explicacion por partes:

- `refresh_public_host_if_needed`: si esta activado `APP_PUBLIC_HOST_AUTO_NIP_IO=1`, recalcula el dominio publico.
- Metadata de Google Cloud: obtiene la IP publica real de la VM sin escribirla a mano.
- `computed_host`: genera un dominio tipo `agora.<IP_PUBLICA>.nip.io`.
- `computed_url`: genera la URL HTTPS usada por backend, correos y frontends.
- `upsert_env_var`: actualiza `.env.gcp` con la URL vigente.
- `require_file`: evita arrancar si faltan `.env.gcp` o `docker-compose.yml`.
- `load_env_file`: carga las variables de entorno.
- `docker compose up -d --remove-orphans`: levanta el stack en segundo plano y elimina contenedores antiguos no usados.
- `docker compose ps`: muestra el estado final de los servicios.

### Docker Compose en la VM

Ruta:

```text
deploy/gcp/docker-compose.yml
```

Servicios principales:

- `proxy`: Caddy, publica HTTP/HTTPS y gestiona el acceso externo.
- `app`: Apache + PHP + Symfony + frontends integrados.
- `db`: PostgreSQL 16.

Volumenes persistentes:

- `postgres_data`: datos de PostgreSQL.
- `document_storage`: documentos subidos.
- `caddy_data` y `caddy_config`: certificados y configuracion de Caddy.

Frase para defensa:

> Docker Compose describe el sistema completo de la VM: proxy, aplicacion y base de datos. `agora.service` garantiza que ese sistema se levante automaticamente al arrancar la VM, y `startup.sh` recalcula la URL publica si la IP cambia.

## 2. Roles actuales y mejora futura

### Ruta principal

La configuracion de roles esta en:

```text
backend/config/packages/security.yaml
```

### Jerarquia actual

```yaml
role_hierarchy:
    ROLE_DOCUMENT_MANAGER: [ROLE_API, ROLE_USER]
    ROLE_COORDINATOR: [ROLE_API, ROLE_USER]
    ROLE_MONITOR: [ROLE_API, ROLE_USER]
    ROLE_AUDITOR: [ROLE_USER]
    ROLE_ADMIN: [ROLE_MONITOR, ROLE_COORDINATOR, ROLE_DOCUMENT_MANAGER, ROLE_AUDITOR, ROLE_API, ROLE_USER]
```

Interpretacion:

- `ROLE_ADMIN`: perfil mas amplio. Hereda monitorizacion, coordinacion, documentacion, auditoria, API y usuario base.
- `ROLE_COORDINATOR`: permite operar el flujo academico: empresas, solicitudes, convenios, estudiantes, asignaciones y seguimientos.
- `ROLE_DOCUMENT_MANAGER`: pensado para documentacion: subir, retirar y restaurar documentos.
- `ROLE_MONITOR`: pensado para Agora Desktop y operacion tecnica: logs, estado, URL cloud y servicio.
- `ROLE_AUDITOR`: pensado para consulta/auditoria, sin permisos de API operativa completa.
- `ROLE_API`: rol base para entrar en los endpoints internos `/api`.
- `ROLE_USER`: rol minimo que Symfony anade como usuario autenticado.
- `ROLE_COMPANY_PORTAL`: rol separado para cuentas del portal externo de empresas.

### Uso real actual

En la entrega se usa principalmente un usuario de coordinacion/admin para simplificar la demo y evitar explicar distintos usuarios durante la defensa. Aun asi, el backend ya tiene una separacion inicial:

- Las rutas internas bajo `/api` piden `ROLE_API`.
- Las operaciones de creacion/edicion importantes suelen pedir `ROLE_COORDINATOR`.
- La gestion documental permite `ROLE_DOCUMENT_MANAGER`, `ROLE_COORDINATOR` o `ROLE_ADMIN`.
- La monitorizacion tecnica pide `ROLE_MONITOR`.
- El portal externo usa otro firewall y `ROLE_COMPANY_PORTAL`, separado del panel interno.

### Ejemplos en codigo

Rutas de coordinacion:

```php
#[IsGranted('ROLE_COORDINATOR')]
```

Se usa en controladores como:

- `backend/src/Controller/Api/EmpresaColaboradoraController.php`
- `backend/src/Controller/Api/ConvenioController.php`
- `backend/src/Controller/Api/AsignacionController.php`
- `backend/src/Controller/Api/EstudianteController.php`

Rutas de monitorizacion:

```php
#[IsGranted('ROLE_MONITOR')]
```

Se usa en:

- `backend/src/Controller/Api/MonitorController.php`
- `backend/src/Controller/Api/PublicAccessController.php`
- `backend/src/Controller/Api/MfaController.php`

Portal externo:

```yaml
- { path: ^/api/portal-company, roles: ROLE_COMPANY_PORTAL }
```

Esto separa las cuentas de empresa de los usuarios internos del centro.

### Como explicarlo sin vender algo que no esta terminado

Frase honesta para defensa:

> El proyecto ya tiene definida una jerarquia de roles y el backend la aplica en varios puntos mediante Symfony Security. Para la defensa y la demo se utiliza un usuario con permisos amplios, porque el objetivo principal era validar el flujo completo empresa-centro. Como mejora futura, se podria cerrar la separacion fina en la interfaz: por ejemplo, que un usuario de solo lectura no vea botones de edicion, que el gestor documental solo gestione archivos y que el monitor solo acceda a Agora Desktop y logs.

### Mejora futura propuesta

Implementacion futura recomendada:

1. Mantener `ROLE_ADMIN` para control total.
2. Usar `ROLE_COORDINATOR` para editar empresas, convenios, estudiantes y asignaciones.
3. Usar `ROLE_DOCUMENT_MANAGER` solo para subir, retirar y restaurar documentos.
4. Usar `ROLE_MONITOR` solo para Agora Desktop, logs, estado y smoke tests.
5. Crear o consolidar `ROLE_VIEWER`/`ROLE_USER` para modo solo lectura.
6. Reflejar esos roles tambien en React, ocultando botones que el usuario no pueda usar.
7. Anadir pruebas de permisos por endpoint para comprobar que cada rol puede hacer solo lo que corresponde.

### Tabla rapida para estudiar

| Rol | Estado actual | Uso futuro natural |
| --- | --- | --- |
| `ROLE_ADMIN` | Existe y hereda todos los permisos internos | Administrador completo |
| `ROLE_COORDINATOR` | Existe y se usa en operaciones de negocio | Gestion academica completa |
| `ROLE_DOCUMENT_MANAGER` | Existe y se permite en documentos | Responsable documental |
| `ROLE_MONITOR` | Existe y se usa en monitorizacion | Operador tecnico / Agora Desktop |
| `ROLE_AUDITOR` | Existe en jerarquia | Consulta de auditoria y trazas |
| `ROLE_API` | Base para API interna | Rol tecnico heredado |
| `ROLE_USER` | Base de usuario autenticado | Solo lectura si se limita en frontend/backend |
| `ROLE_COMPANY_PORTAL` | Existe separado para empresas | Portal externo de empresa |

