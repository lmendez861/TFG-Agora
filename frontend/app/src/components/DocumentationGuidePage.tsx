const documentationAssets = [
  {
    title: 'Memoria final',
    detail: 'Documento principal del proyecto con arquitectura, validacion y conclusiones.',
    path: 'docs/memoria-final.md',
  },
  {
    title: 'Guia operativa',
    detail: 'Recorrido funcional de la plataforma, modulos clave y validaciones recomendadas.',
    path: 'docs/guia-demo.md',
  },
  {
    title: 'Capturas y evidencias',
    detail: 'Indice de imagenes, pruebas tecnicas y material de apoyo para anexos.',
    path: 'docs/anexo-c-capturas-y-evidencias.md',
  },
  {
    title: 'Memoria PDF y DOCX',
    detail: 'Entregables listos para revision academica y entrega final.',
    path: 'docs/memoria-final.pdf / docs/memoria-final.docx',
  },
];

const explanationCards = [
  {
    title: 'Portal interno',
    detail: 'Gestiona empresas, convenios, estudiantes, asignaciones, tutores y solicitudes con exportacion CSV.',
  },
  {
    title: 'Portal externo',
    detail: 'Canaliza el alta de empresas interesadas y entrega la solicitud al equipo interno.',
  },
  {
    title: 'API Symfony',
    detail: 'Centraliza seguridad, reglas de negocio, persistencia y exportaciones desde backend.',
  },
];

const functionalHighlights = [
  'Exportacion CSV desde dashboard y tablas principales.',
  'Workflow de convenios con checklist, alertas y documentos.',
  'Gestion de solicitudes recibidas desde el portal externo.',
  'Material documental y tecnico centralizado para defensa y memoria.',
];

const repositoryUrl = 'https://github.com/lmendez861/TFG-Agora';

export function DocumentationGuidePage() {
  const currentOrigin = typeof window === 'undefined' ? 'http://127.0.0.1:8000' : window.location.origin;

  return (
    <section className="guide-page">
      <header className="guide-hero guide-hero--documentation">
        <div className="guide-hero__copy">
          <p className="guide-hero__eyebrow">Documentacion</p>
          <h2>Centro documental del proyecto con memoria, repositorio y contexto funcional.</h2>
          <p className="guide-hero__description">
            Esta pagina queda reservada para documentacion y apoyo academico. Aqui se resume la arquitectura del
            sistema, el material entregable y las referencias utiles para revisar el proyecto sin mezclarlo con el
            monitor tecnico ni con el control de servicios.
          </p>
          <div className="guide-hero__actions">
            <a href={repositoryUrl} target="_blank" rel="noreferrer" className="button button--primary button--sm">
              Abrir repositorio
            </a>
            <a href={`${currentOrigin}/app`} target="_blank" rel="noreferrer" className="button button--ghost button--sm">
              Ir al portal interno
            </a>
            <a href={`${currentOrigin}/externo`} target="_blank" rel="noreferrer" className="button button--ghost button--sm">
              Ir al portal externo
            </a>
          </div>
        </div>

        <aside className="guide-hero__summary">
          <article className="guide-summary-card">
            <span>Ruta</span>
            <strong>/documentacion</strong>
            <small>Centro documental independiente del monitor tecnico privado.</small>
          </article>
          <article className="guide-summary-card">
            <span>Repositorio</span>
            <strong>TFG-Agora</strong>
            <small>Fuente unica para codigo, docs y entregables.</small>
          </article>
          <article className="guide-summary-card">
            <span>Enfoque</span>
            <strong>Memoria y contexto</strong>
            <small>Sin controles de servicios ni herramientas de monitorizacion.</small>
          </article>
        </aside>
      </header>

      <section className="guide-layout">
        <article className="guide-card guide-card--wide">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Material principal</p>
              <h3>Documentos del proyecto</h3>
            </div>
            <span className="guide-badge">{documentationAssets.length} piezas</span>
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
              <p className="guide-card__eyebrow">Resumen funcional</p>
              <h3>Que hace la aplicacion</h3>
            </div>
          </header>
          <ul className="guide-list">
            {functionalHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="guide-modules">
        {explanationCards.map((card) => (
          <article key={card.title} className="guide-module-card">
            <p className="guide-module-card__label">Componente</p>
            <h3>{card.title}</h3>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="guide-layout">
        <article className="guide-card">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Repositorio</p>
              <h3>Referencia tecnica</h3>
            </div>
          </header>
          <p className="guide-card__copy">
            El repositorio concentra backend Symfony, frontend interno, portal externo, memoria, anexos y scripts de
            generacion documental. Es la referencia recomendada para revisar cambios, entregables y trazabilidad.
          </p>
          <a href={repositoryUrl} target="_blank" rel="noreferrer" className="guide-inline-link">
            {repositoryUrl}
          </a>
        </article>

        <article className="guide-card">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Separacion de espacios</p>
              <h3>Lectura de la plataforma</h3>
            </div>
          </header>
          <ul className="guide-list">
            <li>`/app` queda para gestion academica y operativa.</li>
            <li>`/externo` queda para la entrada de empresas interesadas.</li>
            <li>`/documentacion` queda como soporte de memoria, anexos y contexto.</li>
            <li>`/monitor` queda reservado para monitorizacion tecnica privada.</li>
          </ul>
        </article>
      </section>
    </section>
  );
}
