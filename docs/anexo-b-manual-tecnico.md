# Anexo B. Manual Tecnico

## 1. Arquitectura general
La solucion se compone de tres aplicaciones:
- `backend/`: API Symfony 7.3 con Doctrine ORM y SQLite por defecto.
- `frontend/app/`: panel interno React 18 + TypeScript + Vite.
- `frontend/company-portal/`: portal externo React 19 + TypeScript + Vite.

## 2. Requisitos locales
- PHP 8.2
- Composer 2.x
- Node.js 18+
- npm
- SQLite
- Symfony CLI opcional

## 3. Arranque del entorno
El repositorio no queda operativo solo con clonar desde Git. Hace falta instalar dependencias y crear los `.env.local`.

### 3.1 Backend
```bash
cd backend
copy .env.local.example .env.local
composer install
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console doctrine:fixtures:load --no-interaction
symfony server:start --no-tls -d --port=8000
```

### 3.2 Frontend interno
```bash
cd frontend/app
copy .env.example .env.local
npm install
npm run dev -- --host --port 5173 --strictPort
```

### 3.3 Portal externo
```bash
cd frontend/company-portal
copy .env.example .env.local
npm install
npm run dev -- --host --port 5174 --strictPort
```

## 4. Variables de entorno relevantes
### 4.1 Backend
- `DATABASE_URL`
- `MAILER_DSN`
- `APP_MAIL_FROM`
- `DEFAULT_URI`
- `CORS_ALLOW_ORIGIN`

### 4.2 Frontend interno
- `VITE_API_BASE_URL`
- `VITE_API_USERNAME`
- `VITE_API_PASSWORD`
- `VITE_DEV_HTTPS`
- `VITE_DEV_HTTPS_KEY`
- `VITE_DEV_HTTPS_CERT`

### 4.3 Portal externo
- `VITE_API_BASE_URL`
- `VITE_DEV_HTTPS`
- `VITE_DEV_HTTPS_KEY`
- `VITE_DEV_HTTPS_CERT`

## 5. Seguridad
- El backend protege `/api` mediante seguridad Symfony.
- Se usa HTTP Basic y `json_login` queda preparado para evolucion posterior.
- Las credenciales del panel se importan desde `frontend/app/.env.local`.
- Las subidas de documentos reutilizan esas mismas credenciales de entorno.
- El soporte HTTPS queda preparado mediante `DEFAULT_URI`, `CORS_ALLOW_ORIGIN` y configuracion TLS opcional en ambos Vite.
- Jerarquia de roles:
  - `ROLE_ADMIN`
  - `ROLE_API`
  - `ROLE_USER`

## 6. Versiones de React
- `frontend/app`: React 18.3.1.
- `frontend/company-portal`: React 19.2.0.

La coexistencia es valida porque ambas aplicaciones son independientes, se compilan por separado y no comparten runtime en navegador.

## 7. Persistencia
La base de datos por defecto es SQLite. El esquema actual se crea a partir de la migracion base:
- `backend/migrations/Version20251113203450.php`

La carga de datos demo se realiza mediante:
- `backend/src/DataFixtures/DemoDominioFixtures.php`

## 8. Estructura funcional del backend
Controladores principales:
- `backend/src/Controller/Api/EmpresaColaboradoraController.php`
- `backend/src/Controller/Api/ConvenioController.php`
- `backend/src/Controller/Api/EstudianteController.php`
- `backend/src/Controller/Api/AsignacionController.php`
- `backend/src/Controller/Api/TutorAcademicoController.php`
- `backend/src/Controller/Api/TutorProfesionalController.php`
- `backend/src/Controller/Api/EmpresaSolicitudController.php`
- `backend/src/Controller/Api/EmpresaMensajeController.php`
- `backend/src/Controller/RegistroEmpresaController.php`
- `backend/src/Controller/Portal/SolicitudPortalController.php`

## 9. Estructura funcional del frontend interno
Archivos clave:
- `frontend/app/src/App.tsx`
- `frontend/app/src/components/DataTable.tsx`
- `frontend/app/src/components/EmpresaForm.tsx`
- `frontend/app/src/components/ConvenioForm.tsx`
- `frontend/app/src/components/EstudianteForm.tsx`
- `frontend/app/src/components/AsignacionForm.tsx`
- `frontend/app/src/services/api.ts`
- `frontend/app/src/utils/csv.ts`

## 10. Exportacion CSV
La exportacion CSV se realiza en cliente mediante:
- `frontend/app/src/utils/csv.ts`

Actualmente se exportan:
- dashboard;
- empresas;
- convenios;
- estudiantes;
- asignaciones;
- tutores;
- solicitudes.

## 11. Validacion tecnica
Comandos principales:
```bash
cd backend
php bin/phpunit
```

```bash
cd frontend/app
npm run build
```

```bash
cd frontend/company-portal
npm run build
```

## 12. Riesgos tecnicos abiertos
- no existe suite E2E de navegador;
- la autenticacion del panel sigue basada en credenciales de entorno;
- la salida PDF final de la memoria requiere maquetacion posterior;
- el almacenamiento documental sigue siendo local.
