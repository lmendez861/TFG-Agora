# Modelo de Dominio – Gestión de Empresas Colaboradoras

Este documento sintetiza el modelo de datos y los casos de uso fundamentales para la nueva aplicación web.

## 1. Actores principales
- **Coordinador/a de prácticas**: Responsable del centro educativo que gestiona las relaciones con las empresas.
- **Tutor académico**: Profesor asignado a cada estudiante para el seguimiento académico.
- **Tutor profesional**: Persona de la empresa que supervisa al estudiante durante la colaboración.
- **Estudiante**: Alumno/a que realiza prácticas o colaboraciones.
- **Empresa colaboradora**: Organización que firma convenios con el centro educativo.

## 2. Entidades y atributos
### 2.1 EmpresaColaboradora
- `id`
- `nombre`
- `sector`
- `direccion`
- `ciudad`
- `provincia`
- `pais`
- `telefono`
- `email`
- `web`
- `estado_colaboracion` *(activa, pendiente, finalizada, inactiva)*
- `fecha_alta`
- `observaciones`

### 2.2 ContactoEmpresa
- `id`
- `empresa_id`
- `nombre`
- `cargo`
- `telefono`
- `email`
- `es_tutor_profesional` *(booleano)*

### 2.3 Convenio
- `id`
- `empresa_id`
- `titulo`
- `descripcion`
- `fecha_inicio`
- `fecha_fin`
- `tipo` *(prácticas curriculares, extracurriculares, proyecto fin de grado, otro)*
- `estado` *(vigente, expirado, cancelado)*
- `documento_url`
- `observaciones`

### 2.4 TutorAcademico
- `id`
- `nombre`
- `apellido`
- `email`
- `telefono`
- `departamento`
- `especialidad`
- `activo`

### 2.5 TutorProfesional
> Puede representarse reutilizando `ContactoEmpresa` con la marca `es_tutor_profesional = true`, o bien como entidad independiente relacionada con `EmpresaColaboradora`.

Campos adicionales si se modela como entidad propia:
- `id`
- `empresa_id`
- `nombre`
- `email`
- `telefono`
- `cargo`
- `certificaciones`
- `activo`

### 2.6 Estudiante
- `id`
- `nombre`
- `apellido`
- `dni`
- `email`
- `telefono`
- `grado`
- `curso`
- `expediente`
- `estado` *(disponible, asignado, finalizado)*

### 2.7 AsignacionPractica
- `id`
- `estudiante_id`
- `convenio_id`
- `empresa_id`
- `tutor_academico_id`
- `tutor_profesional_id`
- `fecha_inicio`
- `fecha_fin`
- `modalidad` *(presencial, híbrida, remota)*
- `horas_totales`
- `estado` *(en curso, finalizada, cancelada)*

### 2.8 Seguimiento
- `id`
- `asignacion_id`
- `fecha`
- `tipo` *(reunión, informe, incidencia, evaluación)*
- `descripcion`
- `accion_requerida`
- `documento_url`

### 2.9 EvaluacionFinal
- `id`
- `asignacion_id`
- `fecha`
- `valoracion_empresa` *(numérica o texto)*
- `valoracion_estudiante`
- `valoracion_tutor_academico`
- `conclusiones`

## 3. Relaciones principales
- Una **Empresa** puede tener múltiples **Contactos** y múltiples **Convenios**.
- Un **Convenio** pertenece a una empresa y puede generar varias **Asignaciones** para diferentes estudiantes.
- Cada **Asignación** une a una empresa, un convenio, un estudiante y dos tutores (académico y profesional).
- De cada **Asignación** se derivan múltiples registros de **Seguimiento** y una **Evaluación final**.

## 4. Casos de uso clave
1. **Registrar empresa colaboradora**: alta, edición, asignación de contactos y estado.
2. **Gestionar convenios**: creación, renovación, subida de documentación, estados.
3. **Gestionar tutores**: alta de tutores académicos y profesionales, asignación a empresas y estudiantes.
4. **Asignar estudiantes a convenios**: búsqueda de estudiante disponible, selección de empresa y tutores.
5. **Registrar seguimiento**: eventos, incidencias, reuniones, reportes.
6. **Generar evaluación final**: consolidar la valoración de todos los implicados.
7. **Consultas e informes**: listados de empresas activas, convenios vigentes, estudiantes en prácticas, incidencias abiertas.

## 5. Requisitos no funcionales
- Seguridad basada en roles (coordinador, tutor académico, tutor profesional).
- Trazabilidad de acciones (historial de cambios en asignaciones y convenios).
- Exportación de datos a formatos (PDF/Excel) para informes.
- Interfaz responsive accesible desde dispositivos móviles.

## 6. Pendientes
- Validar el modelo con los responsables (Elena Ruíz y José Miguel Vaquero).
- Decidir si `TutorProfesional` será entidad propia o atributo de `ContactoEmpresa`.
- Definir flujo de autorizaciones (quién puede aprobar convenios, modificar asignaciones, etc.).
- Establecer política de almacenamiento de documentos (local, S3, etc.).
