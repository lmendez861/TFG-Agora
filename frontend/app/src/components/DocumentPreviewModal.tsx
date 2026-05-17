/**
 * Comentario de mantenimiento Agora.
 * Proposito: Componente React: renderiza una parte reutilizable de la interfaz y comunica eventos al contenedor superior.
 * Relaciones: Conecta con modulos locales: ../utils/documents.
 */
import { resolveDocumentUrl } from '../utils/documents';

interface DocumentPreviewModalProps {
  title: string;
  documentUrl: string | null;
  apiBaseUrl: string;
  onClose: () => void;
}

/**
 * Resume la responsabilidad de DocumentPreviewModal dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function DocumentPreviewModal({
  title,
  documentUrl,
  apiBaseUrl,
  onClose,
}: DocumentPreviewModalProps) {
  const resolvedUrl = resolveDocumentUrl(documentUrl, apiBaseUrl);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal modal--document">
        <header className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            x
          </button>
        </header>
        <div className="modal__body document-preview">
          {resolvedUrl ? (
            <iframe
              className="document-preview__frame"
              title={title}
              src={resolvedUrl}
            />
          ) : (
            <p className="detail-placeholder">No hay una URL valida para mostrar el documento.</p>
          )}
        </div>
        <footer className="modal__footer">
          {resolvedUrl && (
            <a
              className="button button--ghost button--sm"
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir en una pestana nueva
            </a>
          )}
          <button type="button" className="button button--primary button--sm" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
