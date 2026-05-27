# Guia personal de repaso para la defensa

Este documento no forma parte de la memoria formal. Lo uso como chuleta de repaso para tener claro que hace cada bloque, por que he elegido cada tecnologia y como puedo reaccionar si algo falla durante la exposicion.

## 1. Como explico el proyecto en treinta segundos

Mi TFG resuelve un problema real del centro: la gestion de empresas colaboradoras, convenios y practicas estaba dispersa entre correos, hojas de calculo y documentos sueltos. La solucion final es una plataforma con dos portales, una API central, documentacion publica y una app de escritorio tecnica para operar el entorno en local o en cloud.

## 2. Cual es la idea de arquitectura que tengo que defender

No he construido una sola aplicacion mezclando todo. He separado responsabilidades:

1. un backend Symfony que concentra negocio, seguridad, correo y persistencia;
2. un portal interno para coordinacion academica;
3. un portal externo para empresas;
4. una guia publica bajo `/documentacion`;
5. Agora Desktop como consola tecnica separada del flujo funcional.

La idea clave que tengo que repetir es esta: **un solo nucleo de negocio, varias interfaces segun el actor que entra al sistema**.

## 3. Tecnologias y por que las use

### Backend

- **PHP 8.2**: porque era una base realista para una solucion web mantenible y compatible con Symfony.
- **Symfony 7**: porque me da seguridad, routing, sesiones, validacion, mailer y estructura clara de API.
- **Doctrine ORM**: porque el proyecto vive de relaciones entre entidades y me interesaba un modelo consistente con migraciones y repositorios.

### Persistencia

- **SQLite** en local: porque me permite demo y contingencia sin depender de un servidor externo.
- **PostgreSQL 16** en cloud: porque para un despliegue publico es una base de datos mas seria, robusta y apropiada.

### Frontend

- **React + TypeScript + Vite**: porque necesitaba dos SPA separadas, con formularios, tablas, estados y bastante interaccion. TypeScript me ayuda a evitar errores de contrato entre frontend y backend.

### Cloud y despliegue

- **Docker Compose**: para publicar app, base de datos y proxy de forma reproducible.
- **Caddy**: para HTTPS automatico, redireccion y cabeceras seguras sin meter un proxy mas pesado de la cuenta.
- **Google Cloud Compute Engine**: porque necesitaba una VM real accesible desde fuera para que la profesora pudiera probar el sistema.
- **nip.io**: como solucion rapida para tener un hostname publico sin comprar dominio solo para la defensa.

### Correo

- **Brevo**: para verificacion de empresa, rechazo, recuperacion de contrasena y avisos transaccionales.

### Escritorio tecnico

- **Electron**: porque queria una consola tecnica unica para entorno local y cloud, con logs, pruebas, servicio remoto y contingencia si la VM falla.

### Pruebas

- **PHPUnit** para backend.
- **Vitest** para pruebas unitarias del frontend.
- **Playwright** para flujos E2E.
- **Smoke tests** para el flujo completo y para Agora Desktop.

## 4. Que hace realmente el backend

El backend es el nucleo del sistema. Lo que tengo que saber explicar es:

- autentica usuarios internos y cuentas de empresa;
- aplica permisos y separa el firewall interno del externo;
- expone la API REST del portal interno;
- mantiene el flujo empresa -> solicitud -> revision -> aprobacion/rechazo;
- crea la empresa colaboradora cuando la solicitud se aprueba;
- crea o asocia el tutor profesional propuesto;
- guarda mensajes empresa-centro;
- controla documentos, versiones, retirada y restauracion;
- gestiona asignaciones, seguimientos y evaluacion final;
- genera correo de verificacion, recuperacion y rechazo;
- sirve los frontends integrados bajo `/app`, `/externo` y `/documentacion`.

## 5. Flujos funcionales que tengo que tener claros

### Flujo externo

1. La empresa crea cuenta.
2. Inicia sesion.
3. Completa su solicitud corporativa.
4. Verifica el correo.
5. Consulta el estado.
6. Mantiene mensajes con el centro.
7. Si se aprueba, usa la misma cuenta para ver convenios, asignaciones y documentos.

### Flujo interno

1. Entro con perfil de coordinacion.
2. Veo dashboard y KPI.
3. Reviso solicitudes.
4. Apruebo o rechazo.
5. Gestiono empresa, convenio, tutor y asignacion.
6. Registro seguimientos y evaluacion final.
7. Exporto CSV si necesito evidencia.

### Flujo tecnico

1. Si la VM funciona, uso el cloud como modo principal.
2. Si algo falla, abro Agora Desktop.
3. Veo URL efectiva, estado de `agora.service`, logs y smoke.
4. Si la VM no responde o la URL cambia, lo detecto ahi.
5. Si el cloud cae del todo, puedo levantar el modo local como contingencia de demo.

## 6. Comandos que debo recordar

### Local desde repositorio

```bash
cd backend
composer install
php bin/console doctrine:migrations:migrate --no-interaction
symfony server:start --no-tls -d --port=8000
```

```bash
cd frontend/app
npm install
npm run build:backend
```

```bash
cd frontend/company-portal
npm install
npm run build:backend
```

### Pruebas

```bash
cd backend
php vendor/bin/phpunit
```

```bash
cd frontend/app
npm test -- --run
npm run test:e2e
```

```bash
cd desktop
npm run smoke:workflow
```

### Cloud

La VM arranca sola por `agora.service`. Si hay que revisarla:

```bash
sudo systemctl status agora.service
sudo systemctl restart agora.service
sudo journalctl -u agora.service -n 100 --no-pager
```

## 7. Accesos que debo tener a mano

- URL base: `https://agora.34.175.225.98.nip.io/`
- Portal interno: `/app/`
- Portal externo: `/externo/`
- Documentacion: `/documentacion`

Credenciales:

- `profesora / Abrete01`
- `profesor / Abrete01`
- `admin / admin123`
- `coordinador / coordinador123`

## 8. Que esta cerrado y que no

### Cerrado

- portal interno funcional;
- portal externo funcional;
- correo de verificacion y rechazo;
- mensajeria empresa-centro;
- documentos autenticados;
- despliegue cloud por HTTPS;
- Agora Desktop como consola tecnica principal;
- modo local de contingencia.

### Futuro

- dominio propio;
- SSO institucional;
- almacenamiento documental gestionado;
- observabilidad avanzada;
- ampliar Agora Desktop con mas operativa de negocio si compensa.

## 9. Si me preguntan por que no he hecho mas

La respuesta correcta es que he preferido cerrar bien el nucleo del producto antes que dejar muchas funciones a medias. Lo importante del TFG no es abarcarlo todo, sino demostrar analisis, arquitectura, implementacion, validacion y criterio para recortar alcance sin romper coherencia.

## 10. Si algo falla durante la defensa

Mi orden mental es este:

1. no improvisar;
2. abrir Agora Desktop;
3. comprobar URL efectiva y estado del servicio;
4. si el cloud sigue mal, pasar al entorno local de respaldo;
5. apoyar la explicacion con memoria, capturas, video y validaciones ya ejecutadas.
