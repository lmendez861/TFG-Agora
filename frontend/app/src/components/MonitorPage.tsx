import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ApiCollections, MeResponse, MonitorDocumentRecord, MonitorOverview } from '../types';
import { fetchMonitorOverview } from '../services/api';
import { canPreviewDocument } from '../utils/documents';
import { DocumentPreviewModal } from './DocumentPreviewModal';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface MonitorPageProps {
  collections: ApiCollections | null;
  pendingSolicitudes: number;
  currentUser: MeResponse | null;
  lastUpdated: Date | null;
  syncInProgress: boolean;
  onSync: () => void;
  apiBaseUrl: string;
}

interface PreviewState {
  title: string;
  url: string | null;
}

function formatDateTime(value: string | Date | null): string {
  if (!value) {
    return 'Sin dato';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sin dato';
  }

  return dateFormatter.format(date);
}

export function MonitorPage({
  collections,
  pendingSolicitudes,
  currentUser,
  lastUpdated,
  syncInProgress,
  onSync,
  apiBaseUrl,
}: MonitorPageProps) {
  const [snapshot, setSnapshot] = useState<MonitorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMonitorOverview();
      startTransition(() => {
        setSnapshot(data);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el monitor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot().catch(() => {
      // errores gestionados dentro
    });
  }, [loadSnapshot]);

  const deferredActivity = useDeferredValue(snapshot?.activity ?? []);
  const deferredLogs = useDeferredValue(snapshot?.logs ?? []);
  const previewableDocuments = useMemo(
    () => (snapshot?.documents ?? []).filter((doc) => canPreviewDocument(doc, apiBaseUrl)),
    [snapshot?.documents, apiBaseUrl],
  );

  const localMetrics = useMemo(() => {
    if (!collections) {
      return [];
    }

    return [
      {
        id: 'local-empresas',
        label: 'Empresas cargadas',
        value: collections.empresas.length,
        hint: 'Coleccion activa en el panel.',
      },
      {
        id: 'local-convenios',
        label: 'Convenios cargados',
        value: collections.convenios.length,
        hint: 'Incluye workflow y checklist.',
      },
      {
        id: 'local-estudiantes',
        label: 'Estudiantes cargados',
        value: collections.estudiantes.length,
        hint: 'Estado visible en memoria del panel.',
      },
      {
        id: 'local-solicitudes',
        label: 'Solicitudes pendientes',
        value: pendingSolicitudes,
        hint: 'Notificaciones internas pendientes de revisar.',
      },
    ];
  }, [collections, pendingSolicitudes]);

  const openPreview = useCallback((document: MonitorDocumentRecord) => {
    setPreview({
      title: document.name,
      url: document.url,
    });
  }, []);

  return (
    <section className="module-page monitor-page">
      <header className="module-page__header monitor-page__header">
        <div>
          <p className="module-page__eyebrow">Observabilidad</p>
          <h2>Centro de supervision operativa</h2>
          <p>
            Revisa servicios, actividad reciente, logs disponibles y las suites de supervision automatizada
            desde una vista separada del panel de gestion.
          </p>
        </div>
        <div className="module-page__actions">
          <button type="button" className="button button--ghost button--sm" onClick={loadSnapshot} disabled={loading}>
            {loading ? 'Actualizando monitor...' : 'Actualizar monitor'}
          </button>
          <button type="button" className="button button--primary button--sm" onClick={onSync} disabled={syncInProgress}>
            {syncInProgress ? 'Sincronizando...' : 'Sincronizar panel'}
          </button>
        </div>
      </header>

      {error && <div className="app__alert app__alert--error">{error}</div>}

      <section className="monitor-hero">
        <article className="monitor-hero__card">
          <p className="monitor-hero__label">Estado del panel</p>
          <strong>{currentUser?.username ?? 'Sesion no identificada'}</strong>
          <span>Ultima sincronizacion del panel: {formatDateTime(lastUpdated)}</span>
        </article>
        <article className="monitor-hero__card monitor-hero__card--accent">
          <p className="monitor-hero__label">Entorno backend</p>
          <strong>{snapshot?.environment.appEnv ?? 'Cargando...'}</strong>
          <span>
            PHP {snapshot?.environment.phpVersion ?? '...'} · debug {snapshot?.environment.debug ? 'activo' : 'desactivado'}
          </span>
        </article>
        <article className="monitor-hero__card">
          <p className="monitor-hero__label">Generado</p>
          <strong>{formatDateTime(snapshot?.generatedAt ?? null)}</strong>
          <span>Zona horaria {snapshot?.environment.timezone ?? 'Europe/Madrid'}</span>
        </article>
      </section>

      <section className="monitor-grid monitor-grid--services">
        {(snapshot?.services ?? []).map((service) => (
          <article key={service.id} className={`monitor-card monitor-card--${service.status}`}>
            <div className="monitor-card__header">
              <span className="monitor-status-dot" />
              <p>{service.name}</p>
            </div>
            <strong>{service.status === 'healthy' ? 'Activo' : 'Revision'}</strong>
            <span>{service.detail}</span>
            {service.target && <code>{service.target}</code>}
          </article>
        ))}
      </section>

      <section className="monitor-grid monitor-grid--metrics">
        {[...(snapshot?.metrics ?? []), ...localMetrics].map((metric) => (
          <article key={metric.id} className="monitor-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </article>
        ))}
      </section>

      <section className="monitor-layout">
        <article className="monitor-panel">
          <header className="monitor-panel__header">
            <div>
              <p className="module-page__eyebrow">Actividad</p>
              <h3>Ultimos eventos detectados</h3>
            </div>
          </header>
          <div className="monitor-timeline">
            {deferredActivity.length > 0 ? (
              deferredActivity.map((item) => (
                <article key={item.id} className="monitor-timeline__item">
                  <span className={`badge badge--${item.category}`}>{item.category}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <small>{formatDateTime(item.timestamp)}</small>
                </article>
              ))
            ) : (
              <p className="detail-placeholder">No hay actividad reciente para mostrar.</p>
            )}
          </div>
        </article>

        <article className="monitor-panel">
          <header className="monitor-panel__header">
            <div>
              <p className="module-page__eyebrow">Logs</p>
              <h3>Fragmentos recientes</h3>
            </div>
          </header>
          <div className="monitor-log-list">
            {deferredLogs.length > 0 ? (
              deferredLogs.map((log) => (
                <article key={log.file} className="monitor-log">
                  <div className="monitor-log__header">
                    <strong>{log.file}</strong>
                    <small>{formatDateTime(log.updatedAt)}</small>
                  </div>
                  <pre>{log.lines.join('\n')}</pre>
                </article>
              ))
            ) : (
              <p className="detail-placeholder">No hay logs recientes en var/log.</p>
            )}
          </div>
        </article>
      </section>

      <section className="monitor-layout">
        <article className="monitor-panel">
          <header className="monitor-panel__header">
            <div>
              <p className="module-page__eyebrow">Tests</p>
              <h3>Suites registradas</h3>
            </div>
          </header>
          <div className="monitor-suite-list">
            {(snapshot?.tests ?? []).map((suite) => (
              <article key={suite.id} className={`monitor-suite monitor-suite--${suite.status}`}>
                <div className="monitor-suite__top">
                  <div>
                    <strong>{suite.name}</strong>
                    <small>{suite.scope} · {suite.totalFiles} archivos</small>
                  </div>
                  <code>{suite.command}</code>
                </div>
                <div className="monitor-chip-list">
                  {suite.focus.map((item) => (
                    <span key={item} className="chip chip--ghost">{item}</span>
                  ))}
                </div>
                <ul className="monitor-file-list">
                  {suite.files.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </article>

        <article className="monitor-panel">
          <header className="monitor-panel__header">
            <div>
              <p className="module-page__eyebrow">PDFs</p>
              <h3>Documentos previsualizables</h3>
            </div>
          </header>
          <div className="monitor-documents">
            {previewableDocuments.length > 0 ? (
              previewableDocuments.map((document) => (
                <article key={document.id} className="monitor-document">
                  <div>
                    <strong>{document.name}</strong>
                    <small>{document.sourceLabel} · {formatDateTime(document.uploadedAt)}</small>
                  </div>
                  <div className="document-actions">
                    <button type="button" className="button button--ghost button--sm" onClick={() => openPreview(document)}>
                      Vista previa
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="detail-placeholder">No hay PDFs con URL valida en este momento.</p>
            )}
          </div>
        </article>
      </section>

      {preview && (
        <DocumentPreviewModal
          title={preview.title}
          documentUrl={preview.url}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
