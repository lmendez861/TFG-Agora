# Backend - Symfony API

Este proyecto Symfony expone la API que consumen el panel interno y el portal externo para gestionar empresas colaboradoras, convenios, estudiantes, tutores, asignaciones y solicitudes de empresa.

## Requisitos previos

- PHP 8.2 con extensiones `ctype`, `iconv`, `intl`, `pdo_sqlite` o `pdo_mysql`
- Composer 2.x
- SQLite por defecto o cualquier base soportada por Doctrine
- Symfony CLI opcional

## Puesta en marcha

1. Copia las variables de entorno locales:
   ```bash
   cd backend
   copy .env.local.example .env.local
   ```
2. Instala dependencias:
   ```bash
   composer install
   ```
3. Prepara base de datos y fixtures:
   ```bash
   php bin/console doctrine:migrations:migrate --no-interaction
   php bin/console doctrine:fixtures:load --no-interaction
   ```
4. Arranca el servidor:
   ```bash
   start-server.bat
   ```

Con SQLite no hace falta `doctrine:database:create`: la base se materializa al aplicar la migracion.

## Modo URL unica

Si quieres servir los dos frontends desde el mismo backend y con un unico puerto:

```bash
cd ..
build-single-url.bat
cd backend
start-server.bat
```

Rutas finales:
- `http://127.0.0.1:8000/app`
- `http://127.0.0.1:8000/externo`
- `http://127.0.0.1:8000/api`

Si no defines `VITE_API_BASE_URL`, las builds del panel y del portal consumen la API sobre el mismo origen publico. El comportamiento con `:8000` queda solo para el desarrollo local con Vite.

## Variables de entorno relevantes

- `DATABASE_URL`
- `MAILER_DSN`
- `APP_MAIL_FROM`
- `DEFAULT_URI`
- `CORS_ALLOW_ORIGIN`

`DEFAULT_URI` controla el esquema y host usados para enlaces absolutos, como la verificacion por email y algunas URLs generadas por el backend. Si quieres trabajar con HTTPS, actualiza ese valor en `.env.local`.

## Autenticacion y seguridad

- Todos los endpoints bajo `/api` requieren `ROLE_API`.
- La autenticacion principal del entorno academico es HTTP Basic sobre `App\Entity\User`.
- `json_login` queda preparado para una evolucion futura.
- Las credenciales del panel se leen desde `frontend/app/.env.local` mediante:
  - `VITE_API_USERNAME`
  - `VITE_API_PASSWORD`
- Las subidas de documentos reutilizan esas mismas credenciales de entorno.

Usuario demo tras cargar fixtures:
- `admin / admin123`

## HTTPS y CORS

- `CORS_ALLOW_ORIGIN` admite regex para `http` y `https`.
- Si sirves el backend con TLS local o detras de un proxy HTTPS, basta con ajustar `.env.local`.
- Los frontends tambien pueden levantar Vite con TLS si defines sus variables `VITE_DEV_HTTPS_*`.

## Endpoints principales

| Recurso | Metodos soportados | Observaciones |
|---------|--------------------|---------------|
| `/api/empresas` | `GET`, `POST`, `PUT` | Listado, detalle y extras como notas, etiquetas y documentos |
| `/api/convenios` | `GET`, `POST`, `PUT` | Workflow, checklist, documentos y alertas |
| `/api/estudiantes` | `GET`, `POST`, `PUT` | CRUD del alumnado |
| `/api/asignaciones` | `GET`, `POST`, `PUT` | Relaciones entre estudiante, empresa, convenio y tutores |
| `/api/tutores-academicos` | `GET` | Selector del frontend |
| `/api/tutores-profesionales` | `GET` | Filtro opcional por empresa |
| `/registro-empresa` | `POST`, `GET /confirmar` | Alta publica y verificacion por correo |
| `/api/empresa-solicitudes` | `GET`, `POST /{id}/aprobar`, `POST /{id}/rechazar` | Revision interna de solicitudes |

## Ejecucion de tests

```bash
php bin/phpunit
```

Los tests funcionales cubren autenticacion, empresas, convenios, estudiantes, asignaciones, solicitudes y documentos.
