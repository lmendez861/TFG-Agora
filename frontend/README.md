# Frontend

El directorio `frontend/` contiene dos SPA React independientes:

- `frontend/app`: panel interno de gestion
- `frontend/company-portal`: portal externo para empresas

## Instalacion local

### Panel interno
```bash
cd frontend/app
copy .env.example .env.local
npm install
npm run dev -- --host --port 5173 --strictPort
```

### Portal externo
```bash
cd frontend/company-portal
copy .env.example .env.local
npm install
npm run dev -- --host --port 5174 --strictPort
```

## Modo URL unica

```bash
build-single-url.bat
cd backend
start-server.bat
```

Accesos:
- `http://127.0.0.1:8000/app`
- `http://127.0.0.1:8000/externo`

En este modo, si no defines `VITE_API_BASE_URL`, ambas SPA usan automaticamente el mismo origen publico y consumen la API en `/api`.

## Variables de entorno

### Panel interno
- `VITE_API_BASE_URL`
- `VITE_API_USERNAME`
- `VITE_API_PASSWORD`
- `VITE_DEV_HOST`
- `VITE_DEV_HTTPS`
- `VITE_DEV_HTTPS_KEY`
- `VITE_DEV_HTTPS_CERT`

### Portal externo
- `VITE_API_BASE_URL`
- `VITE_DEV_HOST`
- `VITE_DEV_HTTPS`
- `VITE_DEV_HTTPS_KEY`
- `VITE_DEV_HTTPS_CERT`

## Versiones de React

- `frontend/app` usa React 18.3.1
- `frontend/company-portal` usa React 19.2.0

La diferencia no genera conflicto porque ambas aplicaciones compilan y despliegan por separado.
