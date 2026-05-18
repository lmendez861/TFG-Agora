# Anexo B. Manual Tecnico

## 1. Arquitectura general

La solucion se compone de seis bloques:

- `backend/`: API Symfony con Doctrine ORM, seguridad, correo, auditoria y monitorizacion.
- `frontend/app/`: portal interno React 18 + TypeScript + Vite.
- `frontend/company-portal/`: portal externo React 19 + TypeScript + Vite.
- `desktop/`: app de escritorio Electron para operacion local, pruebas y empaquetado Windows.
- `docs/`: memoria, anexos, capturas y artefactos de entrega.
- `tools/`: utilidades auxiliares de operacion local.

## 2. Requisitos locales

### 2.1 Desarrollo desde repositorio

- PHP 8.2
- Composer 2.x
- Node.js 18+
- npm
- SQLite con `pdo_sqlite` activo en PHP
- Symfony CLI opcional

### 2.2 Ejecucion empaquetada

Para la app instalada no hace falta que el equipo destino tenga PHP, Composer, Node.js o npm. Agora Desktop empaqueta una copia portable de PHP y reutiliza las builds integradas del backend.

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

### 3.2 Frontend interno en desarrollo

```bash
cd frontend/app
copy .env.example .env.local
npm install
npm run dev -- --host --port 5173 --strictPort
```

### 3.3 Portal externo en desarrollo

```bash
cd frontend/company-portal
copy .env.example .env.local
npm install
npm run dev -- --host --port 5174 --strictPort
```

### 3.4 Build integrada

```bash
cd frontend/app
npm run build:backend

cd ../company-portal
npm run build:backend
```

Con las builds generadas, Symfony sirve:

- `http://127.0.0.1:8000/app`
- `http://127.0.0.1:8000/externo`
- `http://127.0.0.1:8000/documentacion`
- `http://127.0.0.1:8000/monitor`

### 3.5 Prueba remota sin instalacion local

Para una revision externa rapida, la persona evaluadora no tiene que instalar el entorno si la VM publica esta activa. La ruta usada en la revision final es una VM Ubuntu de Google Cloud Compute Engine publicada por HTTPS y resuelta con un hostname wildcard `nip.io`, por ejemplo `https://agora.34.175.224.87.nip.io/`. Desde esa direccion se accede a `URL/app/`, `URL/externo/`, `URL/documentacion/` o `URL/monitor/`.

Este modo ya no depende del equipo local del alumno. Para una prueba controlada del portal interno se dejan `profesora / Abrete01` y `profesor / Abrete01` como accesos de coordinacion.

### 3.6 App de escritorio empaquetada

La app de escritorio puede generarse asi:

```bash
cd desktop
npm install
npm run package:win
```

El build deja dos artefactos principales en `desktop/dist/`:

- `Agora Desktop Setup <version>.exe`: instalador Windows.
- `win-unpacked/Agora Desktop.exe`: carpeta ejecutable para validacion directa.

La build incluye `resources/backend`, `resources/tools/cloudflared.exe` y `resources/php/php.exe`. En tiempo de ejecucion la app controla migraciones, SQLite, acceso externo local, pruebas, logs, backups y restauracion desde su propia interfaz. Ademas, el modo cloud permite consumir el monitor remoto, abrir portales desplegados, leer logs por SSH y ejecutar pruebas de smoke contra la instancia publica.

Validacion headless del paquete:

```bash
cd desktop
npm run validate:packaged
```

Este chequeo usa exactamente los recursos empaquetados de `dist/win-unpacked/resources` y confirma que el backend, la SQLite, `/app`, `/externo`, `/api/monitor` y la exportacion CSV responden sin depender de PHP o Node instalados fuera del binario.

## 4. Variables de entorno relevantes

### 4.1 Backend

- `DATABASE_URL`
- `MAILER_DSN`
- `APP_MAIL_FROM`
- `APP_INTERNAL_MFA_EMAIL`
- `APP_MFA_TTL_SECONDS`
- `APP_DOCUMENT_STORAGE_DIR`
- `APP_PUBLIC_URL_TARGET`
- `APP_EXTERNAL_BASE_URL`
- `APP_ENABLE_DEMO_TEACHERS`
- `DEMO_TEACHER_PASSWORD`
- `DEFAULT_URI`
- `CORS_ALLOW_ORIGIN`

### 4.2 Frontend interno

- `VITE_API_BASE_URL`
- `VITE_API_USERNAME`
- `VITE_API_PASSWORD`

### 4.3 Portal externo

- `VITE_API_BASE_URL`

## 5. Seguridad

- El backend protege `/api` mediante seguridad Symfony.
- El portal interno usa `json_login` y sesion.
- El backend mantiene `http_basic` como soporte operativo para pruebas y utilidades tecnicas controladas.
- El portal externo usa un firewall separado con proveedor `EmpresaPortalCuenta`.
- Existen rutas publicas para preregistro de cuenta, login del portal externo, confirmacion de solicitud y solicitud de reseteo o restablecimiento de contrasena.
- El monitor privado exige rol de monitorizacion y MFA para activar o detener el acceso publico local temporal.
- La auditoria registra operaciones sensibles como aprobaciones, acceso publico, MFA, login de empresa y acciones de seguimiento.

### 5.1 Jerarquia de roles interna

- `ROLE_ADMIN`
- `ROLE_COORDINATOR`
- `ROLE_DOCUMENT_MANAGER`
- `ROLE_MONITOR`
- `ROLE_AUDITOR`
- `ROLE_API`
- `ROLE_USER`

### 5.2 Rol externo

- `ROLE_COMPANY_PORTAL`

## 6. Persistencia

