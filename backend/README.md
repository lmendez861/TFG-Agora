# Backend – Symfony API

Este proyecto Symfony expone la API que consume el frontend de Agora para gestionar empresas colaboradoras, convenios, estudiantes, tutores y asignaciones.

## Requisitos previos

- PHP 8.2 con extensiones `ctype`, `iconv`, `intl`, `pdo_sqlite`/`pdo_mysql`.
- Composer 2.x.
- SQLite (por defecto) o cualquier base de datos soportada por Doctrine.

## Puesta en marcha

1. Copia las variables de entorno y ajusta la conexión a base de datos si es necesario:
   ```bash
   cd backend
   cp .env .env.local
   # edita DATABASE_URL si prefieres MySQL o PostgreSQL
   ```
2. Instala dependencias:
   ```bash
   composer install
   ```
3. Prepara la base de datos y carga las fixtures de demo (empresas, tutores, estudiantes y el usuario administrador):
   ```bash
   php bin/console doctrine:database:create --if-not-exists
   php bin/console doctrine:migrations:migrate --no-interaction
   php bin/console doctrine:fixtures:load --no-interaction
   ```
4. Arranca el servidor de desarrollo:
   ```bash
   symfony serve # o php -S 127.0.0.1:8000 -t public
   ```

> Los tests funcionales (`php bin/phpunit`) reconstruyen la base de datos automáticamente gracias a `DemoFixtureLoaderTrait`, por lo que no necesitas preparar nada adicional para ejecutarlos.

## Autenticación y seguridad

- Todos los endpoints bajo `/api` requieren el rol `ROLE_API`.
- La autenticación se realiza mediante **HTTP Basic** contra la entidad `App\Entity\User`. Por defecto se crea el usuario `admin/admin123` cuando cargas las fixtures.
- Para crear usuarios adicionales utiliza el comando:
  ```bash
  php bin/console app:user:create coordinador coordenadasSeguras --role=ROLE_API --full-name="Coordinador TFG"
  ```
- El frontend lee las credenciales desde las variables `VITE_API_USERNAME` / `VITE_API_PASSWORD`, por lo que basta con actualizar `frontend/app/.env.local` tras crear un usuario nuevo.

## Endpoints principales

| Recurso | Métodos soportados | Observaciones |
|---------|-------------------|---------------|
| `/api/empresas` | `GET`, `POST`, `PUT` | Filtros por estado y búsqueda, métricas agregadas, notas/etiquetas/documentos (`/api/empresas/{id}/notas`, `/etiquetas`, `/documentos`). |
| `/api/convenios` | `GET`, `POST`, `PUT` | Filtros por estado/tipo/empresa, detalle extendido, extras (`/extras`), checklist (`/checklist/{itemId}`), documentos (`/documents`), workflow (`/workflow/advance`) y alertas. |
| `/api/estudiantes` | `GET`, `POST`, `PUT` | Validaciones de estado y asignaciones asociadas. |
| `/api/asignaciones` | `GET`, `POST`, `PUT` | Filtros por estado/modalidad/empresa/estudiante, control de coherencia entre tutores y empresas. |
| `/api/tutores-academicos` | `GET` | Devuelve la lista completa para el selector del frontend. |
| `/api/tutores-profesionales` | `GET` | Permite filtrar por `empresaId` para limitar el listado en el modal de asignaciones. |
| `/registro-empresa` (público) | `POST`, `GET /confirmar` | Servicio externo para que una empresa solicite acceso. Envía un email de verificación y deja la solicitud en estado `pendiente`. |
| `/api/empresa-solicitudes` | `GET`, `POST /{id}/aprobar`, `POST /{id}/rechazar` | Panel interno para revisar solicitudes, aprobarlas (crea automáticamente la Empresa colaboradora) o rechazarlas. |

Todas las colecciones exponen paginación (`page`, `perPage`) y validan los parámetros de filtro antes de ejecutar la consulta. Los controladores devuelven errores JSON normalizados (`message`) con códigos `400/404/422` según corresponda.

### Flujo de registro/verificación de empresas

1. Una empresa externa envía la solicitud a `POST /registro-empresa` (nombre, datos de contacto, sector, etc.).
2. El backend genera un token y envía un correo de verificación utilizando el `MAILER_DSN` configurado (recuerda definir `APP_MAIL_FROM` y las credenciales SMTP propias del centro).
3. Al pulsar el enlace recibido (`GET /registro-empresa/confirmar?token=...`) la solicitud pasa a `email_verificado`.
4. El equipo del centro accede al panel interno (`/api/empresa-solicitudes`) y revisa cada solicitud:
   - **Aprobar**: se crea automáticamente la entidad `EmpresaColaboradora` y un contacto básico, dejando la solicitud en `aprobada`.
   - **Rechazar**: se guarda el motivo y la solicitud queda marcada como `rechazada`.

Mientras la solicitud no esté aprobada no se podrá utilizar a la empresa dentro de los flujos de convenios/asignaciones.

## Ejecución de tests

```bash
php bin/phpunit
```

Los tests funcionales cubren los workflows de convenios, asignaciones, empresas, estudiantes, tutores y la autenticación básica.
