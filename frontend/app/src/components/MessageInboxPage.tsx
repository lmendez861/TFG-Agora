import type { EmpresaInboxThread, EmpresaSolicitudMensaje } from '../types';

interface MessageInboxPageProps {
  threads: EmpresaInboxThread[];
  selectedSolicitudId: number | null;
  messagesBySolicitud: Record<number, EmpresaSolicitudMensaje[]>;
  draftBySolicitud: Record<number, string>;
  loadingThreads: boolean;
  loadingMessagesId: number | null;
  onRefresh: () => void;
  onSelectThread: (solicitudId: number) => void;
  onDraftChange: (solicitudId: number, value: string) => void;
  onSend: (solicitudId: number) => void;
  onOpenSolicitud: (solicitudId: number) => void;
}

const SOLICITUD_ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  email_verificado: 'Correo verificado',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'Sin actividad';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSnippet(thread: EmpresaInboxThread): string {
  if (thread.lastMessage?.texto) {
    return thread.lastMessage.texto;
  }

  if (thread.solicitud.motivoRechazo) {
    return `Motivo de rechazo: ${thread.solicitud.motivoRechazo}`;
  }

  return 'Sin mensajes todavia. El centro puede iniciar el hilo desde esta bandeja.';
}

export function MessageInboxPage({
  threads,
  selectedSolicitudId,
  messagesBySolicitud,
  draftBySolicitud,
  loadingThreads,
  loadingMessagesId,
  onRefresh,
  onSelectThread,
  onDraftChange,
  onSend,
  onOpenSolicitud,
}: MessageInboxPageProps) {
  const selectedThread = threads.find((thread) => thread.solicitud.id === selectedSolicitudId) ?? null;
  const selectedMessages = selectedThread ? (messagesBySolicitud[selectedThread.solicitud.id] ?? []) : [];

  return (
    <section className="module-page module-page--wide">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">Mensajeria</p>
          <h2>Bandeja unificada de empresas</h2>
          <p>Centraliza el hilo de cada solicitud, tanto antes como despues de la aprobacion de la cuenta empresa.</p>
        </div>
        <div className="module-page__actions">
          <span className="chip chip--ghost">{threads.length} conversaciones</span>
          <button type="button" className="button button--ghost" onClick={onRefresh} disabled={loadingThreads}>
            {loadingThreads ? 'Actualizando...' : 'Actualizar bandeja'}
          </button>
        </div>
      </header>

      <div className="inbox-layout">
        <aside className="inbox-sidebar">
          {loadingThreads && threads.length === 0 ? (
            <p className="detail-placeholder">Cargando conversaciones...</p>
          ) : threads.length === 0 ? (
            <p className="detail-placeholder">Todavia no hay hilos disponibles.</p>
          ) : (
            threads.map((thread) => {
              const isActive = selectedSolicitudId === thread.solicitud.id;
              const snippet = buildSnippet(thread);

              return (
                <button
                  key={thread.solicitud.id}
                  type="button"
                  className={`inbox-thread${isActive ? ' is-active' : ''}`}
                  onClick={() => onSelectThread(thread.solicitud.id)}
                >
                  <div className="inbox-thread__top">
                    <strong>{thread.solicitud.nombreEmpresa}</strong>
                    <span>{thread.messageCount} msg</span>
                  </div>
                  <p className="inbox-thread__meta">
                    {SOLICITUD_ESTADO_LABELS[thread.solicitud.estado] ?? thread.solicitud.estado}
                    {' | '}
                    {thread.solicitud.contacto.email}
                  </p>
                  <p className="inbox-thread__snippet">{snippet}</p>
                  <small>{formatTimestamp(thread.activityAt)}</small>
                </button>
              );
            })
          )}
        </aside>

        <div className="inbox-panel">
          {!selectedThread ? (
            <div className="inbox-empty">
              <h3>Selecciona una conversacion</h3>
              <p>Elige una empresa de la lista para consultar el historial y responder desde el centro.</p>
            </div>
          ) : (
            <>
              <header className="inbox-panel__header">
                <div>
                  <p className="module-page__eyebrow">Solicitud #{selectedThread.solicitud.id}</p>
                  <h3>{selectedThread.solicitud.nombreEmpresa}</h3>
                  <p>
                    {selectedThread.solicitud.contacto.nombre}
                    {' | '}
                    {selectedThread.solicitud.contacto.email}
                    {selectedThread.solicitud.contacto.telefono ? ` | ${selectedThread.solicitud.contacto.telefono}` : ''}
                  </p>
                </div>
                <div className="inbox-panel__actions">
                  {selectedThread.portalAccount && (
                    <span className="chip chip--ghost">
                      {selectedThread.portalAccount.activationPending ? 'Cuenta pendiente' : 'Cuenta activa'}
                    </span>
                  )}
                  <button
                    type="button"
                    className="button button--ghost button--sm"
                    onClick={() => onOpenSolicitud(selectedThread.solicitud.id)}
                  >
                    Abrir solicitud
                  </button>
                </div>
              </header>

              <div className="inbox-panel__summary">
                <article className="surface-card">
                  <span>Total mensajes</span>
                  <strong>{selectedThread.messageCount}</strong>
                  <small>Actividad acumulada del hilo</small>
                </article>
                <article className="surface-card">
                  <span>Empresa</span>
                  <strong>{selectedThread.companyMessageCount}</strong>
                  <small>Mensajes emitidos por la empresa</small>
                </article>
                <article className="surface-card">
                  <span>Centro</span>
                  <strong>{selectedThread.centerMessageCount}</strong>
                  <small>Respuestas registradas por el equipo interno</small>
                </article>
              </div>

              <div className="inbox-messages">
                {loadingMessagesId === selectedThread.solicitud.id && selectedMessages.length === 0 ? (
                  <p className="detail-placeholder">Cargando mensajes...</p>
                ) : selectedMessages.length === 0 ? (
                  <p className="detail-placeholder">Sin mensajes todavia. Puedes iniciar la conversacion desde aqui.</p>
                ) : (
                  selectedMessages.map((message) => (
                    <div key={message.id} className={`mensaje mensaje--${message.autor}`}>
                      <p>{message.texto}</p>
                      <small>
                        {message.autor === 'empresa' ? 'Empresa' : 'Centro'}
                        {' | '}
                        {formatTimestamp(message.createdAt)}
                      </small>
                    </div>
                  ))
                )}
              </div>

              <div className="mensaje-form mensaje-form--inline">
                <input
                  type="text"
                  placeholder="Escribe una respuesta para la empresa..."
                  value={draftBySolicitud[selectedThread.solicitud.id] ?? ''}
                  onChange={(event) => onDraftChange(selectedThread.solicitud.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onSend(selectedThread.solicitud.id);
                    }
                  }}
                />
                <button
                  type="button"
                  className="button button--primary button--sm"
                  onClick={() => onSend(selectedThread.solicitud.id)}
                  disabled={loadingMessagesId === selectedThread.solicitud.id}
                >
                  {loadingMessagesId === selectedThread.solicitud.id ? 'Enviando...' : 'Enviar respuesta'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
