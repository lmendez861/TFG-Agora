# Guia operativa (TFG Agora)

## Servicios verificados el 18/05/2026

- Backend API Symfony en VM publica de Google Cloud.
- Panel interno integrado: `http://agora.34.175.224.87.nip.io/app/`
- Portal externo integrado: `http://agora.34.175.224.87.nip.io/externo/`
- Documentacion publica: `http://agora.34.175.224.87.nip.io/documentacion/`
- Monitor privado: `http://agora.34.175.224.87.nip.io/monitor/`

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

## URL publica de demo

- El acceso principal ya no depende de tunel temporal ni del portatil local.
- La demo se comparte desde la VM publica de Google Cloud.
- Para evitar comprar dominio solo para la defensa se usa un hostname wildcard gratuito de `nip.io`.
- La URL operativa actual es `http://agora.34.175.224.87.nip.io/`.

## Como puede probarlo la profesora

- La profesora no necesita instalar nada.
- El alumno comparte `http://agora.34.175.224.87.nip.io/`.
- Con esa URL se abren `URL/app/`, `URL/externo/`, `URL/documentacion/` y `URL/monitor/`.
- Para el panel interno se recomienda usar `profesora / Abrete01` o `profesor / Abrete01` como acceso de prueba.
- La URL funciona mientras siga activa la VM publica.
- Si se quiere reproducir todo desde cero en otro ordenador, entonces si hacen falta PHP, Composer, Node.js, npm y los `.env.local`.
- Los enlaces de verificacion y activacion deben generarse con esa URL publica, no con `127.0.0.1`.

## Credenciales internas

- `admin / admin123`
- `coordinador / coordinador123`
- `lectura / lectura123`
- `profesora / Abrete01`
- `profesor / Abrete01`

## Material de apoyo recomendado

- usar el PDF final de memoria y el DOCX como respaldo documental;
- llevar abierto el video de demo de `docs/video/demo-portales-interno-externo.mp4`;
- usar la exportacion `docs/video/agora-solicitudes-demo.xlsx` como apoyo visual del CSV;
- recordar que los artefactos de demo quedan anonimizados para no exponer datos personales reales.

## Flujo sugerido para demo

### Orden funcional recomendado

1. La empresa se registra desde `http://agora.34.175.224.87.nip.io/externo/`.
2. El correo queda verificado y la solicitud pasa a revision interna.
3. El centro revisa la solicitud desde la campana del portal interno y, si procede, aprueba la empresa.
4. Solo con la empresa activa se formaliza el convenio.
5. Solo con el convenio firmado, vigente o en renovacion se planifica la asignacion.
6. Despues se registran seguimientos, evidencias, mensajeria y evaluacion final.
7. Si la solicitud se rechaza, la empresa recibe correo y tambien ve el estado actualizado en el portal externo.

### Recorrido de exposicion

1. Entrar en `http://agora.34.175.224.87.nip.io/app/login`.
2. Acceder con `profesora / Abrete01` o `profesor / Abrete01`.
3. Mostrar dashboard y exportacion CSV.
4. Abrir la campana superior para ensenar solicitudes y acceso a mensajes.
5. Abrir `Solicitudes` y ensenar el flujo de aprobacion.
6. Abrir `Bandeja` para ensenar la conversacion unificada y comentar que el refresco es automatico.
7. Abrir `Convenios` o `Asignaciones` para mostrar documentos, seguimientos y evaluacion final.
8. Pasar a `http://agora.34.175.224.87.nip.io/externo/`.
9. Ensenar registro, estado, acceso empresa y recuperacion de contrasena.
10. Abrir `http://agora.34.175.224.87.nip.io/documentacion/flujo`.
11. Si hace falta justificar despliegue, abrir `http://agora.34.175.224.87.nip.io/monitor/` y explicar que la VM corre Symfony, React y PostgreSQL con Docker Compose.

## Verificaciones tecnicas recomendadas

- `php bin/phpunit`
- `npm test -- --run` en `frontend/app`
- `npm run test:e2e` en `frontend/app`
- `npm run build:backend` en `frontend/app`
- `npm run build:backend` en `frontend/company-portal`

## Contingencias

- Si no da tiempo a toda la demo, priorizar dashboard, bandeja, convenios y portal externo.
- Si falla el acceso publico, seguir la demo completa en local o reiniciar el stack Docker de la VM.
- Si el correo MFA tarda en llegar, solicitar uno nuevo y usar solo el ultimo codigo recibido.
- Si un flujo puntual falla, apoyar la explicacion con la memoria final, el manual tecnico y las pruebas ejecutadas.
