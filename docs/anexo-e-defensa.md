# Anexo E. Defensa del Proyecto

## 1. Objetivo del anexo
Este anexo recoge el material de apoyo para la exposicion oral del Trabajo Final de Grado. Su funcion es resumir de forma clara el problema abordado, la solucion implementada, los resultados validados y las limitaciones asumidas dentro del alcance academico del proyecto.

## 2. Mensaje principal de la defensa
La idea central de la presentacion es que el proyecto ya resuelve el ciclo operativo principal de gestion de empresas colaboradoras para FP Dual:
- alta de empresas desde portal externo;
- verificacion mediante token;
- aprobacion interna;
- gestion de empresas, convenios, estudiantes y asignaciones;
- seguimiento documental y exportacion operativa.

## 3. Guion breve de exposicion
### 3.1 Apertura
El proyecto surge para resolver una gestion dispersa basada en hojas de calculo, correos y documentos aislados. La propuesta consiste en una plataforma unica que centraliza empresas colaboradoras, convenios y practicas formativas.

### 3.2 Problema
La gestion previa generaba duplicidades, poca trazabilidad, dependencia del conocimiento manual y escasa visibilidad del estado real de convenios, solicitudes y asignaciones.

### 3.3 Solucion
La solucion se ha dividido en tres piezas:
1. API REST en Symfony.
2. Panel interno en React y TypeScript.
3. Portal externo para empresas.

### 3.4 Valor funcional
Las funcionalidades con mas peso en la demo son:
- solicitud externa de empresa;
- verificacion por token;
- aprobacion desde panel interno;
- workflow de convenios con checklist y alertas;
- gestion de entidades principales y exportacion CSV.

### 3.5 Cierre
La conclusion defendible es que el proyecto ya entrega una solucion operativa y escalable para el centro, aunque deja identificadas mejoras futuras claras y razonables.

## 4. Preguntas previsibles y linea de respuesta
### 4.1 Por que esta arquitectura?
Porque separa responsabilidades entre API, panel interno y portal externo, lo que facilita mantenimiento, seguridad y evolucion futura.

### 4.2 Cual es la aportacion real del proyecto?
Digitalizar un proceso real del centro y convertirlo en una plataforma trazable con mejor control documental y operativo.

### 4.3 Que queda como trabajo futuro?
CRUD de seguimientos y evaluacion final, gestion completa de tutores, archivado de entidades, portal postaprobacion para empresas, pruebas E2E y seguridad productiva reforzada.

### 4.4 Por que es valido como entrega final aunque queden mejoras?
Porque el objetivo principal esta cumplido, el flujo clave funciona extremo a extremo y las mejoras pendientes no bloquean la demostracion ni invalidan la solucion entregada.

## 5. Orden recomendado para la demo
1. Dashboard y KPI.
2. Empresas y ficha 360.
3. Convenios con workflow, checklist y alertas.
4. Asignaciones y relaciones con estudiantes y tutores.
5. Solicitudes de empresa.
6. Portal externo.

## 6. Mensaje de cierre recomendado
El TFG no se limita a un prototipo visual, sino que entrega una base funcional completa con modelo de datos, API, panel, portal y documentacion. El valor principal es la centralizacion de la gestion y la trazabilidad del ciclo completo entre centro y empresa.
