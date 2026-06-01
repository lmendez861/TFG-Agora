# Anexo A. Manual de Usuario

## 1. Objetivo

Este anexo describe el uso funcional de la plataforma "Gestion de Empresas Colaboradoras" desde el punto de vista del usuario interno del centro y del contacto externo de empresa.

## 2. Perfiles de uso

- `ROLE_ADMIN`: administracion general, auditoria, operacion tecnica y control completo del panel.
- `ROLE_COORDINATOR`: gestion de empresas, convenios, estudiantes, asignaciones, seguimientos y solicitudes.
- `ROLE_DOCUMENT_MANAGER`: control documental, versionado y restauracion de evidencias.
- `ROLE_MONITOR`: supervision tecnica, logs y acceso publico temporal desde Agora Desktop.
- `ROLE_AUDITOR`: consulta de trazas y actividad sensible.
- Empresa externa: uso del portal publico para crear cuenta, registrar su interes, verificar el correo y comunicarse con el centro.

## 3. Acceso al sistema

### 3.0 Acceso externo para evaluacion

Durante la evaluacion, si el alumno mantiene activa la VM publica, la profesora no necesita descargar ni instalar dependencias del proyecto. Se le facilita la URL cloud efectiva que muestre Agora Desktop y, sobre esa misma direccion, abrir:

- `/app` para el panel interno;
- `/externo` para el portal de empresa;
- `/documentacion` para la guia funcional;
- Agora Desktop como consola tecnica local o cloud.

Este acceso remoto depende de que la VM publica y el stack Docker sigan levantados. La instalacion local solo seria necesaria si se quiere reproducir el proyecto desde cero a partir del repositorio.

### 3.1 Panel interno integrado

- URL cloud principal: URL cloud efectiva + `/app/`
- URL local de respaldo: `http://127.0.0.1:8000/app`
- Credenciales demo:
  - `profesora / Abrete01`
  - `profesor / Abrete01`
  - `admin / admin123`
  - `coordinador / coordinador123`

### 3.2 Documentacion publica

- URL cloud principal: URL cloud efectiva + `/documentacion`
- URL local de respaldo: `http://127.0.0.1:8000/documentacion`
- No requiere autenticacion.

### 3.3 Supervision tecnica con Agora Desktop

- App Windows para revisar estado, pruebas, logs, reinicios y backups.
- En modo local controla el backend y el acceso publico temporal con MFA.
- En modo cloud consume la telemetria remota y ejecuta operaciones tecnicas sobre la VM.

### 3.4 Portal externo

- URL cloud principal: URL cloud efectiva + `/externo/`
- URL local de respaldo: `http://127.0.0.1:8000/externo`
- La cuenta inicial de empresa se crea desde el portal publico.
- La solicitud corporativa se completa despues, ya dentro del panel privado de empresa.

### 3.5 Agora Desktop

- App Windows para levantar el entorno local sin abrir consola manualmente.
- Permite arrancar backend, abrir portales, ejecutar pruebas, revisar logs, crear backups SQLite y restaurarlos.
- Tambien funciona en modo cloud para consumir estado remoto, lanzar smoke y operar la VM por API y SSH.

## 4. Navegacion principal del panel interno

El panel se estructura en los siguientes modulos:

- Dashboard
- Empresas
- Convenios
- Estudiantes
- Asignaciones
- Tutores
- Solicitudes
- Bandeja
- Perfil

## 5. Dashboard

Desde el dashboard se puede:

- consultar KPI principales del sistema;
- revisar tarjetas resumen por modulo;
- abrir accesos rapidos a las areas operativas;
- exportar un CSV de resumen con indicadores y analitica.

La sincronizacion del panel interno se realiza de forma automatica en segundo plano. En la version final no se muestra la URL tecnica de la API ni un boton de sincronizacion en el dashboard o en la barra superior; el control manual queda reservado a Agora Desktop, donde se usa como herramienta de supervision durante la demo tecnica.

## 6. Gestion de empresas

En el modulo de empresas el usuario puede:

