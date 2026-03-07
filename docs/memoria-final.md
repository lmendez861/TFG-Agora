# Trabajo Final de Grado - Gestion de Empresas Colaboradoras

- Autor: Luis Angel
- Tutora: Elena
- Fecha de revision: 07/03/2026
- Repositorio: https://github.com/lmendez861/TFG-gora

## 1. Portada
Titulo: Gestion de Empresas Colaboradoras para FP Dual
Autor: Luis Angel
Tutora: Elena
Fecha: 07/03/2026

## 2. Agradecimientos
[Pendiente de personalizar con el texto final de agradecimientos.]

## 3. Indice
[Se generara en la maquetacion final, incluyendo indice general, de tablas y de figuras.]

## 4. Resumen
### 4.1 Resumen (ES)
Este proyecto desarrolla una plataforma web para gestionar empresas colaboradoras, convenios, estudiantes, tutores y solicitudes externas en un entorno de FP Dual. La solucion combina una API en Symfony, un panel interno en React/TypeScript y un portal externo para empresas. El sistema ya permite CRUD de entidades principales, seguimiento documental, workflow de convenios, mensajeria asociada a solicitudes y control de acceso por roles. La validacion tecnica actual confirma 47 pruebas backend superadas y compilacion correcta de ambos frontends.

### 4.2 Summary (EN)
This project delivers a web platform to manage partner companies, agreements, students, mentors, and external registration requests for dual training. The solution combines a Symfony API, an internal React/TypeScript dashboard, and an external company portal. The system already supports CRUD operations for the main entities, document handling, agreement workflow, request messaging, and role-based access control. Current technical validation confirms 47 passing backend tests and successful production builds for both frontends.

## 5. Antecedentes / Introduccion
- La gestion inicial de empresas colaboradoras, convenios y practicas se hacia con hojas de calculo, correos y documentos dispersos.
- Ese enfoque generaba duplicidades, falta de trazabilidad, poca visibilidad de estados y dependencia de conocimiento manual.
- El proyecto Agora original se reutilizo solo como base tecnica. La logica previa de chats y bots se archivo en `legacy/`.
- El nuevo alcance se centra en un problema real del centro: registrar empresas, aprobar solicitudes, formalizar convenios y controlar asignaciones y seguimientos.
- El sistema esta orientado a coordinacion de practicas, tutores academicos, tutores profesionales y empresas interesadas en colaborar.

## 6. Objetivos y alcance
### 6.1 Objetivo general
Disenar e implantar una aplicacion web que centralice la gestion de empresas colaboradoras y practicas formativas, unificando informacion operativa, control documental y seguimiento de estados en una unica plataforma.

### 6.2 Objetivos especificos
1. Digitalizar el ciclo de vida de empresa, convenio, estudiante, tutor y asignacion.
2. Habilitar un flujo publico de solicitud de empresa con verificacion y aprobacion interna.
3. Ofrecer un panel interno con KPI, tablas de gestion, detalle de entidades y acciones CRUD.
4. Incorporar workflow documental y alertas para convenios y empresas.
5. Proteger la API y el panel con autenticacion y jerarquia de roles.

### 6.3 Alcance
- Dentro del alcance: panel interno, portal externo, API REST, base de datos relacional, usuarios demo, solicitudes de empresas, mensajeria vinculada, documentos, checklist, alertas y exportacion CSV de listados operativos.
- Fuera del alcance actual: firma electronica avanzada, integracion con ERP/SGA, exportacion PDF maquetada, almacenamiento documental en nube y pruebas E2E completas.

## 7. Definiciones
- Empresa colaboradora: organizacion que puede acoger estudiantes del centro.
- Convenio: acuerdo que formaliza la colaboracion entre el centro y una empresa.
- Asignacion: relacion operativa entre estudiante, convenio, empresa y tutores.
- Seguimiento: registro de reuniones, incidencias o acciones de control sobre una asignacion.
- Solicitud de empresa: alta inicial enviada por una empresa desde el portal externo antes de ser aprobada.

## 8. Notaciones y simbolos
- API: Application Programming Interface.
- CRUD: Create, Read, Update, Delete.
- FP Dual: Formacion Profesional Dual.
- KPI: Key Performance Indicator.
- RGPD: Reglamento General de Proteccion de Datos.
- SPA: Single Page Application.

## 9. Desarrollo del trabajo final
### 9.1 Analisis de requisitos
- Actores principales: coordinador o administrador, tutor academico, tutor profesional, estudiante y empresa externa.
- Casos de uso principales: consultar KPI, registrar empresas, crear y actualizar convenios, gestionar estudiantes y asignaciones, revisar solicitudes externas, adjuntar documentos, intercambiar mensajes y consultar detalle historico.
- Requisitos funcionales: listados con filtros, operaciones CRUD, validaciones de negocio, workflow de convenios, aprobacion y rechazo de solicitudes, detalle de entidades, notificaciones y consulta de tutores.
- Requisitos no funcionales: interfaz responsive, errores JSON normalizados, seguridad por roles, arquitectura mantenible, base de datos portable y despliegue reproducible en entorno local.

