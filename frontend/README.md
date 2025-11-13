# Frontend

El directorio `frontend/app` contiene una aplicación React + Vite (TypeScript) que actúa como panel
de control para la plataforma Agora. La aplicación consume la API REST del backend Symfony y
presenta listados y métricas de empresas, convenios, estudiantes y asignaciones.

## Puesta en marcha

```bash
cd frontend/app
cp .env.example .env.local   # ajusta credenciales de la API si es necesario
npm install                   # requiere Node.js 18+
npm run dev                   # inicia Vite en http://localhost:5173
```

> **Nota:** en el entorno actual no hay Node.js instalado; ejecuta `npm install` y los scripts
> anteriores una vez que dispongas de Node/npm en tu máquina local o contenedor.

## Funcionalidades actuales

- Resumen de métricas clave (empresas registradas, convenios vigentes, horas planificadas, etc.).
- Listados dinámicos conectados a la API protegida por autenticación básica.
- Reintento manual de sincronización con botón de recarga y visualización de la URL base consumida.

## Próximos pasos sugeridos

1. Añadir formularios para crear/editar registros desde la interfaz.
2. Incorporar autenticación integrada (token/JWT) en lugar de Basic Auth.
3. Añadir filtrado avanzado y paginación para cada listado.
