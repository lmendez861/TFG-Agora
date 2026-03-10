# Company Portal

Aplicacion React + TypeScript + Vite para el portal externo de empresas.

## Puesta en marcha

```bash
cd frontend/company-portal
copy .env.example .env.local
npm install
npm run dev -- --host --port 5174 --strictPort
```

## Variables de entorno

```ini
# Opcional. En produccion usa el mismo origen publico.
# En desarrollo con Vite apunta automaticamente a :8000.
# VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_DEV_HOST=0.0.0.0

VITE_DEV_HTTPS=false
# VITE_DEV_HTTPS_KEY=certs/localhost-key.pem
# VITE_DEV_HTTPS_CERT=certs/localhost.pem
```

`VITE_API_BASE_URL` debe apuntar al backend sin `/api`, porque el portal consume tanto `/registro-empresa` como `/portal/solicitudes/...`.

## Build integrada en el backend

```bash
npm run build:backend
```

Genera la SPA en `backend/public/externo` con base `/externo/`, lista para servirse desde Symfony en una URL unica junto con el panel interno.

## Flujo funcional

1. La empresa envia una solicitud publica.
2. El backend manda un correo de verificacion.
3. La empresa confirma el token.
4. El centro revisa la solicitud desde el panel interno.
5. Mientras la solicitud esta activa, existe un canal de mensajes empresa-centro.

## Nota tecnica

Este frontend usa React 19. Se mantiene separado del panel interno, que sigue en React 18, sin impacto funcional porque cada SPA tiene su propio bundle.