La base de datos por defecto es SQLite. En desarrollo local no se necesita un servidor MySQL ni PostgreSQL para la demo basica. El esquema se apoya en migraciones Doctrine y datos demo.

Elementos relevantes:

- migraciones en `backend/migrations/`
- fixtures en `backend/src/DataFixtures/DemoDominioFixtures.php`
- base local por defecto en `backend/var/`

## 7. Correo saliente

El proyecto queda preparado para correo transaccional mediante Brevo. Se usa para:

- verificacion de solicitudes externas;
- reseteo de contrasena;
- MFA del monitor privado.

El monitor refleja si el `MAILER_DSN` es real, de ejemplo o no funcional.

## 8. Control documental

El almacenamiento documental se gestiona desde `DocumentStorageManager`. El sistema:

- valida tipos de fichero;
- guarda rutas relativas controladas;
- permite descarga posterior;
- versiona documentos de empresa y convenio;
- admite retirada logica y restauracion de versiones;
- soporta evidencias en seguimientos.

## 9. Estructura funcional del backend

Controladores principales:

- `backend/src/Controller/Api/EmpresaColaboradoraController.php`
- `backend/src/Controller/Api/ConvenioController.php`
- `backend/src/Controller/Api/EstudianteController.php`
- `backend/src/Controller/Api/AsignacionController.php`
- `backend/src/Controller/Api/EmpresaSolicitudController.php`
- `backend/src/Controller/Api/EmpresaMensajeController.php`
- `backend/src/Controller/Api/PortalCompanyController.php`
- `backend/src/Controller/Api/MfaController.php`
- `backend/src/Controller/Api/PublicAccessController.php`
- `backend/src/Controller/Api/MonitorController.php`
- `backend/src/Controller/PortalAuthController.php`
- `backend/src/Controller/RegistroEmpresaController.php`
- `backend/src/Controller/Portal/SolicitudPortalController.php`

Servicios relevantes:

- `backend/src/Service/BootstrapSnapshotProvider.php`
- `backend/src/Service/PortalCompanyAccountManager.php`
- `backend/src/Service/InternalMfaManager.php`
- `backend/src/Service/DocumentStorageManager.php`
- `backend/src/Service/AuditLogger.php`
- `backend/src/Service/PublicAccessManager.php`

## 10. Estructura funcional del frontend interno

Archivos clave:

- `frontend/app/src/App.tsx`
- `frontend/app/src/components/MonitorPage.tsx`
- `frontend/app/src/components/DocumentationGuidePage.tsx`
- `frontend/app/src/components/MessageInboxPage.tsx`
- `frontend/app/src/components/AsignacionForm.tsx`
- `frontend/app/src/components/ConvenioForm.tsx`
- `frontend/app/src/services/api.ts`
- `frontend/app/src/utils/csv.ts`

## 11. Estructura funcional del portal externo

Archivos clave:

- `frontend/company-portal/src/App.tsx`
- `backend/src/Controller/PortalAuthController.php`
- `backend/src/Controller/Api/PortalCompanyController.php`
- `backend/src/Entity/EmpresaPortalCuenta.php`
- `backend/src/Entity/EmpresaSolicitud.php`
- `backend/src/Entity/EmpresaMensaje.php`

El flujo tecnico del portal externo queda asi:

1. `POST /portal-auth/register` crea `EmpresaPortalCuenta`.
2. `POST /portal-auth/login` abre la sesion del firewall externo.
3. `POST /api/portal-company/request` crea `EmpresaSolicitud` asociada a la cuenta.
4. `GET /registro-empresa/confirmar?token=...` verifica el correo de la solicitud.
5. `GET /api/portal-company/overview` devuelve cuenta, solicitud, mensajes y, cuando ya existe, la empresa aprobada.
6. `POST /api/portal-company/messages` mantiene la conversacion desde la misma cuenta antes y despues de la aprobacion.
- `backend/src/Service/PortalCompanyAccountManager.php`

## 12. App de escritorio

Archivos clave:

- `desktop/main.js`
- `desktop/preload.js`
- `desktop/renderer/index.html`
- `desktop/renderer/app.js`
- `desktop/renderer/styles.css`
- `desktop/scripts/build-desktop.js`

Capacidades principales:

- levantar y detener backend local;
- activar y desactivar acceso externo local con MFA;
- abrir portal interno, externo y monitor en local;
- guardar perfiles remotos cloud;
- abrir portal interno y externo desplegados;
- consultar monitor y logs remotos;
- reiniciar contenedores remotos y generar backups PostgreSQL;
- ejecutar baterias de pruebas y smoke workflows;
- crear backups SQLite y restaurarlos;
- empaquetar la app con PHP portable.

## 13. Exportacion CSV

La exportacion CSV se realiza de forma mixta:

- resumen del dashboard generado desde frontend;
- listados principales descargados desde endpoints CSV del backend.

Actualmente se exportan:

- dashboard;
- empresas;
- convenios;
- estudiantes;
- asignaciones;
- tutores;
- solicitudes.

## 14. Validacion tecnica

Comandos principales:

```bash
cd backend
php bin/phpunit
```

```bash
cd frontend/app
npm test -- --run
npm run test:e2e
npm run build:backend
```

```bash
cd frontend/company-portal
npm run build:backend
```

## 15. Riesgos tecnicos abiertos

- el acceso publico principal ya no depende del equipo local, pero el modo local con tunel temporal sigue existiendo como soporte tecnico;
- la autenticacion corporativa no esta integrada con SSO institucional;
- el almacenamiento documental sigue dependiendo de volumen local de la VM aunque el binario de nuevos documentos de empresa ya quede embebido en base de datos;
- la optimizacion de rendimiento puede profundizarse con perfilado adicional, observabilidad y pruebas de carga en produccion real.
