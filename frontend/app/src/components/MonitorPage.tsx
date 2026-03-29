import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type {
  ApiCollections,
  MeResponse,
  MfaStatus,
  MonitorDocumentRecord,
  MonitorOverview,
  PublicAccessSnapshot,
} from '../types';
import {
  fetchMonitorOverview,
  fetchMfaStatus,
  fetchPublicAccessSnapshot,
  requestMfaChallenge,
  startPublicAccess,
  stopPublicAccess,
  verifyMfaCode,
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

type MonitorRouteLink = {
  label: string;
  url: string;
  detail: string;
};

type IncidentRecord = {
  id: string;
  source: string;
  severity: 'error' | 'warning';
  title: string;
  detail: string;
  timestamp: string | null;
};

const permissionsMatrix = [
  {
    role: 'ROLE_ADMIN',
    label: 'Administrador',
    capabilities: ['Gestion total del panel', 'Control de acceso externo', 'Revision de auditoria', 'Acceso transversal a monitor, coordinacion y documentos'],
  },
  {
    role: 'ROLE_COORDINATOR',
    label: 'Coordinacion',
    capabilities: ['Alta y edicion de empresas, convenios y asignaciones', 'Aprobacion y rechazo de solicitudes', 'Gestion de seguimientos y evaluaciones'],
  },
  {
    role: 'ROLE_DOCUMENT_MANAGER',
    label: 'Documentacion',
    capabilities: ['Versionado documental', 'Borrado controlado y restauracion', 'Gestion de evidencias y adjuntos'],
  },
  {
    role: 'ROLE_MONITOR',
    label: 'Monitorizacion',
    capabilities: ['Acceso a monitor privado', 'Control del tunel publico', 'MFA para operaciones sensibles'],
  },
  {
    role: 'ROLE_AUDITOR',
    label: 'Auditoria',
    capabilities: ['Lectura de trazas', 'Revision de actividad sensible', 'Consulta de incidencias y logs'],
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

function buildChallengeSentMessage(
  response: { message?: string; expiresAt?: string },
  destinationEmail?: string | null,
): string {
  const baseMessage = response.message
    ?? (destinationEmail ? `Codigo MFA enviado a ${destinationEmail}.` : 'Codigo MFA enviado.');
  const expiresMessage = response.expiresAt
    ? ` Caduca a las ${formatDateTime(response.expiresAt)}.`
    : '';

  return `${baseMessage}${expiresMessage} El codigo anterior deja de ser valido cuando solicitas uno nuevo.`;
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

function navClassName({ isActive }: { isActive: boolean }): string {
  return `ops-monitor__nav-link${isActive ? ' is-active' : ''}`;
}

function buildIncidentRecords(
  activity: MonitorOverview['activity'],
  logs: MonitorOverview['logs'],
): IncidentRecord[] {
  const incidentPattern = /(error|exception|fatal|critical|warning|incidencia|rechaz)/i;

  const activityIncidents = activity
    .filter((item) => incidentPattern.test(`${item.category} ${item.title} ${item.description}`))
    .map((item) => ({
      id: `activity-${item.id}`,
      source: 'Actividad',
      severity: /(error|exception|fatal|critical|incidencia)/i.test(`${item.category} ${item.title}`)
        ? ('error' as const)
        : ('warning' as const),
      title: item.title,
      detail: item.description,
      timestamp: item.timestamp,
    }));

  const logIncidents = logs.flatMap((log) => (
    log.lines
      .filter((line) => incidentPattern.test(line))
      .slice(-6)
      .map((line, index) => ({
        id: `log-${log.file}-${index}`,
        source: log.file,
        severity: /(error|exception|fatal|critical)/i.test(line)
          ? ('error' as const)
          : ('warning' as const),
        title: /(error|exception|fatal|critical)/i.test(line) ? 'Error detectado en log' : 'Aviso detectado en log',
        detail: line,
        timestamp: log.updatedAt,
      }))
  ));

  return [...activityIncidents, ...logIncidents]
    .sort((left, right) => {
      const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
      const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 12);
}

function SystemsSection({
  generatedAt,
  serviceSummary,
  metricCards,
  localCounts,
  roleCards,
}: {
  generatedAt: string | null;
  serviceSummary: MonitorOverview['services'];
  metricCards: Array<{ id: string; label: string; value: string; detail: string }>;
  localCounts: Array<{ id: string; label: string; value: number }>;
  roleCards: Array<{ role: string; label: string; capabilities: string[]; active: boolean }>;
}) {
  return (
    <>
      <section className="ops-monitor__grid ops-monitor__grid--top">
        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Servicios</p>
              <h2>Estado de componentes</h2>
            </div>
            <small>{formatDateTime(generatedAt)}</small>
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

        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Metricas visibles</p>
              <h2>Respuesta y datos cargados</h2>
            </div>
          </header>
          <div className="ops-consumption-grid">
            {metricCards.map((card) => (
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
      </section>

      <section className="ops-monitor__grid ops-monitor__grid--middle">
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

        <article className="ops-panel">
          <header className="ops-panel__header">
            <div>
              <p className="ops-panel__eyebrow">Diagramas funcionales</p>
              <h2>Flujos de trabajo</h2>
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
        </article>
      </section>
    </>
  );
}

function AccessSection({
  publicAccess,
  publicStatus,
  publicStatusLabel,
  routeLinks,
  mfaStatus,
  mfaCode,
  onMfaCodeChange,
  onRequestChallenge,
  onVerifyCode,
  mfaBusy,
  accessAction,
  onStartPublicAccess,
  onStopPublicAccess,
  onCopyPublicUrl,
}: {
  publicAccess: PublicAccessSnapshot | null;
  publicStatus: PublicAccessSnapshot['status'];
  publicStatusLabel: string;
  routeLinks: MonitorRouteLink[];
  mfaStatus: MfaStatus | null;
  mfaCode: string;
  onMfaCodeChange: (value: string) => void;
  onRequestChallenge: () => void;
  onVerifyCode: () => void;
  mfaBusy: boolean;
  accessAction: 'start' | 'stop' | null;
  onStartPublicAccess: () => void;
  onStopPublicAccess: () => void;
  onCopyPublicUrl: () => void;
}) {
  const isBusy = mfaBusy || accessAction !== null;

  return (
    <section className="ops-monitor__grid ops-monitor__grid--middle">
      <article className="ops-panel ops-panel--accent">
        <header className="ops-panel__header">
          <div>
            <p className="ops-panel__eyebrow">Control de acceso</p>
            <h2>Exposicion publica y URLs</h2>
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
          <div>
            <dt>Detalle</dt>
            <dd>{publicAccess?.detail ?? 'Sin estado adicional'}</dd>
          </div>
          <div>
            <dt>MFA</dt>
            <dd>{mfaStatus?.verified ? 'Verificado' : 'Pendiente'}</dd>
          </div>
        </dl>
        <div className="ops-access-actions">
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={onStartPublicAccess}
            disabled={publicStatus === 'active' || publicStatus === 'starting' || isBusy}
          >
            {accessAction === 'start' ? 'Activando...' : 'Levantar acceso externo'}
          </button>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={onStopPublicAccess}
            disabled={publicStatus !== 'active' || isBusy}
          >
            {accessAction === 'stop' ? 'Deteniendo...' : 'Bajar acceso externo'}
          </button>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={onCopyPublicUrl}
            disabled={!publicAccess?.publicUrl}
          >
            Copiar URL
          </button>
        </div>
        <small className="ops-access-hint">
          Para levantar o bajar el tunel debes verificar antes el codigo MFA enviado al correo de seguridad.
        </small>
      </article>

      <article className="ops-panel">
        <header className="ops-panel__header">
          <div>
            <p className="ops-panel__eyebrow">Accesos directos</p>
            <h2>Entradas del entorno</h2>
          </div>
        </header>
        <div className="ops-route-grid">
          {routeLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="ops-route-card">
              <span>{link.label}</span>
              <strong>{link.url}</strong>
              <small>{link.detail}</small>
            </a>
          ))}
        </div>
        <div className="ops-mfa-box">
          <strong>Segundo factor para operaciones sensibles</strong>
          <p>
            {mfaStatus?.mailReady
              ? `El codigo se envia a ${mfaStatus.destinationEmail}.`
              : 'El correo MFA no esta listo y no podras levantar o bajar acceso externo hasta configurarlo.'}
          </p>
          <div className="ops-mfa-box__actions">
            <button type="button" className="button button--ghost button--sm" onClick={onRequestChallenge} disabled={!mfaStatus?.mailReady || mfaBusy}>
              {mfaBusy ? 'Procesando...' : 'Enviar codigo'}
            </button>
            <input
              value={mfaCode}
              onChange={(event) => onMfaCodeChange(event.target.value)}
              placeholder="Codigo MFA"
              maxLength={12}
            />
            <button type="button" className="button button--primary button--sm" onClick={onVerifyCode} disabled={!mfaCode || mfaBusy}>
              Verificar
            </button>
          </div>
          <small>
            {mfaStatus?.verified
              ? `Verificado hasta ${formatDateTime(mfaStatus.verifiedUntil)}`
              : `Ultimo desafio: ${formatDateTime(mfaStatus?.challengeIssuedAt ?? null)} | Caduca: ${formatDateTime(mfaStatus?.challengeExpiresAt ?? null)}`}
          </small>
        </div>
      </article>
    </section>
  );
}

function LogsSection({
  activity,
  logs,
}: {
  activity: MonitorOverview['activity'];
  logs: MonitorOverview['logs'];
}) {
  return (
    <section className="ops-monitor__grid ops-monitor__grid--bottom">
      <article className="ops-panel">
        <header className="ops-panel__header">
          <div>
            <p className="ops-panel__eyebrow">Actividad</p>
            <h2>Eventos recientes</h2>
          </div>
        </header>
        <div className="ops-activity-list">
          {activity.length > 0 ? (
            activity.map((item) => (
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
            <h2>Lectura operativa</h2>
          </div>
        </header>
        <div className="ops-log-list">
          {logs.length > 0 ? (
            logs.map((log) => (
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
  );
}

function ErrorsSection({
  incidents,
}: {
  incidents: IncidentRecord[];
}) {
  const criticalCount = incidents.filter((item) => item.severity === 'error').length;
  const warningCount = incidents.length - criticalCount;

  return (
    <section className="ops-monitor__grid ops-monitor__grid--middle">
      <article className="ops-panel">
        <header className="ops-panel__header">
          <div>
            <p className="ops-panel__eyebrow">Incidencias</p>
            <h2>Errores y alertas relevantes</h2>
          </div>
          <span className={`ops-status ops-status--${criticalCount > 0 ? 'error' : 'starting'}`}>
            {criticalCount > 0 ? `${criticalCount} criticas` : `${warningCount} avisos`}
          </span>
        </header>
        <div className="ops-activity-list">
          {incidents.length > 0 ? (
            incidents.map((incident) => (
              <article key={incident.id} className="ops-activity-item">
                <div className="ops-activity-item__top">
                  <strong>{incident.title}</strong>
                  <small>{formatDateTime(incident.timestamp)}</small>
                </div>
                <p>{incident.detail}</p>
                <span>{incident.source}</span>
              </article>
            ))
          ) : (
            <p className="detail-placeholder">No se han detectado incidencias destacables en la lectura actual.</p>
          )}
        </div>
      </article>

      <article className="ops-panel">
        <header className="ops-panel__header">
          <div>
            <p className="ops-panel__eyebrow">Respuesta operativa</p>
            <h2>Prioridades de revision</h2>
          </div>
        </header>
        <div className="ops-suite-list">
          <article className="ops-suite-card ops-suite-card--healthy">
            <div className="ops-suite-card__top">
              <div>
                <strong>Servicios y acceso</strong>
                <small>Revisar el estado de Symfony, el entorno activo y las URLs expuestas.</small>
              </div>
              <code>/monitor/sistemas | /monitor/acceso</code>
            </div>
          </article>
          <article className={`ops-suite-card ops-suite-card--${criticalCount > 0 ? 'warning' : 'healthy'}`}>
            <div className="ops-suite-card__top">
              <div>
                <strong>Lectura de errores</strong>
                <small>Priorizar entradas con error o exception y confirmar su hora de aparicion.</small>
              </div>
              <code>{criticalCount} errores | {warningCount} avisos</code>
            </div>
          </article>
          <article className="ops-suite-card ops-suite-card--healthy">
            <div className="ops-suite-card__top">
              <div>
                <strong>Validacion final</strong>
                <small>Usar la seccion de calidad para revisar pruebas, PDFs y trazabilidad documental.</small>
              </div>
              <code>/monitor/calidad</code>
            </div>
          </article>
        </div>
      </article>
    </section>
  );
}

function QualitySection({
  tests,
  previewableDocuments,
  onOpenPreview,
}: {
  tests: MonitorOverview['tests'];
  previewableDocuments: MonitorDocumentRecord[];
  onOpenPreview: (document: MonitorDocumentRecord) => void;
}) {
  return (
    <section className="ops-monitor__grid ops-monitor__grid--bottom">
      <article className="ops-panel">
        <header className="ops-panel__header">
          <div>
            <p className="ops-panel__eyebrow">Cobertura</p>
            <h2>Suites de prueba</h2>
          </div>
        </header>
        <div className="ops-suite-list">
          {tests.map((suite) => (
            <article key={suite.id} className={`ops-suite-card ops-suite-card--${suite.status}`}>
              <div className="ops-suite-card__top">
                <div>
                  <strong>{suite.name}</strong>
                  <small>{suite.scope} | {suite.totalFiles} archivos</small>
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
                  <small>{document.sourceLabel} | {formatDateTime(document.uploadedAt)}</small>
                </div>
                <button type="button" className="button button--ghost button--sm" onClick={() => onOpenPreview(document)}>
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
  );
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
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessAction, setAccessAction] = useState<'start' | 'stop' | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
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
      const [overview, access, mfa] = await Promise.all([
        fetchMonitorOverview(),
        fetchPublicAccessSnapshot(),
        fetchMfaStatus(),
      ]);

      startTransition(() => {
        setSnapshot(overview);
        setPublicAccess(access);
        setMfaStatus(mfa);
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
      // Errores gestionados dentro de loadSnapshot.
    });
  }, [loadSnapshot]);

  const handlePanelSync = useCallback(async () => {
    const startedAt = performance.now();
    setCopyMessage(null);
    await Promise.resolve(onSync());
    setPanelSyncMs(Math.round(performance.now() - startedAt));
  }, [onSync]);

  const handleStartPublicAccess = useCallback(async () => {
    if (!mfaStatus?.verified) {
      setMfaBusy(true);
      setError(null);

      try {
        const response = await requestMfaChallenge();
        setCopyMessage(buildChallengeSentMessage(response, mfaStatus?.destinationEmail));
        setMfaStatus(await fetchMfaStatus());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo emitir el codigo MFA.');
      } finally {
        setMfaBusy(false);
      }
      return;
    }

    setAccessAction('start');
    setError(null);

    try {
      setPublicAccess(await startPublicAccess());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar el acceso externo.');
    } finally {
      setAccessAction(null);
    }
  }, [mfaStatus?.destinationEmail, mfaStatus?.verified]);

  const handleRequestMfaChallenge = useCallback(async () => {
    setMfaBusy(true);
    setError(null);

    try {
      const response = await requestMfaChallenge();
      setCopyMessage(buildChallengeSentMessage(response, mfaStatus?.destinationEmail));
      setMfaStatus(await fetchMfaStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo emitir el codigo MFA.');
    } finally {
      setMfaBusy(false);
    }
  }, [mfaStatus?.destinationEmail]);

  const handleVerifyMfa = useCallback(async () => {
    if (!mfaCode.trim()) {
      return;
    }

    setMfaBusy(true);
    setError(null);

    try {
      const response = await verifyMfaCode(mfaCode.trim());
      setMfaStatus(response.status);
      setCopyMessage(response.message);
      setMfaCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el codigo MFA.');
    } finally {
      setMfaBusy(false);
    }
  }, [mfaCode]);

  const handleStopPublicAccess = useCallback(async () => {
    if (!mfaStatus?.verified) {
      setMfaBusy(true);
      setError(null);

      try {
        const response = await requestMfaChallenge();
        setCopyMessage(buildChallengeSentMessage(response, mfaStatus?.destinationEmail));
        setMfaStatus(await fetchMfaStatus());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo emitir el codigo MFA.');
      } finally {
        setMfaBusy(false);
      }
      return;
    }

    setAccessAction('stop');
    setError(null);

    try {
      setPublicAccess(await stopPublicAccess());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo detener el acceso externo.');
    } finally {
      setAccessAction(null);
    }
  }, [mfaStatus?.destinationEmail, mfaStatus?.verified]);

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
  const incidents = useMemo(
    () => buildIncidentRecords(deferredActivity, deferredLogs),
    [deferredActivity, deferredLogs],
  );

  const roleCards = useMemo(() => {
    const userRoles = currentUser?.roles ?? [];
    return permissionsMatrix.map((role) => ({
      ...role,
      active: userRoles.includes(role.role),
    }));
  }, [currentUser?.roles]);

  const publicStatus = publicAccess?.status ?? 'inactive';
  const publicStatusLabel = getPublicStatusLabel(publicStatus);
  const isBusy = loading || accessAction !== null;

  const overviewCards = useMemo(() => ([
    {
      id: 'usuario',
      label: 'Sesion privada',
      value: currentUser?.username ?? 'Sin sesion',
      detail: (currentUser?.roles ?? []).join(' | ') || 'Sin roles',
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
      id: 'incidencias',
      label: 'Incidencias detectadas',
      value: String(incidents.length),
      detail: 'Eventos y trazas relevantes para revision operativa.',
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
    incidents.length,
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

  const metricCards = useMemo(() => {
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
        detail: 'Volumen textual mostrado en lectura rapida.',
      },
      {
        id: 'panel-state',
        label: 'Ultimo sync panel',
        value: formatDateTime(lastUpdated),
        detail: 'Momento del ultimo refresco de datos visibles.',
      },
      ...(snapshot?.metrics ?? []).map((metric) => ({
        id: metric.id,
        label: metric.label,
        value: String(metric.value),
        detail: metric.hint,
      })),
    ];
  }, [deferredLogs, lastUpdated, monitorFetchMs, panelSyncMs, snapshot?.metrics]);

  const routeLinks = useMemo(() => {
    const origin = typeof window === 'undefined' ? 'http://127.0.0.1:8000' : window.location.origin;
    const links: MonitorRouteLink[] = [
      {
        label: 'Portal interno',
        url: `${origin}/app`,
        detail: 'Entrada principal de gestion academica.',
      },
      {
        label: 'Portal externo',
        url: `${origin}/externo`,
        detail: 'Registro y seguimiento de empresas.',
      },
      {
        label: 'Documentacion',
        url: `${origin}/documentacion`,
        detail: 'Memoria, anexos y soporte academico.',
      },
      {
        label: 'Monitor privado',
        url: `${origin}/monitor`,
        detail: 'Shell privada de supervision tecnica.',
      },
    ];

    if (publicAccess?.publicUrl) {
      links.push({
        label: 'URL publica',
        url: publicAccess.publicUrl,
        detail: 'Acceso externo publicado bajo demanda desde este monitor.',
      });
    }

    return links;
  }, [publicAccess?.publicUrl]);

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
          <h1>Supervision operativa separada del portal funcional.</h1>
          <p>
            Esta consola agrupa estado de servicios, acceso publico, trazas, pruebas, documentos y enlaces operativos
            en una shell propia con navegacion por secciones.
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

      <div className="ops-monitor__layout">
        <aside className="ops-monitor__sidebar">
          <div className="ops-monitor__sidebar-card">
            <p className="ops-panel__eyebrow">Navegacion</p>
            <nav className="ops-monitor__nav">
              <NavLink to="sistemas" className={navClassName}>
                Sistemas
              </NavLink>
              <NavLink to="acceso" className={navClassName}>
                Acceso y URLs
              </NavLink>
              <NavLink to="logs" className={navClassName}>
                Logs y actividad
              </NavLink>
              <NavLink to="errores" className={navClassName}>
                Errores
              </NavLink>
              <NavLink to="calidad" className={navClassName}>
                Calidad y documentos
              </NavLink>
            </nav>
          </div>

          <div className="ops-monitor__sidebar-card">
            <p className="ops-panel__eyebrow">Contexto</p>
            <ul className="ops-monitor__sidebar-list">
              <li>Generado: {formatDateTime(snapshot?.generatedAt ?? null)}</li>
              <li>Debug: {snapshot?.environment.debug ? 'Activo' : 'Desactivado'}</li>
              <li>Timezone: {snapshot?.environment.timezone ?? 'Sin dato'}</li>
              <li>Solicitudes visibles: {pendingSolicitudes}</li>
            </ul>
          </div>
        </aside>

        <div className="ops-monitor__content">
          <Routes>
            <Route index element={<Navigate to="sistemas" replace />} />
            <Route
              path="sistemas"
              element={(
                <SystemsSection
                  generatedAt={snapshot?.generatedAt ?? null}
                  serviceSummary={snapshot?.services ?? []}
                  metricCards={metricCards}
                  localCounts={localCounts}
                  roleCards={roleCards}
                />
              )}
            />
            <Route
              path="acceso"
              element={(
                <AccessSection
                  publicAccess={publicAccess}
                  publicStatus={publicStatus}
                  publicStatusLabel={publicStatusLabel}
                  routeLinks={routeLinks}
                  mfaStatus={mfaStatus}
                  mfaCode={mfaCode}
                  onMfaCodeChange={setMfaCode}
                  onRequestChallenge={() => { void handleRequestMfaChallenge(); }}
                  onVerifyCode={() => { void handleVerifyMfa(); }}
                  mfaBusy={mfaBusy}
                  accessAction={accessAction}
                  onStartPublicAccess={() => { void handleStartPublicAccess(); }}
                  onStopPublicAccess={() => { void handleStopPublicAccess(); }}
                  onCopyPublicUrl={() => { void handleCopyPublicUrl(); }}
                />
              )}
            />
            <Route
              path="logs"
              element={<LogsSection activity={deferredActivity} logs={deferredLogs} />}
            />
            <Route
              path="errores"
              element={<ErrorsSection incidents={incidents} />}
            />
            <Route
              path="calidad"
              element={(
                <QualitySection
                  tests={snapshot?.tests ?? []}
                  previewableDocuments={previewableDocuments}
                  onOpenPreview={openPreview}
                />
              )}
            />
            <Route path="*" element={<Navigate to="sistemas" replace />} />
          </Routes>
        </div>
      </div>

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
