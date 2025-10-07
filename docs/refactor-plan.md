# Plan de Refactorización: Proyecto "Gestión de Empresas Colaboradoras"

## 1. Objetivo
Reestructurar el proyecto actual (Ágora) para orientarlo a la nueva temática del TFG:
**Aplicación web para la gestión de empresas colaboradoras con un centro educativo**.

Mantendremos solo lo que aporte valor al nuevo dominio y moveremos el resto a un área de legado (_legacy_) antes de proceder a eliminaciones definitivas.

---

## 2. Activos que se pueden reutilizar
### Backend (Symfony)
- **Infraestructura base de Symfony** (`composer.json`, `config/`, `bin/`, `public/`, `var/`, `vendor/`): sigue siendo válida.
- **Seguridad base**: configuración `security.yaml` lista para reintroducir autenticación con usuarios propios en una iteración posterior.
- **Integración con Doctrine**: migraciones, configuración, herramientas ORM.
- **Scripts de arranque** (`start-server.bat`) y archivos `.env` para entornos locales.

### Frontend (HTML/CSS/JS)
- **Estructura base de autenticación** (`iniciosesion.html`, `registro.html`, `js/api.js` para login mock/real) ya archivada para futuras referencias.
- **Componentes de estilos comunes** (`css/bulma-agora-theme.css`, `style.css`, assets reutilizables).
- **Recursos compartidos**: logos, tipografías, layouts básicos (navbar, cards).

### Documentación
- Nueva plantilla `docs/TFG_MEMORIA_PLANTILLA.md`.
- Información de investigación UI/UX que pueda servir para inspirar la nueva interfaz (si procede).

---

## 3. Elementos que deben archivarse en `legacy/`
### Backend
- Controladores y servicios específicos de bots, chats y LocalAI (`AIBotController.php`, `LocalAIService.php`, `BotManager`, etc.).
- Entidades Doctrine relacionadas con la antigua lógica (`BotEntity`, `Mensaje`, `Servidor`, `Canal`, `Conversacion`, `Membresia`, `ArchivoCompartido`, etc.).
- Scripts de instalación de LocalAI (`install-agora-ai.bat`, configuraciones en `localai-models/`).

### Frontend
- Páginas y assets relacionados con chats, bots y la demo de plataforma (`agora-platform-demo.html`, `demo-chat-bots.html`, `Chats.html`, `test-bots.html`, `js/agora-ai.js`, `js/chat-bots.js`, etc.).
- Carpetas de mock de chats (`Pagina web/chats/`, `servers/`).

### Documentación
- Documentos anteriores del proyecto Ágora (`AGORA_AI_GUIDE.md`, `AGORA_PLANIFICACION_COMPLETA.md`, etc.), salvo que contengan partes aprovechables.

---

## 4. Nueva estructura propuesta
```
TFG - Agora/
├── backend/          # Proyecto Symfony limpio y renombrado
├── frontend/         # Nuevo frontend enfocado en gestión de empresas
├── docs/
│   ├── TFG_MEMORIA_PLANTILLA.md
│   ├── refactor-plan.md
│   └── requisitos/   # Nuevos requisitos, casos de uso, etc.
├── legacy/
│   ├── backend-old/
│   └── frontend-old/
└── README.md         # Actualizar con la nueva temática
```

> Nota: el proyecto Symfony actual (`Backend-Symfony/`) se podrá mover a `legacy/backend-old/` una vez hayamos creado un nuevo esqueleto limpio o renombrado el actual.

---

## 5. Pasos siguientes
1. ✅ **Mover código legado** a `legacy/backend-old/` y `legacy/frontend-old/`, manteniendo la estructura por si necesitamos recuperar fragmentos.
2. ✅ **Limpiar el repositorio raíz** dejándolo con `backend/`, `frontend/` y `docs/`.
3. ✅ **Actualizar `README.md`** con la nueva descripción del proyecto.
4. ✅ **Redefinir entidades y casos de uso** para la gestión de empresas colaboradoras (📄 ver `docs/domain-model.md`).
5. ⏳ **Configurar el backend Symfony** con nuevas entidades, controladores y repositorios.
   - ✅ Entidades Doctrine del nuevo dominio creadas.
   - ⏳ Controladores REST/CRUD y formularios pendientes.
6. ⏳ **Diseñar el nuevo frontend** (wireframes, mockups) y comenzar a crear las vistas principales (dashboard, listado de empresas, fichas, convenios, etc.).
7. ⏳ **Actualizar la documentación del TFG** con los avances (secciones 5–9 del esquema oficial).

---

## 6. Estado del plan
- ✅ Documento base creado.
- ✅ Carpeta `legacy/` actualizada con backend, frontend y documentación anterior.
- ✅ Nuevas carpetas `backend/` y `frontend/` creadas para el proyecto actualizado.
- ✅ Modelo de dominio preliminar documentado (`docs/domain-model.md`).
- ✅ Backend Symfony reiniciado con entidades y repositorios del nuevo dominio.
- ⏳ Pendiente implementar controladores, casos de uso y vistas actualizadas.

Una vez apruebes este plan, comenzaremos con los pasos 1 y 2, documentando cada movimiento para mantener la trazabilidad.
