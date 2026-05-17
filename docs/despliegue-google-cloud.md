# Despliegue de Agora en Google Cloud Compute Engine

## Objetivo

Levantar Agora fuera del equipo local en una VM Ubuntu de Google Cloud Compute Engine usando Docker Compose, PostgreSQL y una URL publica accesible para evaluacion externa.

## Ruta preparada en el repositorio

Se deja preparado un despliegue orientado a **Google Cloud Compute Engine** sobre una **VM Ubuntu** con:

- `deploy/gcp/create-vm.sh`
- `deploy/gcp/create-firewall-rules.sh`
- `deploy/gcp/get-public-ip.sh`
- `deploy/gcp/docker-compose.yml`
- `deploy/gcp/.env.gcp.example`
- `deploy/gcp/install-docker-ubuntu.sh`
- `deploy/gcp/deploy.sh`
- `deploy/gcp/smoke-test.sh`

La aplicacion se publica en un contenedor Docker y usa:

- PostgreSQL persistente en contenedor separado.
- Volumen persistente para documentos en `/data/document-storage`.
- Creacion o actualizacion automatica de `profesora` y `profesor`.

## Arquitectura de despliegue

1. VM Ubuntu con IP publica en Compute Engine.
2. Docker Engine + Docker Compose plugin.
3. Contenedor `db` con PostgreSQL 16.
4. Contenedor `app` con Symfony, portal interno y portal externo.
5. Acceso publico por `http://IP_PUBLICA`, por hostname wildcard `nip.io` o por dominio si despues se configura.

## Recomendacion de VM

Para este proyecto encaja bien una VM `e2-standard-2`:

- 2 vCPU
- 8 GB RAM
- suficiente margen para construir frontend, ejecutar PHP y PostgreSQL en la misma VM

Si buscas una demo mas barata o mas contenida, puedes bajar a `e2-medium`, pero para un entorno mas estable `e2-standard-2` es una base mejor.

## Requisitos previos

- Proyecto de Google Cloud creado.
- Compute Engine API habilitada.
- VM con IP publica.
- Reglas de entrada para `80` y `443`.
- Repositorio del proyecto disponible en la VM.
- Credenciales reales de Brevo.

## Crear la VM

### Opcion A. Consola web

Google documenta la creacion de VMs Linux desde la consola y recomienda marcar `Allow HTTP traffic`. Tambien puedes marcar `Allow HTTPS traffic` desde el alta de la VM.

Referencias oficiales:

- https://docs.cloud.google.com/compute/docs/create-linux-vm-instance
- https://docs.cloud.google.com/compute/docs/tutorials/basic-webserver-apache

Configuracion recomendada:

- SO: `Ubuntu 24.04 LTS`
- tipo: `e2-standard-2`
- disco: `30 GB` `pd-balanced`
- IP publica: si
- HTTP: permitido
- HTTPS: permitido

### Opcion B. `gcloud` con script preparado

Desde Cloud Shell o desde una maquina con `gcloud` autenticado:

```bash
chmod +x deploy/gcp/create-vm.sh
PROJECT_ID=tu-proyecto-gcp ./deploy/gcp/create-vm.sh
```

Variables opcionales:

- `INSTANCE_NAME`
- `ZONE`
- `MACHINE_TYPE`
- `BOOT_DISK_SIZE`
- `BOOT_DISK_TYPE`

El script crea la VM con:

- imagen `ubuntu-2404-lts-amd64`
- tags `http-server,https-server`
- disco `pd-balanced`

La familia de imagen Ubuntu 24.04 y el uso de `--tags` estan alineados con la documentacion oficial de Compute Engine.

### Firewall si usas VPC propia o faltan reglas por defecto

Si tu red no tiene las reglas `default-allow-http` y `default-allow-https`, puedes crearlas con:

```bash
chmod +x deploy/gcp/create-firewall-rules.sh
PROJECT_ID=tu-proyecto-gcp ./deploy/gcp/create-firewall-rules.sh
```

El script crea reglas de entrada para:

- `tcp:80` hacia VMs con tag `http-server`
- `tcp:443` hacia VMs con tag `https-server`

## Obtener la IP publica

```bash
chmod +x deploy/gcp/get-public-ip.sh
./deploy/gcp/get-public-ip.sh PROJECT_ID INSTANCE_NAME ZONE
```

## Preparacion de la VM

1. Conectate por SSH a la VM.
2. Clona el repositorio.
3. Ejecuta:

```bash
chmod +x deploy/gcp/install-docker-ubuntu.sh
./deploy/gcp/install-docker-ubuntu.sh
```

4. Cierra la sesion SSH y vuelve a entrar para que el grupo `docker` quede aplicado.

