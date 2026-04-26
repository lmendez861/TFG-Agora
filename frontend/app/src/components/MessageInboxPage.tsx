import { useMemo } from 'react';
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

function buildInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
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
  const activeAccounts = useMemo(
    () => threads.filter((thread) => thread.portalAccount && !thread.portalAccount.activationPending).length,
    [threads],
  );

  return (
    <section className="module-page module-page--wide">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">Mensajeria</p>
          <h2>Bandeja unificada de empresas</h2>
          <p>
            Esta vista concentra las conversaciones de solicitud, aprobacion y seguimiento en un formato continuo para
            trabajar como una inbox operativa real.
          </p>
        </div>
        <div className="module-page__actions">
          <span className="chip chip--ghost">{threads.length} conversaciones</span>
          <button type="button" className="button button--ghost" onClick={onRefresh} disabled={loadingThreads}>
            {loadingThreads ? 'Actualizando...' : 'Actualizar bandeja'}
          </button>
        </div>
      </header>

      <div className="inbox-layout inbox-layout--discord">
        <aside className="inbox-sidebar">
          <div className="inbox-sidebar__intro">
            <p className="module-page__eyebrow">Centro de mensajes</p>
            <h3>Conversaciones de empresa</h3>
            <p>
              La campana del panel concentra solicitudes y desde aqui se responde el hilo completo cuando ya existe una
              conversacion abierta con la empresa.
            </p>
          </div>

          <div className="inbox-sidebar__stats">
            <article className="inbox-sidebar__stat">
              <span>Hilos</span>
              <strong>{threads.length}</strong>
            </article>
            <article className="inbox-sidebar__stat">
              <span>Cuentas activas</span>
              <strong>{activeAccounts}</strong>
            </article>
          </div>

          <div className="inbox-thread-list">
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
                    <div className="inbox-thread__avatar">{buildInitials(thread.solicitud.nombreEmpresa)}</div>
                    <div className="inbox-thread__content">
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
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="inbox-panel">
          {!selectedThread ? (
            <div className="inbox-empty">
              <h3>Selecciona una conversacion</h3>
              <p>Elige una empresa para consultar el historial y responder desde el centro.</p>
            </div>
          ) : (
            <>
              <header className="inbox-panel__header">
                <div className="inbox-panel__identity">
                  <div className="inbox-panel__avatar">{buildInitials(selectedThread.solicitud.nombreEmpresa)}</div>
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
                </div>
                <div className="inbox-panel__actions">
                  <span className="chip chip--ghost">
                    {SOLICITUD_ESTADO_LABELS[selectedThread.solicitud.estado] ?? selectedThread.solicitud.estado}
                  </span>
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

              <div className="inbox-channel-bar">
                <span># canal-operativo</span>
                <small>Historial completo de coordinacion entre el centro y la empresa.</small>
              </div>

              <div className="inbox-messages">
                {loadingMessagesId === selectedThread.solicitud.id && selectedMessages.length === 0 ? (
                  <p className="detail-placeholder">Cargando mensajes...</p>
                ) : selectedMessages.length === 0 ? (
                  <p className="detail-placeholder">Sin mensajes todavia. Puedes iniciar la conversacion desde aqui.</p>
                ) : (
                  selectedMessages.map((message) => (
                    <article key={message.id} className={`chat-message chat-message--${message.autor}`}>
                      <div className="chat-message__avatar">{message.autor === 'empresa' ? 'EM' : 'CE'}</div>
                      <div className="chat-message__bubble">
                        <div className="chat-message__meta">
                          <strong>{message.autor === 'empresa' ? 'Empresa' : 'Centro educativo'}</strong>
                          <span>{formatTimestamp(message.createdAt)}</span>
                        </div>
                        <p>{message.texto}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="mensaje-form mensaje-form--chat">
                <input
                  type="text"
                  placeholder="Escribe una respuesta operativa para la empresa..."
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
                  {loadingMessagesId === selectedThread.solicitud.id ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
