# Agora Frontend

Aplicación React (Vite + TypeScript) para el panel de control de prácticas externas.

## Scripts disponibles

```bash
npm run dev      # Arranca el servidor de desarrollo en http://localhost:5173
npm run build    # Genera la build de producción en la carpeta dist
npm run preview  # Sirve la build generada localmente
```

## Configuración

La aplicación espera que el backend Symfony esté disponible y protegido con autenticación básica.
Configura las variables en `.env.local` (copiando previamente `.env.example`).

```ini
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_API_USERNAME=admin
VITE_API_PASSWORD=admin123
```

## Estructura relevante

- `src/App.tsx` – vista principal del panel y composición de las tablas.
- `src/services/api.ts` – cliente ligero para comunicarse con el backend.
- `src/components/DataTable.tsx` – tabla reutilizable con estilos consistentes.

Tras instalar dependencias (`npm install`), ejecuta `npm run dev` para comenzar a iterar.
