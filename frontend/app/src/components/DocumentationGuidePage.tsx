import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

type DocumentationAsset = {
  title: string;
  detail: string;
  path: string;
};

type RouteCard = {
  title: string;
  path: string;
  detail: string;
};

type ArchitectureLayer = {
  title: string;
  detail: string;
};

const documentationAssets: DocumentationAsset[] = [
  {
    title: 'Memoria final',
    detail: 'Documento principal con contexto, arquitectura, validacion y conclusiones del proyecto.',
    path: 'docs/memoria-final.md',
  },
  {
    title: 'Entregables academicos',
    detail: 'Versiones finales listas para revision en PDF y DOCX.',
    path: 'docs/memoria-final.pdf / docs/memoria-final.docx',
  },
  {
    title: 'Guia funcional',
    detail: 'Secuencia recomendada de navegacion, modulos y validaciones para la revision final.',
    path: 'docs/guia-demo.md',
  },
  {
    title: 'Anexo de capturas',
    detail: 'Indice de imagenes, evidencias tecnicas y soporte visual de la entrega.',
    path: 'docs/anexo-c-capturas-y-evidencias.md',
  },
];

const routeCards: RouteCard[] = [
  {
    title: 'Portal interno',
    path: '/app',
    detail: 'Gestion operativa de empresas, convenios, estudiantes, asignaciones, tutores y solicitudes.',
  },
  {
    title: 'Portal externo',
    path: '/externo',
    detail: 'Registro de empresas, verificacion por correo, seguimiento y mensajeria asociada.',
  },
  {
    title: 'Documentacion',
    path: '/documentacion',
    detail: 'Centro documental del proyecto, memoria, anexos, rutas y entregables.',
  },
  {
    title: 'Monitor privado',
    path: '/monitor',
    detail: 'Supervision de servicios, acceso publico, errores, validacion tecnica y enlaces operativos.',
  },
];

const architectureLayers: ArchitectureLayer[] = [
  {
    title: 'Backend Symfony',
    detail: 'Concentra autenticacion, API REST, exportacion CSV, monitorizacion y logica de negocio.',
  },
  {
    title: 'Portal interno',
    detail: 'SPA operativa para coordinacion academica con dashboard, CRUD y supervision funcional.',
  },
  {
    title: 'Portal externo',
    detail: 'Canal especifico para empresas interesadas en colaborar con el centro educativo.',
  },
  {
    title: 'Capa documental',
    detail: 'Memoria, anexos, guia funcional y material de apoyo preparados para entrega y revision.',
  },
];

const deliverables = [
  'Memoria final en Markdown como fuente editable.',
  'Memoria final en DOCX con indice navegable.',
  'Memoria final en PDF con portada e indice de imagenes.',
  'Anexos tecnicos y capturas actualizadas para la entrega.',
  'Repositorio GitHub con codigo, scripts y evidencia trazable.',
];

const repositoryUrl = 'https://github.com/lmendez861/TFG-Agora';

function currentOrigin(): string {
  return typeof window === 'undefined' ? 'http://127.0.0.1:8000' : window.location.origin;
}

function navClassName({ isActive }: { isActive: boolean }): string {
  return `guide-nav__link${isActive ? ' is-active' : ''}`;
}

