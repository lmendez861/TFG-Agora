/**
 * Comentario de mantenimiento Agora.
 * Proposito: Modulo de codigo del proyecto Agora.
 * Relaciones: Conecta con modulos locales: ./App.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const container = document.getElementById('root');
const defaultBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const pathname = typeof window === 'undefined' ? defaultBase : window.location.pathname;
const routerBase = pathname === '/documentacion' || pathname.startsWith('/documentacion/')
    ? '/documentacion'
  : defaultBase;

if (!container) {
  throw new Error('No se encontro el contenedor raiz de la aplicacion.');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={routerBase || undefined}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
