# Gestion de Empresas Colaboradoras

Proyecto de Trabajo Final de Grado orientado a la gestion de empresas colaboradoras, convenios, estudiantes, tutores y solicitudes externas en un contexto de FP Dual.

## Arquitectura
- `backend/`: API Symfony 7.3, Doctrine ORM y SQLite por defecto.
- `frontend/app/`: panel interno React 18 + TypeScript + Vite.
- `frontend/company-portal/`: portal externo React 19 + TypeScript + Vite.
- `docs/`: memoria, anexos, guion de defensa y material de apoyo.
- `legacy/`: codigo archivado del proyecto Agora original.

## Instalacion local
El repositorio no es ejecutable de forma inmediata tras clonar. Hay que instalar dependencias y preparar variables de entorno.

### 1. Backend
```bash
cd backend
copy .env.local.example .env.local
composer install
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console doctrine:fixtures:load --no-interaction
start-server.bat
```

### 2. Panel interno
```bash
cd frontend/app
copy .env.example .env.local
npm install
npm run dev
```

### 3. Portal externo
```bash
cd frontend/company-portal
copy .env.example .env.local
npm install
npm run dev
```

## Accesos de desarrollo
- Panel interno: `http://127.0.0.1:5173`
- Portal externo: `http://127.0.0.1:5174`
- API: `http://127.0.0.1:8000/api`

## Modo URL unica
Si quieres servir todo desde una sola URL y un solo puerto del backend:

```bash
build-single-url.bat
cd backend
start-server.bat
```

Con eso quedan disponibles:
- Panel interno: `http://127.0.0.1:8000/app`
- Portal externo: `http://127.0.0.1:8000/externo`
- API: `http://127.0.0.1:8000/api`

Este modo evita depender de `5173` y `5174` para la demo o para exponer el proyecto hacia fuera.
Si no defines `VITE_API_BASE_URL`, ambas builds usan automaticamente la misma URL publica desde la que se abren. Solo en desarrollo con Vite se sigue resolviendo la API en `:8000`.

## URL publica temporal
Si quieres compartirlo por internet sin comprar dominio ni abrir mas puertos, puedes usar Cloudflare Quick Tunnel:

```bash
start-demo-public.bat
```

Ese script:
- genera la build unificada;
- lanza el backend en `0.0.0.0:8000`;
- abre un tunel temporal y muestra una URL `https://...trycloudflare.com`.

En la primera ejecucion, `start-public-url.bat` descarga automaticamente `cloudflared`.

Con la URL que aparezca, abre:
- `URL/app`
- `URL/externo`

Tambien puedes abrir solo el tunel si el backend ya esta arrancado:

```bash
start-public-url.bat
```

## Variables de entorno relevantes
### Backend
- `DATABASE_URL`
- `MAILER_DSN`
- `APP_MAIL_FROM`
- `DEFAULT_URI`
- `CORS_ALLOW_ORIGIN`

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

## Nota sobre React
Actualmente conviven dos versiones de React porque son dos aplicaciones independientes:
- el panel interno se mantiene en React 18;
- el portal externo se levanto despues con React 19.

No comparten bundle ni runtime, por lo que la diferencia no genera conflicto funcional.
