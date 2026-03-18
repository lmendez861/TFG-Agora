import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ApiCollections, MeResponse, MonitorDocumentRecord, MonitorOverview, PublicAccessSnapshot } from '../types';
import {
  fetchMonitorOverview,
  fetchPublicAccessSnapshot,
  startPublicAccess,
  stopPublicAccess,
} from '../services/api';
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
  onSync: () => Promise<void> | void;
  apiBaseUrl: string;
}

interface PreviewState {
  title: string;
  url: string | null;
}

const permissionsMatrix = [
  {
    role: 'ROLE_ADMIN',
    label: 'Administrador',
    capabilities: ['Gestion total del panel', 'Control de acceso externo', 'Supervision y revisiones'],
  },
  {
    role: 'ROLE_API',
    label: 'Operacion interna',
    capabilities: ['Consulta y actualizacion de modulos', 'Revision de solicitudes', 'Exportacion operativa'],
  },
  {
    role: 'ROLE_USER',
    label: 'Lectura',
    capabilities: ['Consulta basica', 'Revision de estados', 'Sin operaciones de control'],
  },
];

const workflowMaps = [
  {
    id: 'empresa',
    title: 'Flujo portal externo',
    steps: ['Registro inicial', 'Verificacion por correo', 'Solicitud enviada', 'Revision interna', 'Aprobacion o rechazo'],
  },
  {
    id: 'academico',
    title: 'Flujo academico interno',
    steps: ['Empresa activa', 'Convenio vigente', 'Asignacion creada', 'Seguimiento', 'Cierre y evidencia'],
  },
];

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

