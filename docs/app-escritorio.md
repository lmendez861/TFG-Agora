# Agora Desktop

App de escritorio para Windows basada en Electron. No sustituye al backend Symfony ni a los portales React: actua como consola tecnica para operar Agora en dos modos distintos.

## Modos de trabajo

### 1. Modo local

Pensado para demo offline, desarrollo y soporte en el propio equipo. Permite:

- preparar variables locales, dependencias, migraciones y base SQLite;
- levantar o parar el backend local;
- regenerar las builds integradas en `backend/public/app` y `backend/public/externo`;
- revisar servicios, metricas, actividad e incidencias desde el monitor integrado;
- ejecutar pruebas de escritorio, backend, frontend y E2E;
- abrir logs y carpetas de soporte;
- crear backups SQLite y restaurar una copia seleccionada;
- diagnosticar dependencias locales como PHP, npm, Composer o builds;
- abrir el portal interno, el portal externo y el monitor local;
- usar el acceso publico temporal con Cloudflare Tunnel y MFA tecnico.

### 2. Modo cloud

Pensado para operar la instancia desplegada en Google Cloud. Permite:

- guardar un perfil remoto persistente con URL base, credenciales API y datos SSH;
- validar la conectividad remota contra `https://...`;
- consumir el monitor remoto desde la propia app;
- abrir el portal interno y el portal externo desplegados en la VM;
- consultar logs remotos de app, Symfony y base de datos por SSH;
- reiniciar contenedores remotos de aplicacion y PostgreSQL;
- lanzar el smoke workflow completo contra la instancia publica;
- generar backups PostgreSQL remotos descargandolos al equipo local.

La app de escritorio en modo cloud se plantea como consola de soporte tecnico. La operativa funcional principal de negocio sigue en el portal interno web.

## Monitor integrado

Agora Desktop consume `/api/monitor` y concentra en una sola interfaz:

- salud de API, builds, correo, almacenamiento y servicios;
- metricas de empresas, convenios, estudiantes, asignaciones, solicitudes y auditoria;
- actividad reciente e incidencias detectadas;
- suites de prueba disponibles para backend, frontend y E2E.

La ruta web `/monitor` se mantiene solo como fallback tecnico. El uso diario recomendado pasa por la propia app de escritorio.

## Herramientas operativas

La seccion `Herramientas` expone operaciones distintas segun el modo activo:

- `Desktop check`: valida sintaxis de Electron, preload y renderer.
- `Backend flujo`: ejecuta PHPUnit de los flujos criticos del backend.
- `Frontend unit`: ejecuta los tests unitarios del portal interno.
- `E2E navegador`: ejecuta Playwright contra los recorridos clave.
- `Crear backup`: copia la SQLite local a `backend/var/backups` en modo local.
- `Restaurar`: recupera un backup SQLite local con parada y rearanque controlados.
- `Smoke cloud`: ejecuta el flujo extremo a extremo contra la URL publica.
- `Logs remotos`: abre por SSH los logs principales del despliegue cloud.
- `Restart remoto`: reinicia los contenedores `app` o `db` de la VM.

## Pruebas de flujo

La seccion `Pruebas` valida el recorrido critico real:

1. preregistro de cuenta de empresa;
2. login del portal externo;
3. solicitud corporativa;
4. confirmacion de correo;
5. aprobacion interna y alta de empresa;
6. creacion de convenio, estudiante y asignacion;
7. login de empresa y mensajeria con el centro.

Tambien se puede ejecutar sin ventana:

```bat
cd desktop
npm run smoke:workflow
```

En modo cloud, el smoke se lanza contra la URL publica configurada en el perfil remoto.

## Rutas gestionadas

### Local

- Portal interno local: `http://127.0.0.1:8000/app`
- Monitor local: `http://127.0.0.1:8000/monitor`
- Portal externo local: `http://127.0.0.1:8000/externo`

### Cloud

- Portal interno cloud: `https://agora.34.175.224.87.nip.io/app/`
- Portal externo cloud: `https://agora.34.175.224.87.nip.io/externo/`

## Empaquetado Windows

El proyecto `desktop/package.json` empaqueta Agora Desktop con `electron-builder` e incluye:

- backend Symfony ya integrado en `resources/backend`;
- builds publicadas de `/app` y `/externo`;
- `cloudflared.exe` para el modo local con acceso publico temporal;
- copia portable de PHP en `resources/php`, para no depender de XAMPP o PHP instalado en el equipo destino.

Generacion:

```bat
cd desktop
npm install
npm run package:win
```

Salida esperada en `desktop/dist/`:

- `Agora Desktop Setup <version>.exe`: instalador Windows.
- `win-unpacked/Agora Desktop.exe`: carpeta ejecutable para validacion directa.

Validacion recomendada tras empaquetar:

```bat
cd desktop
npm run validate:packaged
```

Este chequeo arranca el backend empaquetado desde `dist/win-unpacked/resources`, crea SQLite si hace falta y comprueba `/app`, `/externo`, `/api/monitor` y la exportacion CSV sin depender del entorno de desarrollo.
