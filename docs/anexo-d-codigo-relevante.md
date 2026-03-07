# Anexo D. Codigo Relevante

## 1. Backend
### Seguridad y autenticacion
- `backend/config/packages/security.yaml`
- `backend/src/Controller/Api/AuthController.php`
- `backend/src/Entity/User.php`

### Dominio y persistencia
- `backend/src/Entity/EmpresaColaboradora.php`
- `backend/src/Entity/Convenio.php`
- `backend/src/Entity/Estudiante.php`
- `backend/src/Entity/AsignacionPractica.php`
- `backend/src/Entity/EmpresaSolicitud.php`
- `backend/migrations/Version20251113203450.php`
- `backend/src/DataFixtures/DemoDominioFixtures.php`

### Casos de uso principales
- `backend/src/Controller/Api/EmpresaColaboradoraController.php`
- `backend/src/Controller/Api/ConvenioController.php`
- `backend/src/Controller/Api/EstudianteController.php`
- `backend/src/Controller/Api/AsignacionController.php`
- `backend/src/Controller/Api/EmpresaSolicitudController.php`
- `backend/src/Controller/Portal/SolicitudPortalController.php`

## 2. Frontend interno
### Shell principal y modulos
- `frontend/app/src/App.tsx`

### Formularios reutilizables
- `frontend/app/src/components/EmpresaForm.tsx`
- `frontend/app/src/components/ConvenioForm.tsx`
- `frontend/app/src/components/EstudianteForm.tsx`
- `frontend/app/src/components/AsignacionForm.tsx`

### Infraestructura de UI
- `frontend/app/src/components/DataTable.tsx`
- `frontend/app/src/components/Modal.tsx`
- `frontend/app/src/components/ToastStack.tsx`

### Cliente API y exportacion
- `frontend/app/src/services/api.ts`
- `frontend/app/src/utils/csv.ts`

## 3. Frontend externo
- `frontend/company-portal/src/App.tsx`

## 4. Suite de pruebas destacada
- `backend/tests/Security/AuthenticationTest.php`
- `backend/tests/Controller/Portal/SolicitudPortalControllerTest.php`
- `backend/tests/Controller/Api/EmpresaSolicitudFlowTest.php`
- `backend/tests/Controller/Api/ConvenioControllerTest.php`
- `backend/tests/Controller/Api/AsignacionControllerTest.php`
- `backend/tests/Controller/Api/EmpresaControllerTest.php`

## 5. Criterio de seleccion
Este anexo recoge las piezas mas representativas para explicar:
- arquitectura;
- seguridad;
- modelo de dominio;
- flujos de negocio;
- validacion tecnica;
- exportacion funcional.
