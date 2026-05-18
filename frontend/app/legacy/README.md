# Legacy frontend code

Este directorio conserva codigo retirado del flujo funcional actual.

Contenido:

- `MonitorPage.tsx`: shell web antigua de supervision tecnica.

Estado:

- ya no se compila dentro del bundle principal;
- ya no existe una ruta funcional publicada para ese monitor;
- la supervision tecnica vigente se realiza desde `Agora Desktop`, que consume `/api/monitor` y operaciones SSH segun el modo activo.
