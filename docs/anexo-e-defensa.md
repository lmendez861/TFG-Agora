# Anexo E. Defensa del Proyecto

## 1. Objetivo del anexo
Este anexo recoge material de apoyo para la exposicion oral del Trabajo Final de Grado. El enfoque no es solo explicar el proyecto, sino justificar el trabajo realizado, las decisiones tomadas y el recorte de alcance aplicado al cierre.

## 2. Mensaje principal de la defensa
La idea central de la presentacion es que el proyecto resuelve un problema real del centro mediante una solucion operativa y, al mismo tiempo, demuestra capacidad para analizar necesidades, acotar alcance, implementar una arquitectura completa, desplegarla en cloud y documentarla con criterio.

## 3. Guion breve de exposicion

### 3.1 Apertura
El proyecto surge para resolver una gestion dispersa basada en hojas de calculo, correos y documentos aislados. La propuesta consiste en una plataforma unica que centraliza empresas colaboradoras, convenios y practicas formativas.

### 3.2 Problema
La gestion previa generaba duplicidades, poca trazabilidad, dependencia del conocimiento manual y escasa visibilidad del estado real de convenios, solicitudes y asignaciones.

### 3.3 Solucion
La solucion se ha dividido en varias piezas coordinadas:

1. API REST en Symfony.
2. Panel interno en React y TypeScript.
3. Portal externo para empresas.
4. Despliegue cloud en Google Cloud con Docker Compose, PostgreSQL y HTTPS.
5. App de escritorio para operacion tecnica local o remota.

### 3.4 Aportacion personal

- Identificacion del problema y redefinicion del alcance.
- Modelado de datos y arquitectura separada por responsabilidades.
- Implementacion completa de backend y dos frontends.
- Puesta en produccion academica en cloud con correo real y HTTPS.
- Validacion tecnica y redaccion de memoria, anexos y material de defensa.

### 3.5 Cierre
La conclusion defendible es que el TFG no intenta abarcarlo todo, sino cerrar bien el nucleo funcional y tecnico: flujo empresa-centro, gestion interna, despliegue accesible desde fuera y operacion controlada.

## 4. Preguntas previsibles y linea de respuesta

### 4.1 Por que elegiste este tema?
Porque resolvia una necesidad concreta y permitia desarrollar una solucion util, no solo un ejercicio tecnico.

### 4.2 Que has hecho tu directamente?
Analisis, arquitectura, implementacion, despliegue cloud, validacion y documentacion principal del proyecto.

### 4.3 Que ha sido lo mas complicado?
Mantener el equilibrio entre alcance realista, coherencia tecnica y tiempo disponible. El cierre del proyecto ha exigido priorizar las funcionalidades nucleares y dejar como mejoras futuras las ampliaciones secundarias.

### 4.4 Que mejorarias con una iteracion adicional?
Consolidar Agora Desktop como consola tecnica, decidir si debe incorporar mas operativa funcional de negocio, integrar SSO institucional, mover documentos y backups a servicios gestionados y reforzar observabilidad y rendimiento.

### 4.5 Que gestor de correos usa el proyecto?
Brevo. Se usa para verificacion de solicitudes, recuperacion de contrasena, MFA tecnico local y avisos de rechazo.

### 4.6 Como llega un rechazo a la empresa?
Llega por correo y, ademas, el estado queda visible en el portal externo autenticado para que la empresa no dependa de una llamada manual del centro. Si el centro quiere ampliar el contexto, puede hacerlo por mensajeria dentro de la propia solicitud.

### 4.7 Como esta desplegado fuera del entorno local?
En una VM Linux de Google Cloud Compute Engine con Docker Compose, PostgreSQL y proxy HTTPS. La URL de demo accesible desde fuera es `https://agora.34.175.225.98.nip.io/`.

### 4.8 Que usuarios de prueba quedan preparados para acceso externo?
Se dejan `profesora / Abrete01` y `profesor / Abrete01`, ambos con permisos de coordinacion para revisar el portal interno desde la URL publica.

## 5. Orden recomendado para la demo

1. Dashboard y KPI.
2. Empresas y ficha 360.
3. Convenios con workflow y restricciones.
4. Asignaciones y relaciones con estudiantes y tutores.
5. Solicitudes de empresa.
6. Bandeja y chat con refresco automatico.
7. Portal externo.
8. Agora Desktop en modo cloud si queda tiempo.

## 6. Tecnologias por bloque funcional

- **API y reglas de negocio**: Symfony 7, PHP 8.2, Doctrine ORM.
- **Persistencia**: PostgreSQL 16 en cloud y SQLite para respaldo local o pruebas aisladas.
- **Portal interno**: React, TypeScript y Vite.
- **Portal externo**: React, TypeScript y Vite con flujo propio de autenticacion.
- **Documentacion publica**: frontend integrado servido bajo `/documentacion`.
- **Correo transaccional**: Brevo para verificacion, recuperacion, rechazo y MFA del modo local.
- **Escritorio tecnico**: Electron para Agora Desktop, con integracion API + SSH.
- **Despliegue cloud**: Docker Compose, Caddy como proxy HTTPS y Google Cloud Compute Engine.
- **Pruebas**: PHPUnit, Vitest, Playwright y smoke tests del escritorio.

## 7. Alcance cerrado frente a mejoras futuras

### 7.1 Que esta ya cerrado

- Portales funcionales `/app` y `/externo`.
- Documentacion publica integrada bajo `/documentacion`.
- Flujo empresa-centro completo con correo, verificacion, aprobacion, mensajeria y documentos.
- Despliegue cloud por HTTPS con arranque automatico.
- Agora Desktop como consola tecnica principal para local y cloud.

### 7.2 Que queda como mejora futura

- Dominio institucional propio.
- SSO y endurecimiento adicional de secretos.
- Observabilidad y servicios gestionados.
- Posible ampliacion funcional de Agora Desktop si en una iteracion posterior compensa absorber parte del trabajo operativo.

## 8. Mensaje de cierre recomendado
El valor del TFG esta en haber convertido una necesidad real en una solucion completa, trazable y defendible, sin esconder el recorte de alcance: lo importante ha sido cerrar bien el nucleo del producto y dejar identificadas con claridad las mejoras futuras.