function getPublicStatusLabel(status: PublicAccessSnapshot['status'] | null): string {
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
  const [publicAccess, setPublicAccess] = useState<PublicAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessAction, setAccessAction] = useState<'start' | 'stop' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [monitorFetchMs, setMonitorFetchMs] = useState<number | null>(null);
  const [panelSyncMs, setPanelSyncMs] = useState<number | null>(null);

  const loadSnapshot = useCallback(async () => {
    const startedAt = performance.now();
    setLoading(true);
    setError(null);

    try {
      const [overview, access] = await Promise.all([
        fetchMonitorOverview(),
        fetchPublicAccessSnapshot(),
      ]);

      startTransition(() => {
        setSnapshot(overview);
        setPublicAccess(access);
      });
      setMonitorFetchMs(Math.round(performance.now() - startedAt));
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

  const handlePanelSync = useCallback(async () => {
    const startedAt = performance.now();
    setCopyMessage(null);
    await Promise.resolve(onSync());
    setPanelSyncMs(Math.round(performance.now() - startedAt));
  }, [onSync]);

  const handleStartPublicAccess = useCallback(async () => {
    setAccessAction('start');
    setError(null);

    try {
      setPublicAccess(await startPublicAccess());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar el acceso externo.');
    } finally {
      setAccessAction(null);
    }
  }, []);

  const handleStopPublicAccess = useCallback(async () => {
    setAccessAction('stop');
    setError(null);

    try {
      setPublicAccess(await stopPublicAccess());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo detener el acceso externo.');
    } finally {
      setAccessAction(null);
    }
  }, []);

  const handleCopyPublicUrl = useCallback(async () => {
    if (!publicAccess?.publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicAccess.publicUrl);
      setCopyMessage('URL publica copiada.');
    } catch {
      setCopyMessage('No se pudo copiar la URL publica.');
    }
  }, [publicAccess?.publicUrl]);

  const deferredActivity = useDeferredValue(snapshot?.activity ?? []);
  const deferredLogs = useDeferredValue(snapshot?.logs ?? []);
  const previewableDocuments = useMemo(
    () => (snapshot?.documents ?? []).filter((doc) => canPreviewDocument(doc, apiBaseUrl)),
    [snapshot?.documents, apiBaseUrl],
  );

  const roleCards = useMemo(() => {
    const userRoles = currentUser?.roles ?? [];
    return permissionsMatrix.map((role) => ({
      ...role,
      active: userRoles.includes(role.role),
    }));
  }, [currentUser?.roles]);

  const serviceSummary = snapshot?.services ?? [];
  const isBusy = loading || accessAction !== null;
  const publicStatus = publicAccess?.status ?? 'inactive';
  const publicStatusLabel = getPublicStatusLabel(publicStatus);

  const consumptionCards = useMemo(() => {
    const visibleLogsWeight = deferredLogs.reduce((total, log) => (
      total + log.lines.reduce((lineTotal, line) => lineTotal + line.length, 0)
    ), 0);

    return [
      {
        id: 'monitor-request',
        label: 'Latencia monitor',
        value: monitorFetchMs !== null ? `${monitorFetchMs} ms` : 'Pendiente',
        detail: 'Tiempo de carga del snapshot operativo.',
      },
      {
        id: 'panel-sync',
        label: 'Sincronizacion panel',
        value: panelSyncMs !== null ? `${panelSyncMs} ms` : 'Sin medir',
        detail: 'Ultimo refresco manual del portal interno.',
      },
      {
        id: 'log-volume',
        label: 'Carga visible de logs',
        value: `${visibleLogsWeight} chars`,
        detail: 'Volumen textual mostrado en el panel de logs.',
      },
      {
        id: 'panel-state',
        label: 'Ultimo sync panel',
        value: formatDateTime(lastUpdated),
        detail: 'Momento del ultimo refresco de datos visibles.',
      },
    ];
  }, [deferredLogs, lastUpdated, monitorFetchMs, panelSyncMs]);

  const overviewCards = useMemo(() => ([
    {
      id: 'usuario',
      label: 'Sesion privada',
      value: currentUser?.username ?? 'Sin sesion',
      detail: (currentUser?.roles ?? []).join(' · ') || 'Sin roles',
    },
    {
      id: 'public-access',
      label: 'Acceso publico',
      value: publicStatusLabel,
      detail: publicAccess?.publicUrl ?? publicAccess?.targetUrl ?? 'Sin URL',
    },
    {
      id: 'solicitudes',
      label: 'Solicitudes pendientes',
      value: String(pendingSolicitudes),
      detail: 'Pendientes visibles desde el panel interno.',
    },
    {
      id: 'entorno',
      label: 'Entorno',
      value: snapshot?.environment.appEnv ?? 'Cargando',
      detail: `PHP ${snapshot?.environment.phpVersion ?? '...'}`,
    },
  ]), [
    currentUser?.roles,
    currentUser?.username,
    pendingSolicitudes,
    publicAccess?.publicUrl,
    publicAccess?.targetUrl,
    publicStatusLabel,
    snapshot?.environment.appEnv,
    snapshot?.environment.phpVersion,
  ]);

  const localCounts = useMemo(() => {
    if (!collections) {
      return [];
    }

    return [
      { id: 'empresas', label: 'Empresas visibles', value: collections.empresas.length },
      { id: 'convenios', label: 'Convenios visibles', value: collections.convenios.length },
      { id: 'estudiantes', label: 'Estudiantes visibles', value: collections.estudiantes.length },
      { id: 'asignaciones', label: 'Asignaciones visibles', value: collections.asignaciones.length },
    ];
  }, [collections]);

  const openPreview = useCallback((document: MonitorDocumentRecord) => {
    setPreview({
      title: document.name,
      url: document.url,
    });
  }, []);

  return (
    <section className="ops-monitor">
      <header className="ops-monitor__hero">
        <div className="ops-monitor__hero-copy">
          <p className="ops-monitor__eyebrow">Monitor privado</p>
          <h1>Supervision operativa centralizada en una sola pagina.</h1>
          <p>
            Este espacio queda separado del portal interno y del portal externo. Desde aqui controlas el acceso
            publico, revisas servicios, logs, permisos, flujos de trabajo y tiempos de respuesta con una interfaz
            propia y orientada a operacion.
          </p>
        </div>

        <div className="ops-monitor__hero-actions">
          <button type="button" className="button button--primary button--sm" onClick={loadSnapshot} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar monitor'}
          </button>
          <button type="button" className="button button--ghost button--sm" onClick={handlePanelSync} disabled={syncInProgress}>
            {syncInProgress ? 'Sincronizando...' : 'Sincronizar portal'}
          </button>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={handleStartPublicAccess}
            disabled={publicStatus === 'active' || publicStatus === 'starting' || isBusy}
          >
            {accessAction === 'start' ? 'Activando...' : 'Levantar acceso externo'}
          </button>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={handleStopPublicAccess}
            disabled={publicStatus !== 'active' || isBusy}
          >
            {accessAction === 'stop' ? 'Deteniendo...' : 'Bajar acceso externo'}
          </button>
          {publicAccess?.publicUrl && (
            <button type="button" className="button button--ghost button--sm" onClick={handleCopyPublicUrl}>
              Copiar URL
            </button>
          )}
        </div>
      </header>

      {(error || copyMessage) && (
        <div className="ops-monitor__alerts">
          {error && <div className="app__alert app__alert--error">{error}</div>}
          {copyMessage && <div className="app__alert app__alert--info">{copyMessage}</div>}
        </div>
      )}

      <section className="ops-monitor__summary-grid">
        {overviewCards.map((card) => (
          <article key={card.id} className="ops-summary-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <section className="ops-monitor__grid ops-monitor__grid--top">
        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Servicios</p>
              <h2>Estado de componentes</h2>
            </div>
            <small>{formatDateTime(snapshot?.generatedAt ?? null)}</small>
          </header>
          <div className="ops-service-grid">
            {serviceSummary.map((service) => (
              <article key={service.id} className={`ops-service-card ops-service-card--${service.status}`}>
                <div className="ops-service-card__top">
                  <span>{service.name}</span>
                  <strong>{service.status === 'healthy' ? 'OK' : 'Revision'}</strong>
                </div>
                <p>{service.detail}</p>
                {service.target && <code>{service.target}</code>}
              </article>
            ))}
          </div>
        </article>

        <article className="ops-panel ops-panel--accent">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Control de acceso</p>
              <h2>Exposicion publica</h2>
            </div>
            <span className={`ops-status ops-status--${publicStatus}`}>{publicStatusLabel}</span>
          </header>
          <dl className="ops-detail-list">
            <div>
              <dt>Destino local</dt>
              <dd>{publicAccess?.targetUrl ?? 'Sin dato'}</dd>
            </div>
            <div>
              <dt>URL publica</dt>
              <dd>{publicAccess?.publicUrl ?? 'No disponible'}</dd>
            </div>
            <div>
              <dt>Ultimo inicio</dt>
              <dd>{formatDateTime(publicAccess?.startedAt ?? null)}</dd>
            </div>
            <div>
              <dt>Proceso</dt>
              <dd>{publicAccess?.processId ?? 'Sin PID'}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="ops-monitor__grid ops-monitor__grid--middle">
        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Consumo y respuesta</p>
              <h2>Metricas de operacion</h2>
            </div>
          </header>
          <div className="ops-consumption-grid">
            {consumptionCards.map((card) => (
              <article key={card.id} className="ops-consumption-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
              </article>
            ))}
            {localCounts.map((count) => (
              <article key={count.id} className="ops-consumption-card">
                <span>{count.label}</span>
                <strong>{count.value}</strong>
                <small>Dato visible en la sesion actual del portal.</small>
              </article>
            ))}
          </div>
        </article>

        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Permisos</p>
              <h2>Matriz de acceso</h2>
            </div>
          </header>
          <div className="ops-permissions-list">
            {roleCards.map((role) => (
              <article key={role.role} className={`ops-permission-card ${role.active ? 'is-active' : ''}`}>
                <div className="ops-permission-card__top">
                  <strong>{role.label}</strong>
                  <span>{role.role}</span>
                </div>
                <ul>
                  {role.capabilities.map((capability) => (
                    <li key={capability}>{capability}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="ops-panel">
        <header className="ops-panel__header">
          <div>
            <p className="ops-panel__eyebrow">Diagramas funcionales</p>
            <h2>Flujos de trabajo del sistema</h2>
          </div>
        </header>
        <div className="ops-workflow-grid">
          {workflowMaps.map((workflow) => (
            <article key={workflow.id} className="ops-workflow-card">
              <strong>{workflow.title}</strong>
              <div className="ops-workflow-steps">
                {workflow.steps.map((step, index) => (
                  <div key={step} className="ops-workflow-step">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ops-monitor__grid ops-monitor__grid--bottom">
        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Actividad</p>
              <h2>Eventos recientes</h2>
            </div>
          </header>
          <div className="ops-activity-list">
            {deferredActivity.length > 0 ? (
              deferredActivity.map((item) => (
                <article key={item.id} className="ops-activity-item">
                  <div className="ops-activity-item__top">
                    <strong>{item.title}</strong>
                    <small>{formatDateTime(item.timestamp)}</small>
                  </div>
                  <p>{item.description}</p>
                  <span>{item.category}</span>
                </article>
              ))
            ) : (
              <p className="detail-placeholder">No hay actividad reciente para mostrar.</p>
            )}
          </div>
        </article>

        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Logs</p>
              <h2>Lectura rapida</h2>
            </div>
          </header>
          <div className="ops-log-list">
            {deferredLogs.length > 0 ? (
              deferredLogs.map((log) => (
                <article key={log.file} className="ops-log-card">
                  <div className="ops-log-card__top">
                    <strong>{log.file}</strong>
                    <small>{formatDateTime(log.updatedAt)}</small>
                  </div>
                  <pre>{log.lines.join('\n')}</pre>
                </article>
              ))
            ) : (
              <p className="detail-placeholder">No hay logs recientes disponibles.</p>
            )}
          </div>
        </article>
      </section>

      <section className="ops-monitor__grid ops-monitor__grid--bottom">
        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Cobertura</p>
              <h2>Suites de prueba</h2>
            </div>
          </header>
          <div className="ops-suite-list">
            {(snapshot?.tests ?? []).map((suite) => (
              <article key={suite.id} className={`ops-suite-card ops-suite-card--${suite.status}`}>
                <div className="ops-suite-card__top">
                  <div>
                    <strong>{suite.name}</strong>
                    <small>{suite.scope} · {suite.totalFiles} archivos</small>
                  </div>
                  <code>{suite.command}</code>
                </div>
                <div className="ops-chip-list">
                  {suite.focus.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Documentos</p>
              <h2>PDFs previsualizables</h2>
            </div>
          </header>
          <div className="ops-document-list">
            {previewableDocuments.length > 0 ? (
              previewableDocuments.map((document) => (
                <article key={document.id} className="ops-document-card">
                  <div>
                    <strong>{document.name}</strong>
                    <small>{document.sourceLabel} · {formatDateTime(document.uploadedAt)}</small>
                  </div>
                  <button type="button" className="button button--ghost button--sm" onClick={() => openPreview(document)}>
                    Vista previa
                  </button>
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
