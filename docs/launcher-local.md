# Launcher local de Agora

Este launcher es una capa de arranque para Windows. No modifica el codigo de Symfony ni de los frontends: usa la build integrada servida por `backend/public`.

## Uso normal

Desde la raiz del proyecto:

```bat
launch-agora.bat
```

Hace lo siguiente:

- copia los `.env.local` desde los ejemplos si faltan;
- instala dependencias solo si faltan `vendor` o `node_modules`;
- comprueba migraciones y crea la base SQLite inicial si no existe;
- genera la build integrada si falta `backend/public/app` o `backend/public/externo`;
- levanta el backend local en `http://127.0.0.1:8000`;
- abre el portal interno en `http://127.0.0.1:8000/app`.

## URL externa temporal

Para abrir tambien un tunel publico temporal con Cloudflare:

```bat
launch-agora-public.bat
```

El launcher mostrara y abrira:

- portal externo publico: `https://...trycloudflare.com/externo`;
- portal interno publico: `https://...trycloudflare.com/app`.

Para una demo, comparte solo la URL terminada en `/externo` con empresas externas.

## Opciones utiles

```bat
launch-agora.bat -Build
launch-agora.bat -NoOpen
launch-agora.bat -Port 8080
```

- `-Build`: fuerza regenerar las dos builds integradas.
- `-NoOpen`: levanta servicios sin abrir el navegador.
- `-Port`: cambia el puerto local del backend.

## Detener

```bat
stop-agora.bat
```

Detiene los procesos iniciados por el launcher. Para limpiar tambien procesos de desarrollo del proyecto:

```bat
stop-agora.bat -AllProjectServices
```
