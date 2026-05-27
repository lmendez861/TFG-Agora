# Anexo C. Capturas y evidencias

## Indice de capturas

1. Figura 1. Arquitectura operativa y de despliegue del sistema.
2. Figura 2. Arquitectura detallada del despliegue cloud y del soporte local.
3. Figura 3. Esquema relacional del flujo empresa-centro y operativa academica.
4. Figura 4. Dashboard del portal interno con KPI y exportacion CSV.
5. Figura 5. Modulo de solicitudes y revision del flujo externo.
6. Figura 6. Bandeja unificada de mensajes con empresas en el portal interno.
7. Figura 7. Portal externo con acceso de empresa y flujo de colaboracion.
8. Figura 8. Guia funcional de la plataforma.
9. Figura 9. Agora Desktop como consola tecnica local y cloud.

## Inventario de archivos incluidos

- `docs/capturas/01-bloques-funcionalidad.png`
- `docs/capturas/10-arquitectura-detallada.png`
- `docs/capturas/02-esquema-relacional.png`
- `docs/capturas/03-panel-interno-dashboard.png`
- `docs/capturas/08-solicitudes-exportar-csv.png`
- `docs/capturas/04-panel-interno-bandeja.png`
- `docs/capturas/05-portal-externo.png`
- `docs/capturas/06-documentacion-guia.png`
- `docs/capturas/07-agora-desktop-operativo.png`

## Evidencias tecnicas asociadas

Las evidencias tecnicas que acompanan a la memoria y a la defensa se apoyan en estas comprobaciones:

- compilacion del portal interno con `npm run build:backend`;
- compilacion del portal externo con `npm run build:backend`;
- validacion de rutas integradas bajo `/app`, `/externo` y `/documentacion`;
- comprobacion funcional de exportacion CSV desde dashboard y modulos principales;
- regeneracion del video de demo y de la muestra CSV/Excel con datos anonimizados para la entrega;
- verificacion del flujo de registro, verificacion, activacion y acceso de empresa;
- comprobacion de carga, vista previa y descarga autenticada de documentos en los dos portales;
- comprobacion del control MFA y del acceso publico temporal desde Agora Desktop;
- revisiones visuales de las capturas utilizadas en PDF y DOCX.

## Criterios de captura final

Para que las capturas sean validas dentro de la memoria y de la presentacion final se sigue este criterio comun:

- mantener una resolucion suficiente para impresion y lectura en pantalla;
- evitar credenciales visibles o datos irrelevantes para la defensa;
- conservar una composicion estable y limpia en todas las vistas;
- mostrar rutas y modulos distintos cuando el objetivo sea justificar separacion funcional;
- revisar siempre que la captura incrustada coincida con la version final de la interfaz.

