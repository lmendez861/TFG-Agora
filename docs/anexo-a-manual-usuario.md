# Anexo A. Manual de Usuario

## 1. Objetivo

Este anexo describe el uso funcional de la plataforma "Gestion de Empresas Colaboradoras" desde el punto de vista del usuario interno del centro y del contacto externo de empresa.

## 2. Perfiles de uso

- `ROLE_ADMIN`: administracion general, monitor privado, auditoria y control completo del panel.
- `ROLE_COORDINATOR`: gestion de empresas, convenios, estudiantes, asignaciones, seguimientos y solicitudes.
- `ROLE_DOCUMENT_MANAGER`: control documental, versionado y restauracion de evidencias.
- `ROLE_MONITOR`: supervision tecnica, logs y acceso publico temporal.
- `ROLE_AUDITOR`: consulta de trazas y actividad sensible.
- Empresa externa: uso del portal publico para registrar su interes, verificar el correo, activar cuenta y comunicarse con el centro.

## 3. Acceso al sistema

### 3.1 Panel interno integrado

- URL: `http://127.0.0.1:8000/app`
- Credenciales demo:
  - `admin / admin123`
  - `coordinador / coordinador123`

### 3.2 Documentacion publica

- URL: `http://127.0.0.1:8000/documentacion`
- No requiere autenticacion.

### 3.3 Monitor privado

- URL: `http://127.0.0.1:8000/monitor`
- Requiere credenciales internas y MFA para operaciones sensibles.

### 3.4 Portal externo

- URL: `http://127.0.0.1:8000/externo`
- El registro inicial es publico.
- El acceso persistente de empresa se habilita tras aprobacion interna.

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

## 12. Monitor privado

Desde el monitor privado el usuario puede:

- revisar servicios y metricas de entorno;
- consultar logs, incidencias y documentos previsualizables;
- revisar el estado del correo saliente;
- solicitar y validar un codigo MFA;
- levantar o detener el acceso publico temporal;
- copiar la URL externa cuando el tunel este activo.

## 13. Portal externo

El flujo del portal externo es:

1. La empresa completa el formulario de solicitud.
2. Recibe un enlace de verificacion por correo.
3. Consulta el estado de la solicitud.
4. El centro aprueba la empresa desde el panel interno.
5. La empresa recibe un correo de activacion de cuenta.
6. Activa la cuenta, inicia sesion y puede recuperar su contrasena si lo necesita.
7. Accede a su panel para revisar informacion, documentos y mensajes.

## 14. Errores y validaciones comunes

- Si el backend no responde, el panel mostrara mensajes de error y no cargara las colecciones.
- Si faltan credenciales o son incorrectas, la API devolvera error de autenticacion.
- Si un formulario contiene datos invalidos, el modal mostrara el mensaje correspondiente.
- Si se solicita un nuevo codigo MFA, el anterior deja de ser valido automaticamente.
- Si el correo saliente no esta bien configurado, el monitor lo reflejara como aviso.

## 15. Recomendaciones de uso

- Refrescar solicitudes y bandeja antes de aprobar o rechazar.
- Revisar el estado documental del convenio antes de avanzar workflow.
- Utilizar la bandeja unificada para no perder contexto de conversaciones.
- Exportar CSV como apoyo para revision, seguimiento y defensa del TFG.
