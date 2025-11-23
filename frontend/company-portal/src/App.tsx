import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import './App.css'

type SolicitudPayload = {
  nombreEmpresa: string
  sector?: string
  ciudad?: string
  web?: string
  descripcion?: string
  contactoNombre: string
  contactoEmail: string
  contactoTelefono?: string
}

type ChatMessage = {
  id: string
  author: 'empresa' | 'centro'
  text: string
  createdAt: Date
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8000'
const REGISTRO_ENDPOINT = `${API_BASE.replace(/\/$/, '')}/registro-empresa`

const HERO_LINKS = [
  { href: '#registro', label: 'Formulario' },
  { href: '/inbox', label: 'Bandeja de verificacion' },
  { href: '/chat', label: 'Chat empresa-centro' },
]

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Link to="/" className="brand__title">Agora · Portal Empresas</Link>
          <span className="brand__badge">Externo</span>
        </div>
        <nav className="nav">
          {HERO_LINKS.map((item) => (
            item.href.startsWith('#') ? (
              <a key={item.label} href={item.href} className="nav__link">{item.label}</a>
            ) : (
              <Link key={item.label} to={item.href} className="nav__link">{item.label}</Link>
            )
          ))}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <p>© Agora · Portal de colaboraciones</p>
        <small>Los datos se envían a {REGISTRO_ENDPOINT}</small>
      </footer>
    </div>
  )
}

function LandingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const [payload, setPayload] = useState<SolicitudPayload>({
    nombreEmpresa: '',
    sector: '',
    ciudad: '',
    web: '',
    descripcion: '',
    contactoNombre: '',
    contactoEmail: '',
    contactoTelefono: '',
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    setLoading(true)
    try {
      const response = await fetch(REGISTRO_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreEmpresa: payload.nombreEmpresa,
          sector: payload.sector || undefined,
          ciudad: payload.ciudad || undefined,
          web: payload.web || undefined,
          descripcion: payload.descripcion || undefined,
          contactoNombre: payload.contactoNombre,
          contactoEmail: payload.contactoEmail,
          contactoTelefono: payload.contactoTelefono || undefined,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => undefined)
        throw new Error(data?.message || `Error ${response.status}`)
      }
      setStatus({ kind: 'success', message: 'Solicitud enviada. Revisa tu correo y sigue el enlace de verificacion.' })
      setPayload({
        nombreEmpresa: '',
        sector: '',
        ciudad: '',
        web: '',
        descripcion: '',
        contactoNombre: '',
        contactoEmail: '',
        contactoTelefono: '',
      })
      navigate('/inbox?enviada=1')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar la solicitud.'
      setStatus({ kind: 'error', message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Bienvenida</p>
          <h1>Colabora con nuestro centro educativo</h1>
          <p className="lede">
            Registra tu empresa, verifica el correo corporativo y habilita un canal directo de comunicación con el
            centro para convenios y asignaciones.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#registro">Solicitar colaboracion</a>
            <Link className="btn btn--ghost" to="/chat">Abrir chat</Link>
          </div>
        </div>
        <div className="hero__panel">
          <p className="hero__panel-title">Pasos rapidos</p>
          <ol>
            <li>Completa el formulario con datos de la empresa y contacto.</li>
            <li>Confirma el correo desde la bandeja de verificacion.</li>
            <li>El centro aprueba la solicitud y abre el portal colaborativo.</li>
          </ol>
        </div>
      </section>

      <section className="panel" id="registro">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Solicitud online</p>
            <h2>Registrar mi empresa</h2>
            <p>Usa un correo corporativo para agilizar la validacion.</p>
          </div>
          <div className="panel__meta">
            <span className="chip">API</span>
            <code>{REGISTRO_ENDPOINT}</code>
          </div>
        </div>

        {status && (
          <div className={`alert alert--${status.kind}`}>
            {status.message}
          </div>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Nombre de la empresa*</span>
            <input
              required
              value={payload.nombreEmpresa}
              onChange={(e) => setPayload((p) => ({ ...p, nombreEmpresa: e.target.value }))}
            />
          </label>
          <label>
            <span>Sector</span>
            <input value={payload.sector} onChange={(e) => setPayload((p) => ({ ...p, sector: e.target.value }))} />
          </label>
          <label>
            <span>Ciudad</span>
            <input value={payload.ciudad} onChange={(e) => setPayload((p) => ({ ...p, ciudad: e.target.value }))} />
          </label>
          <label>
            <span>Web</span>
            <input
              value={payload.web}
              onChange={(e) => setPayload((p) => ({ ...p, web: e.target.value }))}
              type="url"
              placeholder="https://example.com"
            />
          </label>
          <label className="full-row">
            <span>Descripcion</span>
            <textarea
              rows={3}
              value={payload.descripcion}
              onChange={(e) => setPayload((p) => ({ ...p, descripcion: e.target.value }))}
              placeholder="Cuentanos que perfiles buscas, duracion, objetivos..."
            />
          </label>
          <fieldset className="full-row">
            <legend>Persona de contacto</legend>
            <div className="form-grid">
              <label>
                <span>Nombre completo*</span>
                <input
                  required
                  value={payload.contactoNombre}
                  onChange={(e) => setPayload((p) => ({ ...p, contactoNombre: e.target.value }))}
                />
              </label>
              <label>
                <span>Email corporativo*</span>
                <input
                  required
                  type="email"
                  value={payload.contactoEmail}
                  onChange={(e) => setPayload((p) => ({ ...p, contactoEmail: e.target.value }))}
                />
              </label>
              <label>
                <span>Telefono</span>
                <input
                  value={payload.contactoTelefono}
                  onChange={(e) => setPayload((p) => ({ ...p, contactoTelefono: e.target.value }))}
                />
              </label>
            </div>
          </fieldset>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
            <p className="form__hint">Recibiras un correo con el enlace de verificacion.</p>
          </div>
        </form>
      </section>
    </div>
  )
}

function InboxPage() {
  const query = useQuery()
  const enviada = query.get('enviada') === '1'
  const verificationLink = `${API_BASE.replace(/\/$/, '')}/registro-empresa/confirmar?token=TU_TOKEN`
  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Bandeja</p>
            <h2>Verificacion por correo</h2>
            <p>Revisa el enlace enviado al email corporativo. Este es un ejemplo de mensaje.</p>
          </div>
        </div>
        {enviada && <div className="alert alert--success">Solicitud enviada. Ya puedes revisar el correo.</div>}
        <article className="mail-card">
          <header>
            <div>
              <p className="eyebrow">Centro educativo</p>
              <h3>Confirma tu registro</h3>
            </div>
            <span className="chip">Verificacion</span>
          </header>
          <p>Hola, hemos recibido tu solicitud. Pulsa en el enlace para confirmar tu correo.</p>
          <a className="link" href={verificationLink} target="_blank" rel="noreferrer">{verificationLink}</a>
          <p className="mail-card__hint">Tras confirmar, el equipo aprobará o rechazará tu solicitud desde el panel interno.</p>
        </article>
      </section>
    </div>
  )
}

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', author: 'centro', text: 'Hola, hemos recibido tu solicitud.', createdAt: new Date() },
    { id: '2', author: 'empresa', text: 'Gracias, acabamos de confirmar el correo.', createdAt: new Date() },
  ])
  const [draft, setDraft] = useState('')

  const sendMessage = () => {
    if (!draft.trim()) return
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), author: 'empresa', text: draft.trim(), createdAt: new Date() }])
    setDraft('')
  }

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Canal</p>
            <h2>Chat empresa - centro</h2>
            <p>Usa este canal para resolver dudas mientras se aprueba la solicitud.</p>
          </div>
        </div>
        <div className="chat">
          <div className="chat__messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat__bubble chat__bubble--${msg.author}`}>
                <p>{msg.text}</p>
                <small>{msg.author === 'empresa' ? 'Tú' : 'Centro'} · {msg.createdAt.toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
          <div className="chat__input">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un mensaje para el centro..."
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
            />
            <button type="button" className="btn btn--primary" onClick={sendMessage}>Enviar</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </Layout>
  )
}

export default App
