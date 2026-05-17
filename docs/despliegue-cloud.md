# Despliegue cloud de Agora

## Objetivo

Sacar la aplicacion del entorno exclusivamente local para que se pueda acceder desde una URL publica estable sin depender del equipo del alumno ni de `cloudflared`.

## Opciones preparadas en el repositorio

### 0. GitHub Codespaces para demo externa

Se deja preparado un entorno ligero para levantar Agora en GitHub Codespaces sin depender del equipo local:

- `.devcontainer/Dockerfile`
- `.devcontainer/devcontainer.json`
- `.devcontainer/scripts/post-create.sh`
- `.devcontainer/scripts/start-agora.sh`

Esta opcion esta pensada para:

- demo con tutora;
- pruebas externas rapidas;
- exponer `/app` y `/externo` mediante URL `*.app.github.dev`;
- validar el flujo fuera de local sin crear una VM.

La guia paso a paso queda en [despliegue-codespaces.md](./despliegue-codespaces.md).

### 1. Oracle Cloud Always Free con Docker Compose

Se deja preparada una ruta completa para VM propia en Oracle:

- `deploy/oracle/docker-compose.yml`
- `deploy/oracle/.env.oracle.example`
- `deploy/oracle/install-docker-ubuntu.sh`
- `deploy/oracle/deploy.sh`
- `deploy/oracle/smoke-test.sh`

Esta es la opcion mas alineada con un piloto real o con acceso de evaluadores externos.

La guia paso a paso queda en [despliegue-oracle-cloud.md](./despliegue-oracle-cloud.md).

### 2. Render con Docker

Tambien queda preparado un despliegue orientado a Render, usando:

- `Dockerfile` en la raiz del repositorio;
- `render.yaml` para la definicion de infraestructura;
- Postgres gestionado por Render;
- disco persistente para documentos en `/data/document-storage`;
- creacion o actualizacion automatica de los usuarios `profesora` y `profesor`.

## Variables importantes

- `APP_EXTERNAL_BASE_URL`: dominio publico final, por ejemplo `https://agora.midominio.es`.
- `MAILER_DSN`: credencial real de Brevo para correos transaccionales.
- `APP_MAIL_FROM`: remitente visible.
- `APP_INTERNAL_MFA_EMAIL`: correo donde llegan los codigos MFA.
- `DEMO_TEACHER_PASSWORD`: contrasena de `profesora` y `profesor`. En esta revision queda en `Abrete01`.

## Flujo de despliegue en Render

1. Subir el repositorio a GitHub.
2. En Render, crear Blueprint desde `render.yaml`.
3. Configurar las variables marcadas como `sync: false`.
4. Asociar dominio propio y fijar `APP_EXTERNAL_BASE_URL`.
5. Esperar a que Render construya la imagen y ejecute migraciones.
6. Probar `URL/app` y `URL/externo`.

## Usuarios de prueba

- `profesora / Abrete01`
- `profesor / Abrete01`

Ambos se crean o actualizan automaticamente al arrancar el contenedor si `APP_ENABLE_DEMO_TEACHERS=1`.

## Estado actual

Desde este entorno local no puedo completar la publicacion real porque faltan:

- acceso a una cuenta cloud real;
- una VM o servicio ya creado en Oracle o Render;
- IP publica o dominio estable;
- carga de credenciales reales de correo en el proveedor.

El proyecto, no obstante, queda preparado para desplegarse fuera de local sin rehacer la aplicacion.
