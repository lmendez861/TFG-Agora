# Checklist de entrega final

## 1. Memoria

- OK `docs/memoria-final.md` revisada.
- OK `docs/memoria-final.docx` generado con imagenes incrustadas.
- OK `docs/memoria-final.pdf` y `docs/memoria-final-export.pdf` generados.
- OK capturas principales actualizadas en `docs/capturas/`.
- OK explicacion de acceso para evaluacion externa incluida.

## 2. Anexos y defensa

- OK `docs/anexo-a-manual-usuario.md` revisado.
- OK `docs/anexo-b-manual-tecnico.md` revisado.
- OK `docs/anexo-c-capturas-y-evidencias.md` alineado con capturas finales.
- OK presentacion final en `docs/presentacion-defensa-final.pptx` y PDF.
- OK guion de apoyo en `docs/guion-presentacion-final.md`.

## 3. Validacion funcional

- OK backend integrado levantado en `http://127.0.0.1:8000`.
- OK portal interno disponible en `/app`.
- OK portal externo disponible en `/externo`.
- OK documentacion disponible en `/documentacion`.
- OK monitor privado disponible en `/monitor`.
- OK `php vendor/bin/phpunit`.
- OK `npm run build` en `frontend/app`.
- OK `npm run build` en `frontend/company-portal`.
- OK `npm test -- --run` en `frontend/app`.
- OK `npm run test:e2e` en `frontend/app`.

## 4. Preparacion de demo

- Compartir URL temporal de `cloudflared` solo si el backend y el tunel estan activos.
- Entrar a `/app`, `/externo`, `/documentacion` y `/monitor` desde la misma URL base.
- Tener a mano credenciales demo del panel interno.
- Mostrar que el portal funcional se actualiza automaticamente; la sincronizacion manual queda solo en el monitor.