### 9.2 Diseno de la solucion
- La solucion se divide en tres piezas: backend Symfony 7.3, panel interno React 18 + TypeScript + Vite y portal externo React 19 + TypeScript + Vite.
- El backend expone una API REST protegida bajo `/api`, junto con rutas publicas para registro de empresas y rutas de portal basadas en token.
- El panel interno consume la API mediante un cliente ligero (`frontend/app/src/services/api.ts`) con cabecera Basic automatica desde variables de entorno.
- El portal externo permite registrar empresas, verificar el correo con token y usar un canal de mensajeria asociado a la solicitud.
- La persistencia se resuelve con Doctrine ORM y SQLite por defecto en desarrollo, aunque la configuracion admite otras bases soportadas por Symfony.

### 9.3 Modelo de datos
- Entidades nucleares: `EmpresaColaboradora`, `Convenio`, `Estudiante`, `TutorAcademico`, `TutorProfesional`, `AsignacionPractica`, `Seguimiento` y `EvaluacionFinal`.
- Entidades de soporte a negocio: `EmpresaSolicitud`, `EmpresaMensaje`, `EmpresaDocumento`, `EmpresaEtiqueta`, `EmpresaNota`, `ConvenioDocumento`, `ConvenioChecklistItem`, `ConvenioAlerta` y `ConvenioWorkflowEvento`.
- Seguridad y acceso: entidad `User` con roles `ROLE_USER`, `ROLE_API` y `ROLE_ADMIN`.
- Relaciones principales: una empresa tiene convenios, contactos, documentos, notas y tutores; un convenio genera asignaciones y eventos de workflow; cada asignacion enlaza estudiante, empresa y tutores, y produce seguimientos y evaluacion final.

### 9.4 Seguridad y cumplimiento
- La API usa autenticacion HTTP Basic y tambien deja preparado `json_login` para integraciones futuras.
- La jerarquia de seguridad define `ROLE_ADMIN` por encima de `ROLE_API` y `ROLE_USER`.
- Las rutas publicas se limitan al alta de solicitudes y a la confirmacion de correo/token; el resto de recursos de gestion requieren autenticacion.
- Los controladores devuelven respuestas JSON con mensajes de error consistentes y codigos HTTP adecuados.
- En cumplimiento y privacidad, el sistema trabaja con datos minimos necesarios, separa portal publico y panel interno, y deja como mejora futura la auditoria avanzada y la politica definitiva de conservacion documental.

### 9.5 Diseno de interfaz
- El panel principal se organiza en modulos: dashboard, empresas, convenios, estudiantes, asignaciones, tutores, solicitudes y documentacion.
- La interfaz combina tablas, tarjetas de detalle, chips de estado, modales de formulario, toasts y un centro de notificaciones para solicitudes pendientes.
- La vista de convenios incluye checklist, workflow, documentos y alertas activas o descartadas.
- La vista de empresas concentra KPI, convenios asociados, asignaciones, notas, etiquetas y documentos.
- El portal externo ofrece una experiencia diferenciada y mas simple: formulario de alta, bandeja de verificacion y chat empresa-centro.

### 9.6 Implementacion
- Backend:
  - Controladores REST para empresas, convenios, estudiantes, asignaciones y tutores.
  - Controladores especificos para solicitudes de empresa, mensajeria asociada y portal por token.
  - Fixtures demo con usuarios, empresas, convenios, estudiantes, tutores, asignaciones, checklist, alertas y mensajes.
- Frontend interno:
  - `App.tsx` actua como shell del panel, rutas, dashboard y modulos de detalle.
  - Formularios modales reutilizables para empresas, convenios, estudiantes y asignaciones.
  - Cliente API con helpers `apiGet`, `apiPost`, `apiPut`, `PATCH` y soporte para subida de documentos.
- Frontend externo:
  - Landing con formulario publico.
  - Confirmacion de email mediante token.
  - Chat simple sobre la solicitud mientras esta en revision.
- Estado actual de implementacion: la funcionalidad principal esta operativa y validada; el panel ya incorpora exportacion CSV de resumenes y listados, y los desarrollos abiertos se concentran en endurecimiento productivo, exportacion PDF y automatizacion E2E.

### 9.7 Pruebas y validacion
- El backend dispone de una suite automatizada con 47 pruebas y 264 aserciones.
- La bateria cubre autenticacion, listado y detalle de empresas, convenios, estudiantes y asignaciones, flujo completo de solicitudes, portal por token, documentos y repositorios.
- El 07/03/2026 se verifico ademas el arranque real de los tres servicios locales:
  - API Symfony en `http://127.0.0.1:8000`
  - Panel interno en `http://localhost:5173`
  - Portal externo en `http://localhost:5174`