La instalacion de Docker sigue el repositorio oficial de Docker para Ubuntu.

## Configuracion

1. Copia el ejemplo:

```bash
cp deploy/gcp/.env.gcp.example deploy/gcp/.env.gcp
```

2. Edita `deploy/gcp/.env.gcp` y completa como minimo:

- `APP_SECRET`
- `POSTGRES_PASSWORD`
- `APP_EXTERNAL_BASE_URL`
- `DEFAULT_URI`
- `MAILER_DSN`
- `APP_MAIL_FROM`
- `APP_INTERNAL_MFA_EMAIL`

Si no hay dominio, usa la IP publica:

```bash
APP_EXTERNAL_BASE_URL=http://IP_PUBLICA
DEFAULT_URI=http://IP_PUBLICA
```

Si quieres evitar una IP desnuda sin pagar un dominio, puedes usar un hostname wildcard gratuito basado en la IP publica. `nip.io` documenta que resuelve hostnames del tipo `algo.<IP>.nip.io` a la IP embebida. Ejemplo:

```bash
APP_EXTERNAL_BASE_URL=http://agora.IP_PUBLICA.nip.io
DEFAULT_URI=http://agora.IP_PUBLICA.nip.io
```

En el despliegue de revision externa se ha validado este formato contra la VM publicada.

Para `POSTGRES_PASSWORD`, usa una clave fuerte pero evita caracteres reservados como `@` o `:` para no romper la URL de conexion.

## Despliegue

Desde la raiz del repositorio o desde cualquier ruta:

```bash
chmod +x deploy/gcp/deploy.sh deploy/gcp/smoke-test.sh
./deploy/gcp/deploy.sh
```

El script:

- construye la imagen Docker;
- levanta PostgreSQL;
- espera la base de datos;
- ejecuta migraciones;
- crea o actualiza `profesora` y `profesor`.

## Validacion funcional

Tras el despliegue:

```bash
./deploy/gcp/smoke-test.sh
```

El smoke test comprueba:

- `GET /app`
- `GET /externo`
- autenticacion del usuario `profesor`
- acceso al monitor autenticado

Ademas, el repositorio incluye un smoke publico orientado a la URL externa:

```bash
node scripts/smoke-public-workflow.mjs --base-url http://agora.IP_PUBLICA.nip.io
```

Ese script valida desde fuera el flujo completo:

- `401` esperados en rutas protegidas sin sesion;
- registro de empresa desde portal externo;
- verificacion del correo con URL publica;
- aprobacion interna;
- creacion de convenio, estudiante, tutor y asignacion;
- activacion de cuenta de empresa;
- login del portal externo;
- mensajeria en ambos sentidos;
- visibilidad de colecciones internas desde la URL publica.

## Usuarios de prueba

- `profesora / Abrete01`
- `profesor / Abrete01`

Ambos se crean al arrancar si `APP_ENABLE_DEMO_TEACHERS=1`.

## Flujo de actualizacion

Cuando cambies codigo en la VM:

```bash
git pull
./deploy/gcp/deploy.sh
```

## Comandos utiles

```bash
docker compose --env-file deploy/gcp/.env.gcp -f deploy/gcp/docker-compose.yml ps
docker compose --env-file deploy/gcp/.env.gcp -f deploy/gcp/docker-compose.yml logs -f app
docker compose --env-file deploy/gcp/.env.gcp -f deploy/gcp/docker-compose.yml logs -f db
docker compose --env-file deploy/gcp/.env.gcp -f deploy/gcp/docker-compose.yml down
```

## Notas operativas

- Con IP publica simple quedara publicado por HTTP.
- Para HTTPS estable conviene anadir un dominio y un proxy inverso con certificado.
- El filesystem de la VM y los volumenes Docker residen en la propia VM, asi que este despliegue no requiere rehacer Agora hacia Cloud Run o Cloud SQL.

## Referencias oficiales

- Crear VM Linux: https://docs.cloud.google.com/compute/docs/create-linux-vm-instance
- Crear y arrancar instancias: https://docs.cloud.google.com/compute/docs/instances/create-start-instance
- Tutorial de web server y firewall HTTP/HTTPS: https://docs.cloud.google.com/compute/docs/tutorials/basic-webserver-apache
- Crear reglas de firewall: https://docs.cloud.google.com/compute/docs/samples/compute-firewall-create
- Referencia `gcloud compute instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Familias de imagen Ubuntu en Compute Engine: https://cloud.google.com/compute/docs/images/os-details
- Instalar Docker Engine en Ubuntu: https://docs.docker.com/engine/install/ubuntu/
