# Guion de Defensa del TFG

## Objetivo
Este guion esta pensado para una exposicion breve de 5 a 7 minutos centrada en problema, solucion, demo y cierre.

## 1. Apertura
Buenos dias. Mi Trabajo Final de Grado consiste en el desarrollo de una plataforma para gestionar empresas colaboradoras, convenios y practicas de FP Dual. El objetivo ha sido sustituir una gestion dispersa basada en hojas de calculo, correos y documentos aislados por una herramienta unica, trazable y utilizable por el centro.

## 2. Problema detectado
La situacion inicial presentaba tres problemas principales:
- informacion repartida en varias fuentes;
- falta de control sobre estados, convenios y seguimiento;
- dependencia del conocimiento manual de quien coordinaba las practicas.

Esto generaba duplicidades, retrasos y poca visibilidad del ciclo completo entre centro, empresa y estudiante.

## 3. Objetivo y alcance
El objetivo general ha sido crear una aplicacion web que centralice la gestion de empresas colaboradoras y practicas formativas. Dentro del alcance se incluyen empresas, convenios, estudiantes, asignaciones, tutores y solicitudes externas. Quedan fuera de esta version aspectos como firma electronica avanzada, SSO corporativo o una suite E2E completa.

## 4. Solucion implementada
La solucion se ha dividido en tres partes:
- una API REST en Symfony;
- un panel interno en React y TypeScript para la gestion diaria;
- un portal externo para que las empresas puedan registrarse, verificar su solicitud y comunicarse con el centro.

Esta separacion permite mantener responsabilidades claras y hace el sistema mas escalable.

## 5. Funcionalidades clave
Las funcionalidades mas relevantes son:
- gestion CRUD de empresas, convenios, estudiantes y asignaciones;
- workflow documental de convenios con checklist y alertas;
- solicitudes externas con verificacion por token y aprobacion interna;
- mensajeria asociada a la solicitud;
- exportacion CSV de dashboard y listados operativos.

## 6. Demo sugerida
Durante la demostracion voy a seguir este recorrido:
1. Dashboard con KPI y exportacion CSV.
2. Modulo de empresas con ficha 360.
3. Modulo de convenios con workflow, checklist y alertas.
4. Modulo de asignaciones y relaciones con estudiantes y tutores.
5. Modulo de solicitudes.
6. Portal externo con alta, verificacion y chat.

## 7. Resultados tecnicos
La aplicacion se ha validado con:
- 47 pruebas backend y 264 aserciones en verde;
- compilacion correcta de ambos frontends;
- servicios locales funcionales para backend, panel interno y portal externo.

Ademas, el proyecto queda documentado con memoria, anexos tecnicos, manual de usuario y guia de demo.

## 8. Limitaciones y mejora futura
Las principales limitaciones actuales son:
- autenticacion mejorable para un entorno productivo;
- falta de exportacion PDF maquetada;
- almacenamiento documental local;
- ausencia de pruebas E2E completas.

Como trabajo futuro, el siguiente paso seria endurecer seguridad, automatizar pruebas y completar la operacion documental.

## 9. Cierre
En conclusion, el proyecto cumple el objetivo de digitalizar y centralizar la gestion de empresas colaboradoras y practicas. Aporta trazabilidad, mejora operativa y una base tecnica escalable para evolucionar el sistema en futuras iteraciones.
