import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchPublicAccessSnapshot,
  startPublicAccess,
  stopPublicAccess,
} from '../services/api.ts';
import type { PublicAccessSnapshot } from '../types.ts';

type DocumentationSection = 'resumen' | 'capturas' | 'acceso' | 'validacion';

type CaptureEntry = {
  file: string;
  title: string;
  description: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const sections: Array<{ id: DocumentationSection; label: string; eyebrow: string; description: string }> = [
  {
    id: 'resumen',
    label: 'Control',
    eyebrow: 'Area de trabajo',
    description: 'Vista privada para supervisar la demo, los accesos y el material de apoyo.',
  },
  {
    id: 'capturas',
    label: 'Capturas',
    eyebrow: 'Area de trabajo',
    description: 'Indice de evidencias visuales disponibles para memoria y defensa.',
  },
  {
    id: 'acceso',
    label: 'Acceso externo',
    eyebrow: 'Configuracion',
    description: 'Control operativo del tunel publico y verificacion de enlaces.',
  },
  {
    id: 'validacion',
    label: 'Validacion',
    eyebrow: 'Configuracion',
    description: 'Checklist tecnico para probar frontend, documentacion y exportacion CSV.',
  },
];

const captureIndex: CaptureEntry[] = [
  {
    file: '01-bloques-funcionalidad.png',
    title: 'Bloques funcionales',
    description: 'Panorama general de los modulos y sus relaciones principales.',
  },
  {
    file: '02-esquema-relacional.png',
    title: 'Esquema relacional',
    description: 'Mapa de entidades persistidas y estructura del dominio.',
  },
  {
    file: '03-panel-interno-dashboard.png',
    title: 'Dashboard interno',
    description: 'KPI, resumen operativo y acceso a exportaciones CSV.',
  },
  {
    file: '04-panel-interno-solicitudes.png',
    title: 'Solicitudes',
    description: 'Revision, aprobacion y seguimiento de solicitudes empresariales.',
  },
  {
    file: '05-portal-externo.png',
    title: 'Portal externo',
    description: 'Entrada publica para alta y seguimiento de empresas colaboradoras.',
  },
];

const exportScopes = [
  { label: 'Dashboard', detail: 'Resumen CSV con KPI principales.' },
  { label: 'Empresas', detail: 'Listado general de colaboradoras.' },
  { label: 'Convenios', detail: 'Workflow, estados y fechas clave.' },
  { label: 'Estudiantes', detail: 'Seguimiento academico y asignaciones.' },
  { label: 'Asignaciones', detail: 'Pipeline, modalidad y estado.' },
  { label: 'Tutores', detail: 'Academicos y profesionales.' },
  { label: 'Solicitudes', detail: 'Altas externas pendientes y su estado.' },
];

const validationChecklist = [
  'Abrir el panel interno y confirmar que el dashboard carga sin errores.',
  'Entrar en el centro de control y validar que el estado del acceso externo responde.',
  'Exportar un CSV desde una tabla y otro desde el dashboard.',
  'Abrir el portal externo local y, si hace falta, la URL publica.',
  'Usar el monitor operativo si necesitas justificar estado de servicios o tests.',
];

const previewRows = [
  { code: 'DOC-01', module: 'Panel interno', status: 'Operativo', detail: 'Dashboard, empresas y convenios.' },
  { code: 'DOC-02', module: 'Exportacion CSV', status: 'Validada', detail: 'Listados principales y resumen ejecutivo.' },
  { code: 'DOC-03', module: 'Portal externo', status: 'Operativo', detail: 'Alta, verificacion y mensajeria.' },
  { code: 'DOC-04', module: 'Acceso publico', status: 'Supervisado', detail: 'Tunel temporal gestionado desde esta pagina.' },
];

function formatStartedAt(value: string | null): string {
  if (!value) {
    return 'Sin registro';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin registro';
  }

  return dateTimeFormatter.format(parsed);
}

function getStatusLabel(status: PublicAccessSnapshot['status'] | null): string {
  switch (status) {
    case 'active':
      return 'Activo';
    case 'starting':
      return 'Inicializando';
    case 'error':
      return 'Incidencia';
    case 'inactive':
    default:
      return 'Detenido';
  }
}

export function DocumentationPage() {
  const [activeSection, setActiveSection] = useState<DocumentationSection>('resumen');
  const [publicAccess, setPublicAccess] = useState<PublicAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'start' | 'stop' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const currentOrigin = typeof window === 'undefined' ? 'http://127.0.0.1:8000' : window.location.origin;

  const currentSection = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection],
  );

  const localLinks = useMemo(
    () => ({
      panel: `${currentOrigin}/app`,
      portal: `${currentOrigin}/externo`,
      api: `${currentOrigin}/api`,
      monitor: `${currentOrigin}/app/monitor`,
    }),
    [currentOrigin],
  );

  const loadPublicAccess = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setPublicAccess(await fetchPublicAccessSnapshot());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo leer el estado del acceso externo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicAccess().catch(() => {
      // El error visible ya se gestiona en el estado local.
    });
  }, [loadPublicAccess]);

  const handleStart = useCallback(async () => {
    setAction('start');
    setError(null);
    setCopyMessage(null);

    try {
      setPublicAccess(await startPublicAccess());
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'No se pudo activar el acceso externo.');
    } finally {
      setAction(null);
    }
  }, []);

  const handleStop = useCallback(async () => {
    setAction('stop');
    setError(null);
    setCopyMessage(null);

    try {
      setPublicAccess(await stopPublicAccess());
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'No se pudo detener el acceso externo.');
    } finally {
      setAction(null);
    }
  }, []);

  const handleCopyUrl = useCallback(async () => {
    if (!publicAccess?.publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicAccess.publicUrl);
      setCopyMessage('URL copiada al portapapeles.');
    } catch {
      setCopyMessage('No se pudo copiar automaticamente la URL.');
    }
  }, [publicAccess?.publicUrl]);

  const isBusy = loading || action !== null;
  const statusLabel = getStatusLabel(publicAccess?.status ?? null);
  const statusTone = publicAccess?.status ?? 'inactive';
  const canStart = publicAccess?.status !== 'active' && publicAccess?.status !== 'starting' && !isBusy;
  const canStop = (publicAccess?.status === 'active' || publicAccess?.status === 'starting') && !isBusy;

  return (
    <section className="docs-shell">
      {error && <div className="app__alert app__alert--error">{error}</div>}
      {copyMessage && <div className="app__alert app__alert--info">{copyMessage}</div>}

      <div className="docs-shell__layout">
        <aside className="docs-shell__sidebar">
          <div className="docs-shell__env">
            <span className="docs-shell__env-label">Selecciona entorno</span>
            <div className="docs-shell__env-card">
              <span className="docs-shell__env-badge">PROD</span>
              <strong>Panel integrado</strong>
              <small>Modo URL unica sobre Symfony</small>
            </div>
          </div>

          <div className="docs-shell__nav-group">
            <p className="docs-shell__group-title">Area de trabajo</p>
            {sections.filter((section) => section.eyebrow === 'Area de trabajo').map((section) => (
              <button
                key={section.id}
                type="button"
                className={`docs-shell__nav-item ${activeSection === section.id ? 'is-active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="docs-shell__nav-group">
            <p className="docs-shell__group-title">Configuracion</p>
            {sections.filter((section) => section.eyebrow === 'Configuracion').map((section) => (
              <button
                key={section.id}
                type="button"
                className={`docs-shell__nav-item ${activeSection === section.id ? 'is-active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="docs-shell__sidebar-meta">
            <span>Frontend</span>
            <strong>Centro privado /app/control</strong>
            <small>Supervision operativa y soporte de demo</small>
          </div>
        </aside>

        <div className="docs-shell__workspace">
          <header className="docs-shell__topbar">
            <div>
              <p className="docs-shell__eyebrow">{currentSection.eyebrow}</p>
              <h2>{currentSection.label}</h2>
              <p>{currentSection.description}</p>
            </div>
            <div className="docs-shell__topbar-actions">
              <a href={localLinks.panel} target="_blank" rel="noreferrer" className="button button--ghost button--sm">
                Abrir panel
              </a>
              <a href={localLinks.portal} target="_blank" rel="noreferrer" className="button button--ghost button--sm">
                Abrir portal
              </a>
              <a href={localLinks.monitor} target="_blank" rel="noreferrer" className="button button--primary button--sm">
                Abrir monitor
              </a>
            </div>
          </header>

          <div className="docs-shell__body">
            <main className="docs-shell__canvas">
              {activeSection === 'resumen' && (
                <div className="docs-workbench">
                  <section className="docs-preview">
                    <header className="docs-preview__header">
                      <div>
                        <p className="docs-preview__eyebrow">Vista documental</p>
                        <h3>Centro privado de control para la demo y la memoria</h3>
                      </div>
                      <div className="docs-preview__chips">
                        <span className="docs-pill docs-pill--success">Empresa</span>
                        <span className="docs-pill">Control</span>
                        <span className="docs-pill">Exportacion CSV</span>
                      </div>
                    </header>

                    <div className="docs-preview__grid">
                      <article className="docs-sheet">
                        <div className="docs-sheet__titlebar">
                          <span>Agora</span>
                          <strong>Resumen operativo</strong>
                          <span>{formatStartedAt(publicAccess?.startedAt ?? null)}</span>
                        </div>

                        <div className="docs-sheet__summary">
                          <div>
                            <span>Panel interno</span>
                            <strong>/app</strong>
                          </div>
                          <div>
                            <span>Portal externo</span>
                            <strong>/externo</strong>
                          </div>
                          <div>
                            <span>Acceso publico</span>
                            <strong>{statusLabel}</strong>
                          </div>
                        </div>

                        <div className="docs-sheet__table">
                          <div className="docs-sheet__table-head">
                            <span>Identificador</span>
                            <span>Componente</span>
                            <span>Estado</span>
                            <span>Detalle</span>
                          </div>
                          {previewRows.map((row) => (
                            <div key={row.code} className="docs-sheet__table-row">
                              <span>{row.code}</span>
                              <span>{row.module}</span>
                              <span>{row.status}</span>
                              <span>{row.detail}</span>
                            </div>
                          ))}
                        </div>

                        <div className="docs-sheet__footer">
                          <div>
                            <span>Ruta privada</span>
                            <strong>/app/control</strong>
                          </div>
                          <div>
                            <span>Ruta monitor</span>
                            <strong>/app/monitor</strong>
                          </div>
                        </div>
                      </article>

                      <article className="docs-insight">
                        <div className="docs-insight__section">
                          <header>
                            <h4>Exportaciones disponibles</h4>
                            <span>Donde ensenar CSV</span>
                          </header>
                          <div className="docs-insight__list">
                            {exportScopes.map((scope) => (
                              <div key={scope.label} className="docs-insight__list-item">
                                <strong>{scope.label}</strong>
                                <span>{scope.detail}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="docs-insight__section">
                          <header>
                            <h4>Rutas clave</h4>
                            <span>Accesos directos</span>
                          </header>
                          <div className="docs-link-grid">
                            <a href={localLinks.panel} target="_blank" rel="noreferrer">Panel interno</a>
                            <a href={localLinks.portal} target="_blank" rel="noreferrer">Portal externo</a>
                            <a href={localLinks.api} target="_blank" rel="noreferrer">API</a>
                            <Link to="/solicitudes">Solicitudes</Link>
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                </div>
              )}

              {activeSection === 'capturas' && (
                <section className="docs-surface">
                  <header className="docs-surface__header">
                    <div>
                      <p className="docs-preview__eyebrow">Indice visual</p>
                      <h3>Capturas registradas</h3>
                    </div>
                    <span className="docs-pill">{captureIndex.length} elementos</span>
                  </header>

                  <div className="docs-capture-table">
                    <div className="docs-capture-table__head">
                      <span>Archivo</span>
                      <span>Titulo</span>
                      <span>Uso previsto</span>
                    </div>
                    {captureIndex.map((capture) => (
                      <div key={capture.file} className="docs-capture-table__row">
                        <strong>{capture.file}</strong>
                        <span>{capture.title}</span>
                        <span>{capture.description}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeSection === 'acceso' && (
                <section className="docs-surface">
                  <header className="docs-surface__header">
                    <div>
                      <p className="docs-preview__eyebrow">Exposicion controlada</p>
                      <h3>Acceso publico temporal</h3>
                    </div>
                    <span className={`docs-pill docs-pill--${statusTone}`}>{statusLabel}</span>
                  </header>

                  <div className="docs-access-grid">
                    <article className="docs-access-card">
                      <span>Base local</span>
                      <strong>{publicAccess?.targetUrl ?? currentOrigin}</strong>
                      <small>Origen que se publica hacia la URL externa.</small>
                    </article>
                    <article className="docs-access-card">
                      <span>URL publica</span>
                      <strong>{publicAccess?.publicUrl ?? 'No disponible'}</strong>
                      <small>Usa esta misma base para abrir `/app` o `/externo`.</small>
                    </article>
                    <article className="docs-access-card">
                      <span>Ultimo inicio</span>
                      <strong>{formatStartedAt(publicAccess?.startedAt ?? null)}</strong>
                      <small>Hora del ultimo refresco del tunel.</small>
                    </article>
                  </div>

                  <div className="docs-access-actions">
                    <button type="button" className="button button--primary button--sm" onClick={handleStart} disabled={!canStart}>
                      {action === 'start' ? 'Activando acceso...' : 'Activar acceso externo'}
                    </button>
                    <button type="button" className="button button--ghost button--sm" onClick={handleStop} disabled={!canStop}>
                      {action === 'stop' ? 'Deteniendo acceso...' : 'Bajar acceso externo'}
                    </button>
                    <button type="button" className="button button--ghost button--sm" onClick={loadPublicAccess} disabled={isBusy}>
                      {loading ? 'Actualizando...' : 'Actualizar estado'}
                    </button>
                    {publicAccess?.publicUrl && (
                      <button type="button" className="button button--ghost button--sm" onClick={handleCopyUrl} disabled={isBusy}>
                        Copiar URL
                      </button>
                    )}
                  </div>
                </section>
              )}

              {activeSection === 'validacion' && (
                <section className="docs-surface">
                  <header className="docs-surface__header">
                    <div>
                      <p className="docs-preview__eyebrow">Control previo</p>
                      <h3>Checklist de validacion</h3>
                    </div>
                    <span className="docs-pill">Antes de grabar</span>
                  </header>

                  <div className="docs-validation-list">
                    {validationChecklist.map((item, index) => (
                      <article key={item} className="docs-validation-item">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <p>{item}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </main>

            <aside className="docs-shell__inspector">
              <article className={`docs-control-card docs-control-card--${statusTone}`}>
                <header className="docs-control-card__header">
                  <div>
                    <span>Estado del acceso</span>
                    <strong>{statusLabel}</strong>
                  </div>
                  <span className="docs-pill docs-pill--ghost">{loading ? 'Cargando' : 'En linea'}</span>
                </header>
                <p>{publicAccess?.detail ?? 'Cargando estado del acceso externo...'}</p>
                <dl className="docs-control-card__meta">
                  <div>
                    <dt>Destino</dt>
                    <dd>{publicAccess?.targetUrl ?? currentOrigin}</dd>
                  </div>
                  <div>
                    <dt>Publica</dt>
                    <dd>{publicAccess?.publicUrl ?? 'No disponible'}</dd>
                  </div>
                </dl>
              </article>

              <article className="docs-side-card">
                <header className="docs-side-card__header">
                  <h3>Accesos rapidos</h3>
                </header>
                <div className="docs-side-links">
                  <Link to="/documentacion">Guia</Link>
                  <Link to="/">Dashboard</Link>
                  <Link to="/empresas">Empresas</Link>
                  <Link to="/convenios">Convenios</Link>
                  <Link to="/solicitudes">Solicitudes</Link>
                  <Link to="/monitor">Monitor</Link>
                </div>
              </article>

              <article className="docs-side-card">
                <header className="docs-side-card__header">
                  <h3>Uso recomendado</h3>
                </header>
                <ul className="docs-side-list">
                  <li>Ensenar primero dashboard y exportacion CSV.</li>
                  <li>Pasar despues a convenios y solicitudes.</li>
                  <li>Cerrar con portal externo o URL publica si la tutora prueba desde fuera.</li>
                </ul>
              </article>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
