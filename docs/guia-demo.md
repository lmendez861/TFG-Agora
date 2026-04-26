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

## Como puede probarlo la profesora

- Si el entorno esta levantado por el alumno, la profesora no necesita instalar nada.
- El alumno comparte la URL temporal que muestre `cloudflared`, con formato `https://...trycloudflare.com`.
- Con esa URL se abren `URL/app`, `URL/externo`, `URL/documentacion` y `URL/monitor`.
- Para el panel interno se usan las credenciales demo indicadas en esta guia.
- La URL solo funciona mientras sigan activos el equipo local, el backend y el tunel publico.
- Si se quiere reproducir todo desde cero en otro ordenador, entonces si hacen falta PHP, Composer, Node.js, npm y los `.env.local`.

## Credenciales internas

- `admin / admin123`
- `coordinador / coordinador123`
- `lectura / lectura123`

## Material de apoyo recomendado

- usar el PDF final de memoria y el DOCX como respaldo documental;
- llevar abierto el video de demo de `docs/video/demo-portales-interno-externo.mp4`;
- usar la exportacion `docs/video/agora-solicitudes-demo.xlsx` como apoyo visual del CSV;
- recordar que los artefactos de demo quedan anonimizados para no exponer datos personales reales.

## Flujo sugerido para demo

### Orden funcional recomendado

1. La empresa se registra desde `http://127.0.0.1:8000/externo`.
2. El correo queda verificado y la solicitud pasa a revision interna.
3. El centro revisa la solicitud desde la campana del portal interno y, si procede, aprueba la empresa.
4. Solo con la empresa activa se formaliza el convenio.
5. Solo con el convenio firmado, vigente o en renovacion se planifica la asignacion.
6. Despues se registran seguimientos, evidencias, mensajeria y evaluacion final.

### Recorrido de exposicion

1. Entrar en `http://127.0.0.1:8000/app/login`.
2. Acceder con `admin / admin123`.
3. Mostrar dashboard y exportacion CSV.
4. Abrir la campana superior para ensenar solicitudes y acceso a mensajes.
5. Abrir `Solicitudes` y ensenar el flujo de aprobacion.
6. Abrir `Bandeja` para ensenar la conversacion unificada.
7. Abrir `Convenios` o `Asignaciones` para mostrar documentos, seguimientos y evaluacion final.
8. Pasar a `http://127.0.0.1:8000/externo`.
9. Ensenar registro, estado, acceso empresa y recuperacion de contrasena.
10. Abrir `http://127.0.0.1:8000/documentacion/flujo`.
11. Si hace falta justificar despliegue, abrir `http://127.0.0.1:8000/monitor`.

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
