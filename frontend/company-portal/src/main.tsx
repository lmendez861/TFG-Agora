/**
 * Comentario de mantenimiento Agora.
 * Proposito: Modulo de codigo del proyecto Agora.
 * Relaciones: Conecta con modulos locales: ./App.tsx.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBase || undefined}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
