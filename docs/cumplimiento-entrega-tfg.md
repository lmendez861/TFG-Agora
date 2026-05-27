# Cumplimiento de Entrega TFG

## 1. Memoria y anexos

- OK `docs/memoria-final.md` actualizado y sincronizado con el estado real del proyecto.
- OK `docs/memoria-final.docx` generado.
- OK `docs/memoria-final.pdf` generado.
- OK `docs/memoria-final-export.pdf` generado.
- OK anexos A, B y C revisados y alineados con la version final.
- OK capturas principales del sistema regeneradas con la interfaz actual.
- OK esquema relacional, esquema de arquitectura y separacion entre alcance cerrado y mejoras futuras incorporados a la memoria.
- OK bloques de `Definiciones` y `Notaciones y siglas` presentes para alinearse con la plantilla del TFG.

## 2. Arquitectura y modulos requeridos

- OK API Symfony como nucleo de negocio y seguridad.
- OK portal interno independiente en React y TypeScript.
- OK portal externo independiente para empresas.
- OK documentacion separada del flujo operativo.
- OK Agora Desktop como consola tecnica local/cloud, separada del flujo funcional.

## 3. Funcionalidad esencial entregada

- OK gestion de empresas, convenios, estudiantes, tutores y asignaciones.
- OK dashboard con KPI operativos y exportacion CSV.
- OK solicitudes externas con verificacion por correo.
- OK aprobacion y rechazo interno de solicitudes.
- OK bandeja unificada de mensajes empresa-centro.
- OK cuenta persistente de empresa con activacion, login y recuperacion de contrasena.
- OK seguimientos con evidencias y evaluacion final.
- OK control documental con versionado, retirada y restauracion.
- OK operaciones tecnicas sensibles concentradas en Agora Desktop segun el modo activo.

## 4. Validacion tecnica

- OK `php bin/phpunit`
- OK `npm test -- --run` en `frontend/app`
- OK `npm run test:e2e` en `frontend/app`
- OK `npm run build:backend` en `frontend/app`
- OK `npm run build:backend` en `frontend/company-portal`
- OK comprobaciones HTTP de `/app`, `/externo` y `/documentacion`
- OK comprobaciones autenticadas de `/api/bootstrap`, `/api/monitor` y `/api/empresa-solicitudes/bandeja`
- OK comprobaciones autenticadas de carga, vista previa y descarga documental en portal interno y portal externo
- OK ultima pasada cerrada con `110 tests / 628 assertions` en backend, `14/14` tests unitarios de frontend y `6/6` E2E Playwright en cloud

## 5. Material de defensa

- OK guia operativa en `docs/guia-demo.md`
- OK video de demo en `docs/video/demo-portales-interno-externo.mp4`
- OK muestra CSV en `docs/video/agora-solicitudes-demo.csv`
- OK muestra Excel en `docs/video/agora-solicitudes-demo.xlsx`
- OK artefactos de demo anonimizados para no exponer datos personales reales

## 6. Limitaciones reconocidas

- El acceso publico de la entrega se sirve desde una VM publica en Google Cloud con HTTPS.
- No existe integracion con SSO institucional.
- El almacenamiento documental sigue siendo local.
- El despliegue permanente en infraestructura dedicada queda fuera del alcance de esta entrega.
- La consola tecnica principal es Agora Desktop; la antigua pagina web de monitorizacion ya no forma parte del flujo funcional defendido.

## 7. Lectura defendible del alcance

- Lo entregado como nucleo cerrado es: portales `/app` y `/externo`, documentacion publica, correo real, mensajeria, documentos, despliegue cloud por HTTPS y Agora Desktop como consola tecnica.
- Lo que queda como mejora futura no bloqueante es: dominio propio, SSO, servicios gestionados, observabilidad avanzada y ampliacion funcional de Agora Desktop.
