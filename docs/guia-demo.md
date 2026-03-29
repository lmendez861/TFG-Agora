# Guia operativa (TFG Agora)

## Servicios verificados el 29/03/2026

- Backend API Symfony: `http://127.0.0.1:8000`
- Panel interno integrado: `http://127.0.0.1:8000/app`
- Portal externo integrado: `http://127.0.0.1:8000/externo`
- Documentacion publica: `http://127.0.0.1:8000/documentacion`
- Monitor privado: `http://127.0.0.1:8000/monitor`

## Requisitos previos

- PHP 8.2
- Composer 2.x
- Node.js 18+
- npm
- SQLite por defecto
- Symfony CLI opcional

## Puesta en marcha rapida

### 1. Backend

```bash
cd backend
copy .env.local.example .env.local
composer install
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console doctrine:fixtures:load --no-interaction
symfony server:start --no-tls -d --port=8000
```

### 2. Frontend integrado

```bash
cd frontend/app
npm install
npm run build:backend

cd ../company-portal
npm install
npm run build:backend
```

## Accesos finales

- `http://127.0.0.1:8000/app`
- `http://127.0.0.1:8000/externo`
- `http://127.0.0.1:8000/documentacion`
- `http://127.0.0.1:8000/monitor`

## URL publica temporal

- El acceso publico usa `cloudflared` y se comparte para `/app` y `/externo`.
- Se puede activar o detener desde el monitor privado.
- Antes de levantar o bajar el tunel, el monitor exige MFA por correo.
- La guia documental sigue accesible en local aunque el acceso publico este apagado.

## Credenciales internas

- `admin / admin123`
- `coordinador / coordinador123`
- `lectura / lectura123`

## Flujo sugerido para demo

1. Entrar en `http://127.0.0.1:8000/app/login`.
2. Acceder con `admin / admin123`.
3. Mostrar dashboard y exportacion CSV.
4. Abrir `Solicitudes` y ensenar el flujo de aprobacion.
5. Abrir `Bandeja` para ensenar la conversacion unificada.
6. Abrir `Convenios` o `Asignaciones` para mostrar documentos, seguimientos y evaluacion final.
7. Pasar a `http://127.0.0.1:8000/externo`.
8. Ensenar registro, estado, acceso empresa y recuperacion de contrasena.
9. Abrir `http://127.0.0.1:8000/documentacion`.
10. Si hace falta justificar despliegue, abrir `http://127.0.0.1:8000/monitor`.

## Verificaciones tecnicas recomendadas

- `php bin/phpunit`
- `npm test -- --run` en `frontend/app`
- `npm run test:e2e` en `frontend/app`
- `npm run build:backend` en `frontend/app`
- `npm run build:backend` en `frontend/company-portal`

## Contingencias

- Si no da tiempo a toda la demo, priorizar dashboard, bandeja, convenios y portal externo.
- Si falla el acceso publico, seguir la demo completa en local.
- Si el correo MFA tarda en llegar, solicitar uno nuevo y usar solo el ultimo codigo recibido.
- Si un flujo puntual falla, apoyar la explicacion con la memoria final, el manual tecnico y las pruebas ejecutadas.
