# GitHub Codespaces para Agora

Este repositorio ya queda preparado para ejecutar Agora en GitHub Codespaces sin depender de Oracle, Azure ni del equipo local.

## Ruta rapida

1. Sube el proyecto a GitHub.
2. Crea un Codespace desde el repositorio.
3. Espera a que termine el `postCreateCommand`.
4. Ejecuta:

```bash
bash .devcontainer/scripts/start-agora.sh
```

5. Si necesitas reiniciar la demo desde cero:

```bash
bash .devcontainer/scripts/start-agora.sh --reset-demo
```

## Que deja listo

- backend Symfony servido en `8000`
- panel interno en `/app`
- portal externo en `/externo`
- monitor en `/monitor`
- SQLite dentro del Codespace
- usuarios `profesora` y `profesor` con `Abrete01`

## Correo

Por defecto `MAILER_DSN` queda en `null://null`. Eso evita dependencias externas, pero no envia correos reales.

Si quieres probar verificacion, rechazo o MFA por email, configura secrets de Codespaces con:

- `MAILER_DSN`
- `APP_MAIL_FROM`
- `APP_INTERNAL_MFA_EMAIL`

## Documentacion

La guia completa queda en [docs/despliegue-codespaces.md](./docs/despliegue-codespaces.md).
