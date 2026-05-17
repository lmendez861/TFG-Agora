/**
 * Comentario de mantenimiento Agora.
 * Proposito: Componente React: renderiza una parte reutilizable de la interfaz y comunica eventos al contenedor superior.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */
import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}

/**
 * Resume la responsabilidad de Modal dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function Modal({ title, children, onClose, footer }: ModalProps) {
  useEffect(() => {
    /**
     * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
     * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <header className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cerrar">
            Ã—
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