- Ambos frontends generan build de produccion sin errores con `npm run build`.
- Como limitacion de validacion, todavia no existe una suite E2E de navegador.

### 9.8 Despliegue y operacion
- En desarrollo local se usa `backend/.env.local` con SQLite y `frontend/app/.env.local` para URL base y credenciales de API.
- El backend puede iniciarse con Symfony CLI o servidor PHP local; los dos frontends se ejecutan con Vite en puertos separados.
- La operacion cotidiana requiere unicamente PHP, Composer, Node.js, npm y la base SQLite local.
- Para una entrega productiva se recomienda separar frontends estaticos, API Symfony y almacenamiento documental, ademas de sustituir Basic auth por un mecanismo mas robusto.
- La guia operativa del proyecto queda recogida en `docs/guia-demo.md`.

### 9.9 Resultados y metricas (07/03/2026)
- Tres servicios levantados y accesibles de forma concurrente: backend, panel interno y portal externo.
- La llamada autenticada a `/api/empresas` devuelve respuesta valida y datos de demo.
- `php bin/phpunit` finaliza en verde con 47 pruebas y 264 aserciones.
- `npm run build` se completa correctamente en `frontend/app` y `frontend/company-portal`.
- El panel interno permite exportar a CSV el dashboard, empresas, convenios, estudiantes, asignaciones, tutores y solicitudes.
- El flujo funcional mas relevante queda cubierto: solicitud externa, confirmacion por token, aprobacion interna, consulta de detalle y gestion documental basica.

### 9.10 Limitaciones y riesgos
- La autenticacion actual resuelve el entorno academico y de demo, pero no cubre escenarios de SSO, MFA o auditoria avanzada.
- No hay exportacion PDF maquetada ni integracion con sistemas corporativos externos.
- El almacenamiento de documentos sigue siendo local y debe endurecerse antes de usar datos reales.
- Falta automatizar pruebas E2E del panel y del portal para reducir riesgo de regresion visual o de flujo.
- La memoria final en PDF todavia requerira maquetacion y capturas finales para entrega academica.

### 9.11 Verificacion tecnica (07/03/2026)
- Backend:
  - `php bin/phpunit` -> OK, 47 tests, 264 assertions.
  - `symfony server:start --no-tls -d --port=8000` -> servicio operativo.
- Frontend interno:
  - `npm run dev -- --host --port 5173 --strictPort` -> servicio operativo.
  - `npm run build` -> compilacion correcta.
- Portal externo:
  - `npm run dev -- --host --port 5174 --strictPort` -> servicio operativo.
  - `npm run build` -> compilacion correcta.
- Verificacion HTTP:
  - `GET /api/empresas` con `admin/admin123` -> `200 OK`.
  - `GET /` en `5173` y `5174` -> `200 OK`.

## 10. Conclusiones y recomendaciones
- El proyecto ya cumple el objetivo principal de centralizar la gestion de empresas colaboradoras y practicas en una plataforma unica y operativa.
- La separacion entre panel interno, portal externo y API permite escalar funcionalidades sin mezclar responsabilidades.
- El mayor valor aportado al centro es la trazabilidad del ciclo completo: solicitud, aprobacion, convenio, asignacion, seguimiento y documentacion.
- Como siguientes pasos se recomienda reforzar almacenamiento y seguridad de documentos, completar la salida PDF y automatizar pruebas E2E para consolidar la entrega final.

## 11. Referencias
1. Proyecto TFG Agora. `docs/domain-model.md`.
2. Proyecto TFG Agora. `docs/guia-demo.md`.
3. Symfony. *Symfony Documentation*.
4. Doctrine Project. *Doctrine ORM Documentation*.
5. React Team. *React Documentation*.
6. Parlamento Europeo y Consejo de la Union Europea. *Reglamento (UE) 2016/679*.

## 12. Bibliografia
- Documentacion oficial de Vite y TypeScript para la construccion de SPA modernas.
- Material docente del modulo de proyecto y guias internas del centro.
- Referencias sobre gestion de practicas, modelado REST y seguridad web.

## 13. Anexos
### Anexo A. Manual de usuario
Referencia principal: `docs/anexo-a-manual-usuario.md`.

### Anexo B. Manual tecnico
Referencia principal: `docs/anexo-b-manual-tecnico.md`.

### Anexo C. Evidencias de validacion
Referencia principal: `docs/anexo-c-capturas-y-evidencias.md`.

### Anexo D. Artefactos de apoyo
Referencias principales:
- `docs/anexo-d-codigo-relevante.md`
- `docs/domain-model.md`
- `docs/refactor-plan.md`
