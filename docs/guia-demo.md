# Guía de demo (TFG Agora)

## Requisitos previos
- PHP 8.2 + Composer
- Node.js 18+
- Base de datos configurada (SQLite por defecto)

## Puesta en marcha rápida
1. Backend:
   - cd backend
   - composer install
   - php bin/console doctrine:database:create --if-not-exists
   - php bin/console doctrine:migrations:migrate --no-interaction
   - php bin/console doctrine:fixtures:load --no-interaction
   - php -S 127.0.0.1:8000 -t public
2. Frontend (panel principal):
   - cd frontend/app
   - npm install
   - npm run dev -- --port 5173
3. Portal externo:
   - cd frontend/company-portal
   - npm install
   - npm run dev -- --port 5174

## Accesos
- Panel principal: http://localhost:5173
- Portal externo: http://localhost:5174
- API: http://127.0.0.1:8000/api

Credenciales demo:
- admin/admin123 (ROLE_ADMIN)
- coordinador/coordinador123 (ROLE_API)
- lectura/lectura123 (ROLE_USER)

## Recorrido sugerido para la demo
1. Dashboard: KPIs, alertas y módulos.
2. Empresas: detalle, notas, etiquetas, documentos.
3. Convenios: workflow, checklist y alertas.
4. Estudiantes: ficha y asignaciones.
5. Asignaciones: pipeline, detalle y timeline.
6. Portal externo: alta de solicitud.

## Capturas recomendadas
- Dashboard principal (KPIs).
- Módulo Empresas (panel + detalle).
- Módulo Convenios (workflow + alertas).
- Módulo Estudiantes (detalle con tabs).
- Módulo Asignaciones (kanban + detalle).
- Portal externo (formulario de solicitud).
