# Agora Frontend

Aplicación Vite + React + TypeScript para visualizar y gestionar los datos del backend Symfony.

## Scripts disponibles

```bash
npm run dev      # Arranca el servidor de desarrollo en http://localhost:5173
npm run build    # Genera la build de producción en la carpeta dist
npm run preview  # Sirve la build generada localmente
```

## Puesta en marcha

1. Ejecuta `npm install` dentro de `frontend/app`.
2. Copia `.env.example` a `.env.local` y ajusta las credenciales para la API expuesta desde Symfony:
   ```ini
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   VITE_API_USERNAME=admin
   VITE_API_PASSWORD=admin123
   ```
3. Levanta el panel con `npm run dev` y visita `http://localhost:5173/`.

Siempre que el backend responda y las credenciales sean correctas, el botón **Actualizar datos** refresca las cuatro colecciones sin recargar la página.

## Formularios y flujo actual

- **Empresas**: botón “Nueva empresa” y acciones de edición en la tabla. El formulario cubre datos de contacto, estado y observaciones.
- **Convenios**: permite seleccionar la empresa, definir fechas, tipo y estado. El modal reutiliza la lista de empresas existente para mantener coherencia.
- **Estudiantes**: alta/edición con validaciones básicas (duplicados gestionados desde el backend) y resumen de asignaciones.
- **Asignaciones**: crea o modifica la relación estudiante-empresa, filtrando convenios y tutores según la empresa seleccionada. El formulario carga tutores académicos y profesionales mediante los nuevos endpoints de referencia.

Todos los formularios comparten el mismo patrón de modal, muestran errores específicos en el cuerpo del formulario y generan toasts de éxito o error para reforzar el feedback al usuario. Tras guardar, se recarga el conjunto de colecciones para mantener las tablas sincronizadas.

## Componentes y servicios clave

- `src/App.tsx`: vista principal, estado compartido y orquestación de los modales.
- `src/components/DataTable.tsx`: tabla estilizada con cabeceras, acciones y estado vacío.
- `src/components/Modal.tsx` y `src/components/EstudianteForm.tsx`: base para formularios modales reutilizables.
- `src/services/api.ts`: cliente ligero con helpers `apiGet`, `apiPost` y `apiPut` que añaden la cabecera `Authorization` automáticamente.

Con estos pasos cualquier colaborador puede clonar el repositorio, configurar las variables de entorno y trabajar con el panel en cuestión de minutos.