function OverviewSection() {
  const origin = currentOrigin();

  return (
    <>
      <section className="guide-overview-grid">
        {routeCards.map((card) => (
          <article key={card.path} className="guide-kpi-card">
            <span>{card.title}</span>
            <strong>{card.path}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <section className="guide-section-grid">
        <article className="guide-card guide-card--wide">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Lectura funcional</p>
              <h3>Mapa del proyecto</h3>
            </div>
            <span className="guide-badge">4 espacios</span>
          </header>
          <div className="guide-file-list">
            {routeCards.map((card) => (
              <div key={card.path} className="guide-file-list__item">
                <strong>{card.title}</strong>
                <span>{card.detail}</span>
                <code>{origin}{card.path}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="guide-card">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Repositorio</p>
              <h3>Fuente oficial</h3>
            </div>
          </header>
            <p className="guide-card__copy">
              El repositorio concentra codigo, memoria, anexos, scripts de generacion y trazabilidad completa de la
              entrega final.
          </p>
          <a href={repositoryUrl} target="_blank" rel="noreferrer" className="guide-inline-link">
            {repositoryUrl}
          </a>
        </article>
      </section>
    </>
  );
}

function ArchitectureSection() {
  return (
    <section className="guide-modules">
      {architectureLayers.map((layer) => (
        <article key={layer.title} className="guide-module-card">
          <p className="guide-module-card__label">Componente</p>
          <h3>{layer.title}</h3>
          <p>{layer.detail}</p>
        </article>
      ))}
    </section>
  );
}

function MemorySection() {
  return (
    <section className="guide-section-grid">
      <article className="guide-card guide-card--wide">
        <header className="guide-card__header">
          <div>
            <p className="guide-card__eyebrow">Material academico</p>
            <h3>Documentos de la entrega</h3>
          </div>
          <span className="guide-badge">{documentationAssets.length} activos</span>
        </header>
        <div className="guide-file-list">
          {documentationAssets.map((asset) => (
            <div key={asset.title} className="guide-file-list__item">
              <strong>{asset.title}</strong>
              <span>{asset.detail}</span>
              <code>{asset.path}</code>
            </div>
          ))}
        </div>
      </article>

      <article className="guide-card">
        <header className="guide-card__header">
          <div>
            <p className="guide-card__eyebrow">Estructura</p>
            <h3>Formato preparado para entrega</h3>
          </div>
        </header>
        <ul className="guide-list">
          <li>Portada independiente.</li>
          <li>Indice general y de imagenes en bloque propio.</li>
          <li>Cuerpo principal separado de anexos.</li>
          <li>Versiones DOCX y PDF sincronizadas con la fuente Markdown.</li>
        </ul>
      </article>
    </section>
  );
}

function DeliverySection() {
  return (
    <section className="guide-section-grid">
      <article className="guide-card">
        <header className="guide-card__header">
          <div>
            <p className="guide-card__eyebrow">Entrega</p>
            <h3>Control documental</h3>
          </div>
        </header>
        <ul className="guide-list">
          {deliverables.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className="guide-card">
        <header className="guide-card__header">
          <div>
            <p className="guide-card__eyebrow">Criterio de revision</p>
            <h3>Que debe quedar coherente</h3>
          </div>
        </header>
        <ul className="guide-list">
          <li>Rutas y nombres alineados con la aplicacion integrada.</li>
          <li>Capturas consistentes con las vistas reales de la version actual.</li>
          <li>Indice navegable en DOCX y PDF.</li>
          <li>Sin secciones de trabajo interno dentro de la memoria final.</li>
        </ul>
      </article>
    </section>
  );
}

export function DocumentationGuidePage() {
  const origin = currentOrigin();

  return (
    <section className="guide-page">
      <header className="guide-hero guide-hero--documentation">
        <div className="guide-hero__copy">
          <p className="guide-hero__eyebrow">Documentacion</p>
          <h2>Centro documental del proyecto separado de la operacion y de la monitorizacion.</h2>
          <p className="guide-hero__description">
            Esta zona solo reune memoria, anexos, repositorio, arquitectura y entregables. No mezcla control de
            servicios, logs ni herramientas de monitor privado.
          </p>
          <div className="guide-hero__actions">
            <a href={repositoryUrl} target="_blank" rel="noreferrer" className="button button--primary button--sm">
              Abrir repositorio
            </a>
            <a href={`${origin}/app`} target="_blank" rel="noreferrer" className="button button--ghost button--sm">
              Portal interno
            </a>
            <a href={`${origin}/externo`} target="_blank" rel="noreferrer" className="button button--ghost button--sm">
              Portal externo
            </a>
          </div>
        </div>

        <aside className="guide-hero__summary">
          <article className="guide-summary-card">
            <span>Ruta</span>
            <strong>/documentacion</strong>
            <small>Centro documental independiente del monitor tecnico.</small>
          </article>
          <article className="guide-summary-card">
            <span>Repositorio</span>
            <strong>TFG-Agora</strong>
            <small>Codigo, docs, memoria y scripts de entrega.</small>
          </article>
          <article className="guide-summary-card">
            <span>Uso</span>
            <strong>Revision final</strong>
            <small>Apoyo para memoria, tutora y cierre documental del proyecto.</small>
          </article>
        </aside>
      </header>

      <div className="guide-shell">
        <aside className="guide-sidebar">
          <p className="guide-sidebar__eyebrow">Indice documental</p>
          <nav className="guide-nav">
            <NavLink end to="." className={navClassName}>
              Resumen
            </NavLink>
            <NavLink to="arquitectura" className={navClassName}>
              Arquitectura
            </NavLink>
            <NavLink to="memoria" className={navClassName}>
              Memoria y anexos
            </NavLink>
            <NavLink to="entrega" className={navClassName}>
              Entrega final
            </NavLink>
          </nav>
        </aside>

        <div className="guide-content">
          <Routes>
            <Route index element={<OverviewSection />} />
            <Route path="arquitectura" element={<ArchitectureSection />} />
            <Route path="memoria" element={<MemorySection />} />
            <Route path="entrega" element={<DeliverySection />} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </div>
      </div>
    </section>
  );
}
