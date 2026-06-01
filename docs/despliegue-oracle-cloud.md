# Despliegue de Agora en Oracle Cloud Always Free

## Objetivo

Levantar Agora fuera del equipo local en una VM de Oracle Cloud Infrastructure usando Docker, PostgreSQL y una URL publica accesible para evaluacion externa.

## Ruta preparada en el repositorio

Se deja preparado un despliegue orientado a **Oracle Cloud Always Free** sobre una **VM Ubuntu** con:

- `deploy/oracle/docker-compose.yml`
- `deploy/oracle/.env.oracle.example`
- `deploy/oracle/install-docker-ubuntu.sh`
- `deploy/oracle/deploy.sh`
- `deploy/oracle/smoke-test.sh`

La aplicacion se publica en un contenedor Docker y usa:

- PostgreSQL persistente en contenedor separado.
- Volumen persistente para documentos en `/data/document-storage`.
- Creacion o actualizacion automatica de `profesora` y `profesor`.

## Arquitectura de despliegue

1. VM Always Free en Oracle Cloud.
2. Docker Engine + Docker Compose plugin.
3. Contenedor `db` con PostgreSQL 16.
4. Contenedor `app` con Symfony, portal interno y portal externo.
5. Acceso publico por `http://IP_PUBLICA` o por dominio si despues se configura.

## Recomendacion de instancia

Para este proyecto encaja mejor una instancia **VM.Standard.A1.Flex** con Ubuntu que una micro AMD, porque Oracle incluye hasta 4 OCPU y 24 GB en el bloque Always Free de Ampere A1 y el proyecto compila frontend, ejecuta PHP y PostgreSQL en la misma VM.

## Requisitos previos

- Cuenta en Oracle Cloud.
- VM creada con IP publica.
- Regla de entrada abierta en Oracle para `80` y `443`, manteniendo `22` para SSH.
- Repositorio del proyecto disponible en la VM.
- Credenciales reales de Brevo.

## Preparacion de la VM

1. Crear una VM Ubuntu en Oracle.
2. Asignarle IP publica.
3. Abrir puertos `80` y `443` en la Security List o NSG del VCN.
4. Conectarse por SSH.
5. Ejecutar:

```bash
chmod +x deploy/oracle/install-docker-ubuntu.sh
./deploy/oracle/install-docker-ubuntu.sh
```

6. Cerrar la sesion SSH y volver a entrar para que el grupo `docker` quede aplicado.

## Configuracion

1. Copiar el ejemplo:

```bash
cp deploy/oracle/.env.oracle.example deploy/oracle/.env.oracle
```

2. Editar `deploy/oracle/.env.oracle` y completar como minimo:

- `APP_SECRET`
- `POSTGRES_PASSWORD`
- `APP_EXTERNAL_BASE_URL`
- `DEFAULT_URI`
- `MAILER_DSN`
- `APP_MAIL_FROM`
- `APP_INTERNAL_MFA_EMAIL`

Para `POSTGRES_PASSWORD`, usa una clave fuerte pero simple a nivel de URL, evitando caracteres reservados como `@` o `:` para no romper `DATABASE_URL`.

Si no hay dominio, usar la IP publica de Oracle:

```bash
APP_EXTERNAL_BASE_URL=http://IP_PUBLICA
DEFAULT_URI=http://IP_PUBLICA
```

## Despliegue

Desde la raiz del repositorio o desde cualquier ruta:

```bash
chmod +x deploy/oracle/deploy.sh deploy/oracle/smoke-test.sh
./deploy/oracle/deploy.sh
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
./deploy/oracle/smoke-test.sh
```

El smoke test comprueba:

- `GET /app`
- `GET /externo`
- autenticacion del usuario `profesor`
- acceso al monitor autenticado

## Usuarios de prueba

- `profesora / Abrete01`
- `profesor / Abrete01`

Ambos se crean al arrancar si `APP_ENABLE_DEMO_TEACHERS=1`.

## Flujo de actualizacion

Cuando cambies codigo en la VM:

```bash
git pull
./deploy/oracle/deploy.sh
```

## Comandos utiles

```bash
docker compose --env-file deploy/oracle/.env.oracle -f deploy/oracle/docker-compose.yml ps
docker compose --env-file deploy/oracle/.env.oracle -f deploy/oracle/docker-compose.yml logs -f app
docker compose --env-file deploy/oracle/.env.oracle -f deploy/oracle/docker-compose.yml logs -f db
docker compose --env-file deploy/oracle/.env.oracle -f deploy/oracle/docker-compose.yml down
```

## Limitaciones actuales

- Queda publicado por HTTP si solo se usa IP publica.
- Para HTTPS estable conviene anadir un dominio y un proxy inverso con certificado.
- Desde este entorno local no se puede completar la publicacion real porque faltan la cuenta Oracle, la VM y las credenciales reales del proveedor de correo.
