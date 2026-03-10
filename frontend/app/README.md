# Agora Frontend

Aplicacion React + TypeScript + Vite para el panel interno de gestion.

## Scripts disponibles

```bash
npm run dev
npm run build
npm run build:backend
npm run preview
```

## Puesta en marcha

1. Ejecuta `npm install` dentro de `frontend/app`.
2. Copia `.env.example` a `.env.local` y ajusta:
   ```ini
   # Opcional. En produccion usa el mismo origen publico.
   # En desarrollo con Vite apunta automaticamente a :8000.
   # VITE_API_BASE_URL=http://127.0.0.1:8000/api
   VITE_API_USERNAME=admin
   VITE_API_PASSWORD=admin123
   VITE_DEV_HOST=0.0.0.0

   VITE_DEV_HTTPS=false
   # VITE_DEV_HTTPS_KEY=certs/localhost-key.pem
   # VITE_DEV_HTTPS_CERT=certs/localhost.pem
   ```
3. Lanza `npm run dev -- --host --port 5173 --strictPort`.

## Build integrada en el backend

```bash
npm run build:backend
```

Genera la SPA en `backend/public/app` con base `/app/`, lista para servirse desde Symfony en una URL unica junto con el portal externo.

## Funcionalidades principales

- Dashboard con KPI y resumen operativo
- Gestion de empresas, convenios, estudiantes y asignaciones
- Modulo de solicitudes de empresa
- Exportacion CSV de dashboard y listados principales
- Subida de documentos reutilizando las credenciales definidas en `.env.local`

## Archivos clave

- `src/App.tsx`
- `src/services/api.ts`
- `src/components/DataTable.tsx`
- `src/utils/csv.ts`
