# Anexo A. Manual de Usuario

## 1. Objetivo
Este anexo describe el uso funcional de la plataforma "Gestion de Empresas Colaboradoras" desde el punto de vista del usuario interno del centro y del contacto externo de empresa.

## 2. Perfiles de uso
- `ROLE_ADMIN`: administracion general del panel y acceso completo a recursos API.
- `ROLE_API`: operativa de gestion sobre empresas, convenios, estudiantes, asignaciones y solicitudes.
- Empresa externa: uso del portal publico para registrar su interes, verificar el correo y comunicarse con el centro.

## 3. Acceso al sistema
### 3.1 Panel interno
- URL: `http://localhost:5173`
- Credenciales demo:
  - `admin / admin123`
  - `coordinador / coordinador123`

### 3.2 Portal externo
- URL: `http://localhost:5174`
- No requiere autenticacion previa para registrar una solicitud.

## 4. Navegacion principal del panel interno
El panel se estructura en los siguientes modulos:
- Dashboard
- Empresas
- Convenios
- Estudiantes
- Asignaciones
- Tutores
- Solicitudes
- Documentacion

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
- exportar el listado visible a CSV.

## 7. Gestion de convenios
En el modulo de convenios el usuario puede:
- listar convenios por empresa o estado;
- crear y editar convenios;
- revisar workflow y checklist documental;
- adjuntar documentos de apoyo;
- revisar alertas activas;
- exportar el listado visible a CSV.

## 8. Gestion de estudiantes
En el modulo de estudiantes el usuario puede:
- listar estudiantes registrados;
- dar de alta y editar fichas;
- revisar estado academico y asignaciones;
- consultar seguimiento resumido;
- exportar el listado visible a CSV.

## 9. Gestion de asignaciones
En el modulo de asignaciones el usuario puede:
- consultar el pipeline completo;
- filtrar por estado y modalidad;
- crear nuevas asignaciones;
- editar asignaciones existentes;
- abrir la ficha de detalle;
- exportar el listado visible a CSV.

## 10. Gestion de tutores
En el modulo de tutores el usuario puede:
- consultar tutores academicos;
- consultar tutores profesionales;
- refrescar datos paginados;
- exportar cada tabla a CSV.

## 11. Solicitudes de empresa
En el modulo de solicitudes el usuario puede:
- revisar nuevas solicitudes enviadas desde el portal;
- aprobar solicitudes verificadas;
- rechazar solicitudes indicando motivo;
- consultar e intercambiar mensajes con la empresa;
- exportar el listado visible a CSV.

## 12. Portal externo
El flujo del portal externo es:
1. La empresa completa el formulario de solicitud.
2. Recibe un enlace de verificacion por correo.
3. Confirma el token desde la vista de verificacion.
4. Usa el canal de mensajes mientras su solicitud esta en revision.

## 13. Errores y validaciones comunes
- Si el backend no responde, el panel mostrara mensajes de error y no cargara las colecciones.
- Si faltan credenciales o son incorrectas, la API devolvera error de autenticacion.
- Si un formulario contiene datos invalidos, el modal mostrara el mensaje correspondiente.

## 14. Recomendaciones de uso
- Refrescar solicitudes antes de aprobar o rechazar.
- Revisar el estado documental de convenios antes de avanzar workflow.
- Exportar CSV como apoyo para revision, seguimiento y defensa del TFG.
