# Despliegue de Agora con GitHub Codespaces

## Objetivo

Levantar Agora fuera del equipo local para que otra persona pueda entrar por navegador a:

- `/app`
- `/externo`
- `/monitor`

sin necesitar Oracle, Azure ni una VM propia.

## Coste y limites

GitHub indica que las cuentas personales incluyen cuota mensual de Codespaces. En `GitHub Free` la referencia actual es `120` horas de compute y `15 GB-month` de almacenamiento. Si no quieres pasar de la cuota, revisa estos enlaces oficiales antes de dejar el entorno encendido muchas horas:

- https://docs.github.com/en/billing/concepts/product-billing/github-codespaces
- https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-included-usage
- https://docs.github.com/en/billing/reference/product-usage-included

Esto sirve bien para demo, validacion externa y pruebas con la tutora. No es un despliegue de produccion.

## Lo que queda preparado en el repositorio

- `.devcontainer/Dockerfile`
- `.devcontainer/devcontainer.json`
- `.devcontainer/scripts/post-create.sh`
- `.devcontainer/scripts/start-agora.sh`

La estrategia para Codespaces es deliberadamente ligera:

- backend Symfony en modo `dev`;
- SQLite dentro del workspace;
- builds de `frontend/app` y `frontend/company-portal` servidas por el propio backend;
- puerto `8000` reenviado y compartible;
- usuarios `profesora` y `profesor` con contrasena `Abrete01`.

No se usa Docker dentro del Codespace para la demo porque consume mas cuota y no aporta valor en este caso.

## Preparacion previa en GitHub

1. Sube este repositorio a GitHub.
2. Desde el repo, abre `Code > Codespaces > Create codespace on main`.
3. Espera a que termine la construccion del contenedor.

## Arranque de Agora en el Codespace

La primera vez, el `postCreateCommand` instala:

- `composer install` en `backend/`
- `npm ci` en `frontend/app/`
- `npm ci` en `frontend/company-portal/`

Cuando el Codespace termine de arrancar, ejecuta:

```bash
bash .devcontainer/scripts/start-agora.sh
```

Si quieres reiniciar la demo desde una base limpia:

```bash
bash .devcontainer/scripts/start-agora.sh --reset-demo
```

Ese script:

1. reconstruye los dos frontends para `/app` y `/externo`;
2. aplica migraciones;
3. carga fixtures si la SQLite no existe o si has pedido `--reset-demo`;
4. asegura `profesora` y `profesor`;
5. arranca Symfony en `0.0.0.0:8000`;
6. intenta poner el puerto `8000` en modo `public`.

## URL publica

GitHub Codespaces expone los puertos reenviados bajo una URL del tipo:

`https://CODESPACE-NAME-8000.app.github.dev`

GitHub documenta tanto el dominio del port forwarding como la posibilidad de hacer publico un puerto:

- https://docs.github.com/en/codespaces/developing-in-a-codespace/default-environment-variables-for-your-codespace
- https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- https://docs.github.com/en/codespaces/developing-in-a-codespace/using-github-codespaces-with-github-cli

Si el script no consigue dejar el puerto publico automaticamente, usa una de estas vias:

### Opcion 1. Desde la terminal del Codespace

```bash
gh codespace ports visibility 8000:public -c "$CODESPACE_NAME"
```

### Opcion 2. Desde la interfaz de GitHub / VS Code

1. Abre la pestaña `Ports`.
2. Busca el puerto `8000`.
3. Cambia la visibilidad a `Public`.

## Credenciales de prueba

- `profesora / Abrete01`
- `profesor / Abrete01`
- `admin / admin123`

Con eso puedes dar a tu tutora acceso exterior al panel interno sin tocar tu equipo local.

## Correo y verificaciones

Por defecto el script usa:

```env
MAILER_DSN=null://null
```

Eso deja el sistema funcional para navegar, gestionar empresas, convenios, estudiantes y asignaciones, pero **no enviara correos reales**.

Si quieres que desde Codespaces funcionen:

- verificacion de empresa por email;
- avisos de rechazo;
- MFA por correo;
- recuperaciones o notificaciones reales;

debes configurar secrets de Codespaces o variables de entorno con:

- `MAILER_DSN`
- `APP_MAIL_FROM`
- `APP_INTERNAL_MFA_EMAIL`
- opcionalmente `APP_EXTERNAL_BASE_URL` si quieres forzar otra URL

## Flujo recomendado para la demo externa

1. Crear el Codespace.
2. Ejecutar `bash .devcontainer/scripts/start-agora.sh --reset-demo`.
3. Comprobar:
   - `URL/app`
   - `URL/externo`
   - `URL/monitor`
4. Entrar con `profesor / Abrete01` o `profesora / Abrete01`.
5. Compartir la URL publica con la tutora.

## Limites operativos

- Si el Codespace se detiene, la URL deja de responder hasta volver a arrancar el proceso.
- Esto es valido para demo y pruebas, no para servicio permanente.
- Si el repositorio pertenece a una organizacion, la politica de la organizacion puede impedir puertos publicos.