- ver el listado general;
- crear una nueva empresa;
- editar una empresa existente;
- consultar la ficha 360;
- revisar convenios asociados;
- revisar asignaciones vinculadas;
- consultar notas, etiquetas y documentos;
- subir documentos PDF, Word o Excel;
- retirar o restaurar versiones documentales;
- exportar el listado visible a CSV.

## 7. Gestion de convenios

En el modulo de convenios el usuario puede:

- listar convenios por empresa o estado;
- crear y editar convenios;
- revisar workflow y checklist documental;
- adjuntar documentos de apoyo;
- revisar alertas activas;
- controlar tipos y estados con seleccion guiada;
- exportar el listado visible a CSV.

## 8. Gestion de estudiantes

En el modulo de estudiantes el usuario puede:

- listar estudiantes registrados;
- dar de alta y editar fichas;
- revisar estado academico y asignaciones;
- consultar seguimiento resumido;
- exportar el listado visible a CSV.

## 9. Gestion de asignaciones, seguimientos y evaluacion final

En el modulo de asignaciones el usuario puede:

- consultar el pipeline completo;
- filtrar por estado y modalidad;
- crear nuevas asignaciones;
- editar asignaciones existentes;
- abrir la ficha de detalle;
- registrar seguimientos;
- adjuntar evidencias;
- cerrar o reabrir seguimientos;
- registrar y cerrar la evaluacion final;
- exportar el listado visible a CSV.

## 10. Gestion de tutores

En el modulo de tutores el usuario puede:

- consultar tutores academicos;
- consultar tutores profesionales;
- refrescar datos paginados;
- exportar cada tabla a CSV.

## 11. Solicitudes y bandeja de mensajes

En `Solicitudes` el usuario puede:

- revisar nuevas solicitudes enviadas desde el portal externo;
- aprobar solicitudes verificadas;
- rechazar solicitudes indicando motivo;
- abrir la bandeja asociada a la empresa;
- exportar el listado visible a CSV.

En `Bandeja` el usuario puede:

- consultar todas las conversaciones empresa-centro en una unica vista;
- ver el ultimo mensaje y la actividad reciente de cada hilo;
- responder desde el panel interno;
- abrir la solicitud relacionada cuando sea necesario.

## 12. Agora Desktop

Desde la app de escritorio el usuario tecnico puede:

- preparar el entorno local;
- levantar o detener backend y acceso externo temporal;
- abrir portal interno y portal externo;
- ejecutar pruebas de escritorio, backend, frontend, E2E y smoke cloud;
- abrir logs y diagnosticos locales o remotos;
- crear y restaurar backups SQLite;
- reiniciar contenedores remotos y descargar backups PostgreSQL;
- lanzar una prueba completa de flujo entre portales.

## 13. Portal externo

El flujo del portal externo es:

1. La empresa crea su cuenta con correo y contrasena.
2. Inicia sesion en el panel privado de empresa.
3. Completa el formulario de solicitud con los datos corporativos.
4. Recibe un enlace de verificacion por correo.
5. Consulta el estado de la solicitud y mantiene el canal de mensajes.
6. El centro aprueba o rechaza la empresa desde el panel interno.
7. Si se aprueba, la misma cuenta sirve para revisar informacion, documentos, convenios, asignaciones y mensajes.

## 14. Errores y validaciones comunes

- Si el backend no responde, el panel mostrara mensajes de error y no cargara las colecciones.
- Si faltan credenciales o son incorrectas, la API devolvera error de autenticacion.
- Si un formulario contiene datos invalidos, el modal mostrara el mensaje correspondiente.
- Si se solicita un nuevo codigo MFA, el anterior deja de ser valido automaticamente.
- Si el correo saliente no esta bien configurado, Agora Desktop y la API tecnica lo reflejaran como aviso.

## 15. Recomendaciones de uso

- Refrescar solicitudes y bandeja antes de aprobar o rechazar.
- Revisar el estado documental del convenio antes de avanzar workflow.
- Utilizar la bandeja unificada para no perder contexto de conversaciones.
- Exportar CSV como apoyo para revision, seguimiento y defensa del TFG.

