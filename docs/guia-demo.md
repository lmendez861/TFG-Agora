# Guia operativa (TFG Agora)

## Servicios verificados el 23/03/2026
- Backend API Symfony: http://127.0.0.1:8000
- Panel interno integrado: http://127.0.0.1:8000/app
- Portal externo integrado: http://127.0.0.1:8000/externo

## Requisitos previos
- PHP 8.2
- Composer 2.x
- Node.js 18+ (validado localmente con Node 24)
- npm
- SQLite por defecto
- Symfony CLI opcional

## Puesta en marcha rapida
1. Backend
   - `cd backend`
   - `copy .env.local.example .env.local`
   - `composer install`
   - `php bin/console doctrine:migrations:migrate --no-interaction`
   - `php bin/console doctrine:fixtures:load --no-interaction`
   - `start-server.bat`
2. Panel principal
   - `cd frontend/app`
   - `copy .env.example .env.local`
   - `npm install`
   - `npm run dev -- --host --port 5173 --strictPort`
3. Portal externo
   - `cd frontend/company-portal`
   - `copy .env.example .env.local`
   - `npm install`
   - `npm run dev -- --host --port 5174 --strictPort`

## Modo URL unica
- `build-single-url.bat`
- `cd backend`
- `start-server.bat`
- Accesos finales:
  - `http://127.0.0.1:8000/app`
  - `http://127.0.0.1:8000/externo`
  - `http://127.0.0.1:8000/api`
  - `http://127.0.0.1:8000/documentacion`
  - `http://127.0.0.1:8000/control` -> redirige a `/monitor`
  - `http://127.0.0.1:8000/monitor`

## URL publica temporal
- `start-demo-public.bat`
- El script genera la build unificada, arranca el backend y abre un tunel `trycloudflare.com`.
- En la primera ejecucion, `start-public-url.bat` descarga `cloudflared` automaticamente.
- Con la URL mostrada, abre `URL/app` y `URL/externo`.
- Si el backend ya esta arrancado, puedes usar solo `start-public-url.bat`.
- Desde el monitor privado tambien puede activarse o bajarse el acceso externo en `/monitor`.
- La guia de documentacion sigue accesible en local aunque el acceso publico temporal este apagado.

## Nota de instalacion
- Si descargas el proyecto desde Git, no queda funcional automaticamente.
- Es obligatorio instalar dependencias y crear los `.env.local`.
- Con migraciones y fixtures cargadas, el entorno queda listo para demo.

## HTTPS opcional
- Backend: ajustar `DEFAULT_URI` y `CORS_ALLOW_ORIGIN` en `backend/.env.local`.
- Frontends: activar `VITE_DEV_HTTPS=true` y definir `VITE_DEV_HTTPS_KEY` y `VITE_DEV_HTTPS_CERT`.
- Si no configuras TLS local, la demo puede seguir por HTTP sin afectar a la logica del proyecto.

## Versiones de React
- Panel interno: React 18.3.1
- Portal externo: React 19.2.0
- La diferencia es valida porque ambas aplicaciones son independientes.

## Accesos locales
- Panel principal: http://localhost:5173
- Portal externo: http://localhost:5174
- API: http://127.0.0.1:8000/api

## Credenciales internas
- `admin / admin123` (`ROLE_ADMIN`)
- `coordinador / coordinador123` (`ROLE_API`)
- `lectura / lectura123` (`ROLE_USER`)

## Verificaciones tecnicas
- `php bin/phpunit` -> OK, 61 tests y 344 assertions.
- `npm test` en `frontend/app` -> OK, 13 tests.
- `npm run build` en `frontend/app` -> OK.
- `npm run build:backend` en `frontend/app` -> OK.
- `npm run build` en `frontend/company-portal` -> OK.
- `GET /api/empresas` con Basic auth (`admin/admin123`) -> `200 OK`.
- `GET /documentacion` y `GET /monitor` -> `200 OK`.
- `GET /control` -> redirige a `/monitor`.
- El panel interno permite exportar CSV desde dashboard, tablas principales, tutores y solicitudes.

## Recorrido sugerido
1. Dashboard del panel interno: KPI, resumen de convenios, solicitudes pendientes y exportacion CSV.
2. Guia de documentacion: recorrido funcional del proyecto sin mezclarlo con la capa tecnica.
3. Empresas: detalle, notas, etiquetas, documentos, relaciones con convenios y exportacion CSV.
4. Convenios: workflow, checklist, documentos, alertas y exportacion CSV.
5. Solicitudes: revision, aprobacion o rechazo desde el panel interno, con exportacion CSV.
6. Portal externo: alta de empresa, verificacion y chat empresa-centro.
7. Monitor privado: solo si la tutora pide justificar despliegue, acceso externo o estado tecnico.

## Contingencias
- Si no da tiempo a toda la demo, priorizar dashboard, convenios, solicitudes y portal externo.
- Si un servicio no arranca, apoyar la explicacion con `docs/memoria-final.md`, `docs/anexo-b-manual-tecnico.md` y los resultados de pruebas y builds.
- Si falla una accion puntual, reconducir a la arquitectura, el flujo funcional y la evidencia tecnica ya preparada.
