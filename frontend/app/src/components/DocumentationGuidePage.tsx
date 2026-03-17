import { Link } from 'react-router-dom';

const walkthroughSteps = [
  {
    id: '01',
    title: 'Abrir el dashboard interno',
    detail: 'Empieza en /app para mostrar KPI, modulos y el boton de exportacion CSV del resumen.',
  },
  {
    id: '02',
    title: 'Recorrer empresas y convenios',
    detail: 'Ensenar los listados principales permite justificar el CRUD y la exportacion por tabla.',
  },
  {
    id: '03',
    title: 'Revisar solicitudes',
    detail: 'La bandeja de solicitudes muestra el flujo entre el portal externo y la aprobacion interna.',
  },
  {
    id: '04',
    title: 'Abrir el portal externo',
    detail: 'Completa la demo con el formulario publico y el acceso desde movil o URL publica.',
  },
];

const moduleHighlights = [
  {
    title: 'Panel interno',
    description: 'Dashboard, CRUD, detalle de entidades, workflow de convenios y exportacion CSV.',
    route: '/empresas',
    action: 'Ver gestion',
  },
  {
    title: 'Solicitudes externas',
    description: 'Alta publica, verificacion, mensajeria y aprobacion desde el panel.',
    route: '/solicitudes',
    action: 'Abrir solicitudes',
  },
  {
    title: 'Tutores y asignaciones',
    description: 'Seguimiento de tutores academicos y profesionales junto al estado de practicas.',
    route: '/tutores',
    action: 'Abrir tutores',
  },
];

const exportChecklist = [
  'Dashboard: resumen ejecutivo para la defensa.',
  'Empresas y convenios: vision general de la colaboracion.',
  'Estudiantes y asignaciones: seguimiento academico y operativo.',
  'Tutores y solicitudes: evidencia de soporte y pipeline externo.',
];

const captureIndex = [
  '01-bloques-funcionalidad.png',
  '02-esquema-relacional.png',
  '03-panel-interno-dashboard.png',
  '04-panel-interno-solicitudes.png',
  '05-portal-externo.png',
];

const deliveryItems = [
  'Memoria final en Markdown, HTML, PDF y DOCX.',
  'Anexos tecnicos, guia de demo y evidencias visuales.',
  'Centro privado de control para acceso publico y monitor operativo.',
];

export function DocumentationGuidePage() {
  const currentOrigin = typeof window === 'undefined' ? 'http://127.0.0.1:8000' : window.location.origin;

  return (
    <section className="guide-page">
      <header className="guide-hero">
        <div className="guide-hero__copy">
          <p className="guide-hero__eyebrow">Guia del proyecto</p>
          <h2>Documentacion funcional para recorrer la plataforma con un tono profesional y directo.</h2>
          <p className="guide-hero__description">
            Esta pagina vuelve a ser la guia de exploracion del sistema. El control del acceso publico y la
            supervision operativa quedan separados en paginas privadas para no mezclar la demo con la capa tecnica.
          </p>
          <div className="guide-hero__actions">
            <a href={`${currentOrigin}/app`} target="_blank" rel="noreferrer" className="button button--primary button--sm">
              Abrir panel interno
            </a>
            <a href={`${currentOrigin}/externo`} target="_blank" rel="noreferrer" className="button button--ghost button--sm">
              Abrir portal externo
            </a>
            <Link to="/solicitudes" className="button button--ghost button--sm">
              Ver solicitudes
            </Link>
          </div>
        </div>

        <aside className="guide-hero__summary">
          <article className="guide-summary-card">
            <span>Ruta principal</span>
            <strong>/app/documentacion</strong>
            <small>Guia funcional y recorrido recomendado.</small>
          </article>
          <article className="guide-summary-card">
            <span>Control privado</span>
            <strong>/app/control</strong>
            <small>Estado del acceso publico y enlaces de demo.</small>
          </article>
          <article className="guide-summary-card">
            <span>Monitor</span>
            <strong>/app/monitor</strong>
            <small>Servicios, logs, tests y supervision operativa.</small>
          </article>
        </aside>
      </header>

      <section className="guide-layout">
        <article className="guide-card guide-card--wide">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Recorrido recomendado</p>
              <h3>Secuencia de demo para la tutora</h3>
            </div>
            <span className="guide-badge">4 pasos</span>
          </header>

          <div className="guide-timeline">
            {walkthroughSteps.map((step) => (
              <article key={step.id} className="guide-timeline__item">
                <span className="guide-timeline__index">{step.id}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="guide-card">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Exportacion CSV</p>
              <h3>Puntos que conviene ensenar</h3>
            </div>
          </header>
          <ul className="guide-list">
            {exportChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="guide-modules">
        {moduleHighlights.map((module) => (
          <article key={module.title} className="guide-module-card">
            <p className="guide-module-card__label">Modulo</p>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            <Link to={module.route} className="guide-module-card__link">
              {module.action}
            </Link>
          </article>
        ))}
      </section>

      <section className="guide-layout">
        <article className="guide-card">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Capturas</p>
              <h3>Indice visual actual</h3>
            </div>
            <span className="guide-badge">{captureIndex.length} archivos</span>
          </header>
          <div className="guide-file-list">
            {captureIndex.map((item) => (
              <div key={item} className="guide-file-list__item">
                <strong>{item}</strong>
                <span>Disponible en docs/capturas</span>
              </div>
            ))}
          </div>
        </article>

        <article className="guide-card">
          <header className="guide-card__header">
            <div>
              <p className="guide-card__eyebrow">Entregables</p>
              <h3>Material de apoyo</h3>
            </div>
          </header>
          <ul className="guide-list">
            {deliveryItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="guide-links">
            <Link to="/control">Abrir centro de control privado</Link>
            <Link to="/monitor">Abrir monitor operativo</Link>
          </div>
        </article>
      </section>
    </section>
  );
}
