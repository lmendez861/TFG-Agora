# Anexo C. Capturas y evidencias

## Indice de capturas

1. Figura 1. Esquema de bloques de funcionalidad del sistema.
2. Figura 2. Esquema relacional de la base de datos.
3. Figura 3. Dashboard del portal interno con KPI y exportacion CSV.
4. Figura 4. Modulo de solicitudes de empresa en el portal interno.
5. Figura 5. Portal externo para alta y seguimiento de empresas.
6. Figura 6. Guia funcional de la plataforma.
7. Figura 7. Monitor operativo privado para supervision tecnica.

## Inventario de archivos incluidos

- `docs/capturas/01-bloques-funcionalidad.png`
- `docs/capturas/02-esquema-relacional.png`
- `docs/capturas/03-panel-interno-dashboard.png`
- `docs/capturas/04-panel-interno-solicitudes.png`
- `docs/capturas/05-portal-externo.png`
- `docs/capturas/06-documentacion-guia.png`
- `docs/capturas/07-monitor-operativo.png`

## Evidencias tecnicas asociadas

Las evidencias tecnicas que acompanan a la memoria y a la defensa se apoyan en estas comprobaciones:

- compilacion del portal interno con `npm run build` y `npm run build:backend`;
- compilacion del portal externo con `npm run build` y `npm run build:backend`;
- validacion de rutas integradas bajo `/app`, `/externo`, `/documentacion` y `/monitor`;
- comprobacion funcional de exportacion CSV desde dashboard y modulos principales;
- revisiones visuales de las capturas utilizadas en PDF y DOCX.

## Criterios de captura final

Para que las capturas sean validas dentro de la memoria y de la presentacion final se sigue este criterio comun:

- mantener una resolucion suficiente para impresion y lectura en pantalla;
- evitar credenciales visibles o datos irrelevantes para la defensa;
- conservar una composicion estable y limpia en todas las vistas;
- mostrar rutas y modulos distintos cuando el objetivo sea justificar separacion funcional;
- revisar siempre que la captura incrustada coincida con la version final de la interfaz.
