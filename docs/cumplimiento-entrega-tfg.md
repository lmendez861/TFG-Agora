# Cumplimiento de Entrega TFG

## 1. Memoria y anexos

- OK `docs/memoria-final.md` actualizado y sincronizado con el estado real del proyecto.
- OK `docs/memoria-final.docx` generado.
- OK `docs/memoria-final.pdf` generado.
- OK `docs/memoria-final-export.pdf` generado.
- OK anexos A, B y C revisados y alineados con la version final.
- OK capturas principales del sistema regeneradas con la interfaz actual.

## 2. Arquitectura y modulos requeridos

- OK API Symfony como nucleo de negocio y seguridad.
- OK portal interno independiente en React y TypeScript.
- OK portal externo independiente para empresas.
- OK documentacion separada del flujo operativo.
- OK monitor privado separado para supervision tecnica.

## 3. Funcionalidad esencial entregada

- OK gestion de empresas, convenios, estudiantes, tutores y asignaciones.
- OK dashboard con KPI operativos y exportacion CSV.
- OK solicitudes externas con verificacion por correo.
- OK aprobacion y rechazo interno de solicitudes.
- OK bandeja unificada de mensajes empresa-centro.
- OK cuenta persistente de empresa con activacion, login y recuperacion de contrasena.
- OK seguimientos con evidencias y evaluacion final.
- OK control documental con versionado, retirada y restauracion.
- OK monitor con MFA para operaciones sensibles.

## 4. Validacion tecnica

- OK `php bin/phpunit`
- OK `npm test -- --run` en `frontend/app`
- OK `npm run test:e2e` en `frontend/app`
- OK `npm run build:backend` en `frontend/app`
- OK `npm run build:backend` en `frontend/company-portal`
- OK comprobaciones HTTP de `/app`, `/externo`, `/documentacion` y `/monitor`
- OK comprobaciones autenticadas de `/api/bootstrap`, `/api/monitor` y `/api/empresa-solicitudes/bandeja`

## 5. Material de defensa

- OK guia operativa en `docs/guia-demo.md`
- OK video de demo en `docs/video/demo-portales-interno-externo.mp4`
- OK muestra CSV en `docs/video/agora-solicitudes-demo.csv`
- OK muestra Excel en `docs/video/agora-solicitudes-demo.xlsx`
- OK artefactos de demo anonimizados para no exponer datos personales reales

## 6. Limitaciones reconocidas

- El acceso publico sigue dependiendo de una maquina local y de un tunel temporal.
- No existe integracion con SSO institucional.
- El almacenamiento documental sigue siendo local.
- El despliegue permanente en infraestructura dedicada queda fuera del alcance de esta entrega.
