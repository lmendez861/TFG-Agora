# Guia de demo (TFG Agora)

## Servicios verificados el 07/03/2026
- Backend API Symfony: http://127.0.0.1:8000
- Panel interno React: http://localhost:5173
- Portal externo React: http://localhost:5174

## Requisitos previos
- PHP 8.2
- Composer 2.x
- Node.js 18+ (validado localmente con Node 24)
- npm
- SQLite por defecto
- Symfony CLI opcional para un arranque mas comodo del backend

## Puesta en marcha rapida
1. Backend
   - `cd backend`
   - `composer install`
   - `php bin/console doctrine:migrations:migrate --no-interaction`
   - `php bin/console doctrine:fixtures:load --no-interaction`
   - `symfony server:start --no-tls -d --port=8000`
2. Panel principal
   - `cd frontend/app`
   - `npm install`
   - `npm run dev -- --host --port 5173 --strictPort`
3. Portal externo
   - `cd frontend/company-portal`
   - `npm install`
   - `npm run dev -- --host --port 5174 --strictPort`

## Nota sobre la base de datos incluida
- Si usas una copia previa de `backend/var/data_dev.sqlite` y Doctrine detecta las tablas pero no la version de migracion, ejecuta una sola vez: `php bin/console doctrine:migrations:version --add --all --no-interaction`.
- Si quieres un entorno completamente limpio, recrea la base local y repite migraciones y fixtures.

## Accesos demo
- Panel principal: http://localhost:5173
- Portal externo: http://localhost:5174
- API: http://127.0.0.1:8000/api

## Credenciales demo
- `admin / admin123` (`ROLE_ADMIN`)
- `coordinador / coordinador123` (`ROLE_API`)
- `lectura / lectura123` (`ROLE_USER`)

## Verificaciones tecnicas
- `php bin/phpunit` -> OK, 47 tests y 264 assertions.
- `npm run build` en `frontend/app` -> OK.
- `npm run build` en `frontend/company-portal` -> OK.
- `GET /api/empresas` con Basic auth (`admin/admin123`) -> `200 OK`.
- El panel interno permite exportar CSV desde dashboard, tablas principales, tutores y solicitudes.

## Recorrido sugerido para la demo
1. Dashboard del panel interno: KPI, resumen de convenios, solicitudes pendientes y exportacion de resumen CSV.
2. Empresas: detalle, notas, etiquetas, documentos, relaciones con convenios y exportacion CSV del listado.
3. Convenios: workflow, checklist, documentos, alertas y exportacion CSV.
4. Estudiantes: ficha individual, asignaciones relacionadas y exportacion CSV.
5. Asignaciones: pipeline, detalle, seguimientos, evaluacion final y exportacion CSV.
6. Solicitudes: revision, aprobacion o rechazo desde el panel interno, con exportacion CSV de seguimiento.
7. Portal externo: alta de empresa, verificacion y chat empresa-centro.

## Capturas recomendadas
- Dashboard principal con KPI y notificaciones.
- Vista de Empresas con detalle lateral.
- Vista de Convenios con workflow y alertas.
- Vista de Estudiantes con asignaciones.
- Vista de Asignaciones con detalle y seguimiento.
- Vista de Solicitudes de empresa.
- Portal externo con formulario, verificacion y chat.
