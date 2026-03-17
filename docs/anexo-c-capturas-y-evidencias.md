# Anexo C. Capturas y Evidencias

## 1. Capturas obligatorias recomendadas
Tomar una captura final de cada una de estas vistas:
1. Dashboard principal con KPI y analitica.
2. Modulo de empresas con listado y ficha 360 abierta.
3. Modulo de convenios con workflow, checklist y alertas.
4. Modulo de estudiantes con ficha academica y asignaciones.
5. Modulo de asignaciones con pipeline y detalle.
6. Modulo de tutores con ambas tablas visibles.
7. Modulo de solicitudes con mensajes y acciones de aprobacion/rechazo.
8. Portal externo con formulario de alta.
9. Portal externo con pantalla de verificacion de token.
10. Portal externo con canal de mensajes.
11. Guia de documentacion con recorrido funcional.
12. Centro privado de control o monitor operativo, solo como apoyo tecnico.

## 2. Evidencias tecnicas a incluir en anexos
- salida de `php bin/phpunit`;
- salida de `npm run build` en `frontend/app`;
- salida de `npm run build` en `frontend/company-portal`;
- comprobacion de `GET /api/empresas` con respuesta `200 OK`;
- comprobacion visual de exportacion CSV.

## 3. Nombre recomendado para las capturas
- `01-dashboard.png`
- `02-empresas.png`
- `03-convenios.png`
- `04-estudiantes.png`
- `05-asignaciones.png`
- `06-tutores.png`
- `07-solicitudes.png`
- `08-portal-alta.png`
- `09-portal-verificacion.png`
- `10-portal-chat.png`
- `11-documentacion-guia.png`
- `12-control-monitor.png`

## 4. Ubicacion sugerida
Guardar las capturas finales en:
- `docs/capturas/`

## 5. Indice actual y objetivo de capturas
- `01-bloques-funcionalidad.png`: vista general de bloques funcionales.
- `02-esquema-relacional.png`: esquema relacional de entidades y tablas.
- `03-panel-interno-dashboard.png`: dashboard del panel interno.
- `04-panel-interno-solicitudes.png`: modulo de solicitudes del panel interno.
- `05-portal-externo.png`: portada operativa del portal externo.
- `06-documentacion-guia.png`: guia funcional de la plataforma. Pendiente de refresco visual final.
- `07-centro-control.png`: panel privado para acceso publico y soporte de demo. Pendiente de refresco visual final.
- `08-monitor-operativo.png`: supervision operativa, tests y logs. Pendiente de refresco visual final.
- `03-panel-interno-dashboard.html`: copia HTML de apoyo para la captura 03.
- `04-panel-interno-solicitudes.html`: copia HTML de apoyo para la captura 04.

## 6. Comprobacion antes de incrustar en la memoria
- verificar que la fecha y hora del sistema no distraigan;
- ocultar credenciales o datos irrelevantes;
- mantener una resolucion suficiente para impresion;
- usar siempre el mismo zoom y ancho de ventana;
- capturar tambien una exportacion CSV descargada como prueba funcional.
- comprobar que la guia publica y el centro privado son paginas distintas antes de capturar.
