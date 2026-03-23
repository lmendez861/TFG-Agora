import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

type SolicitudPayload = {
  nombreEmpresa: string;
  sector?: string;
  ciudad?: string;
  web?: string;
  descripcion?: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono?: string;
};

type ChatMessage = {
  id: number | string;
  author: 'empresa' | 'centro';
  text: string;
  createdAt: string;
};

type MetricCard = {
  label: string;
  value: string;
  detail: string;
};

type CapabilityCard = {
  title: string;
  detail: string;
};

type ProcessStep = {
  title: string;
  detail: string;
};

function resolveDefaultApiBase(): string {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000';
  }

  if (import.meta.env.DEV) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }

  return window.location.origin;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || resolveDefaultApiBase();
const REGISTRO_ENDPOINT = `${API_BASE.replace(/\/$/, '')}/registro-empresa`;
const PORTAL_BASE = `${API_BASE.replace(/\/$/, '')}/portal/solicitudes`;

const HERO_LINKS = [
  { href: '#registro', label: 'Formulario' },
  { href: '/inbox', label: 'Bandeja' },
  { href: '/verificar', label: 'Verificacion' },
  { href: '/chat', label: 'Mensajeria' },
];

const IMPACT_METRICS: MetricCard[] = [
  {
    label: 'Alta guiada',
    value: '1 flujo',
    detail: 'Registro, verificacion y seguimiento en un mismo recorrido.',
  },
  {
    label: 'Canal directo',
    value: 'Chat',
    detail: 'Mensajeria asociada a la solicitud cuando el enlace esta validado.',
  },
  {
    label: 'Revision interna',
    value: 'Centralizada',
    detail: 'La solicitud pasa al panel interno sin duplicar informacion.',
  },
];

const CAPABILITIES: CapabilityCard[] = [
  {
    title: 'Registro corporativo',
    detail: 'La empresa presenta su solicitud con datos estructurados y contacto principal verificado.',
  },
  {
    title: 'Correo de validacion',
    detail: 'El backend emite un enlace de verificacion para confirmar la direccion corporativa.',
  },
  {
    title: 'Seguimiento continuo',
    detail: 'El centro y la empresa comparten contexto desde un canal asociado a la solicitud.',
  },
];

const PROCESS_STEPS: ProcessStep[] = [
  {
    title: '1. Registro inicial',
    detail: 'La empresa envía sus datos, ambito de colaboracion y persona de contacto.',
  },
  {
    title: '2. Verificacion de correo',
    detail: 'El sistema remite un enlace temporal para validar la cuenta corporativa.',
  },
  {
    title: '3. Revision del centro',
    detail: 'El portal interno recibe la solicitud para su aprobacion o rechazo.',
  },
  {
    title: '4. Canal operativo',
    detail: 'Tras la validacion, la empresa dispone de un canal de comunicacion vinculado.',
  },
];

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Link to="/" className="brand__title">Agora Empresas</Link>
          <span className="brand__badge">Portal externo</span>
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
        <p>Agora | Portal de relacion empresa-centro</p>
        <small>Endpoint operativo: {REGISTRO_ENDPOINT}</small>
      </footer>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [payload, setPayload] = useState<SolicitudPayload>({
    nombreEmpresa: '',
    sector: '',
    ciudad: '',
    web: '',
    descripcion: '',
    contactoNombre: '',
    contactoEmail: '',
    contactoTelefono: '',
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

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
      });

      if (!response.ok) {
        const data = await response.json().catch(() => undefined);
        throw new Error(data?.message || `Error ${response.status}`);
      }

      setStatus({ kind: 'success', message: 'Solicitud enviada. Revisa tu correo y sigue el enlace de verificacion.' });
      setPayload({
        nombreEmpresa: '',
        sector: '',
        ciudad: '',
        web: '',
        descripcion: '',
        contactoNombre: '',
        contactoEmail: '',
        contactoTelefono: '',
      });
      navigate('/inbox?enviada=1');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar la solicitud.';
      setStatus({ kind: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <section className="hero hero--landing">
        <div className="hero__copy">
          <p className="eyebrow">Portal externo para empresas</p>
          <h1>Registra tu organizacion, valida el correo corporativo y abre un canal directo con el centro.</h1>
          <p className="lede">
            Agora unifica el alta de colaboraciones, la verificacion de identidad y el seguimiento de solicitudes
            en una experiencia clara para empresas interesadas en practicas, convenios y nuevas incorporaciones.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#registro">Solicitar colaboracion</a>
            <Link className="btn btn--ghost" to="/inbox">Ver flujo de verificacion</Link>
          </div>

          <div className="metric-grid">
            {IMPACT_METRICS.map((metric) => (
              <article key={metric.label} className="metric-card">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </article>
            ))}
          </div>
        </div>

        <aside className="hero__rail">
          <div className="hero__rail-card">
            <p className="eyebrow">Ruta operativa</p>
            <h2>Todo el ciclo en un solo recorrido.</h2>
            <ul className="rail-list">
              <li>Alta de empresa con datos estructurados.</li>
              <li>Correo de verificacion emitido por backend.</li>
              <li>Revision y aprobacion desde el portal interno.</li>
              <li>Mensajeria vinculada a la solicitud.</li>
            </ul>
          </div>
          <div className="hero__rail-card hero__rail-card--soft">
            <span className="eyebrow">Integracion</span>
            <strong>Sin duplicar informacion entre portales.</strong>
            <p>La solicitud entra una vez y se transforma en flujo operativo para el equipo interno.</p>
          </div>
        </aside>
      </section>

      <section className="section-grid">
        {CAPABILITIES.map((card) => (
          <article key={card.title} className="surface-card">
            <p className="eyebrow">Capacidad</p>
            <h3>{card.title}</h3>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel panel--soft">
          <header className="panel__header">
            <div>
              <p className="eyebrow">Proceso</p>
              <h2>Como entra una empresa en el circuito</h2>
            </div>
            <span className="chip">Portal a portal</span>
          </header>

          <div className="timeline">
            {PROCESS_STEPS.map((step) => (
              <article key={step.title} className="timeline__item">
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel panel--dark">
          <header className="panel__header">
            <div>
              <p className="eyebrow">Garantias operativas</p>
              <h2>Lo que ve la empresa</h2>
            </div>
          </header>
          <ul className="feature-list">
            <li>Formulario claro para contacto y descripcion de la colaboracion.</li>
            <li>Bandeja explicativa para el enlace de verificacion.</li>
            <li>Pagina de validacion del token de correo.</li>
            <li>Canal de mensajeria cuando existe acceso autorizado.</li>
          </ul>
        </article>
      </section>

      <section className="panel" id="registro">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Solicitud online</p>
            <h2>Registrar mi empresa</h2>
            <p>Usa un correo corporativo para agilizar la validacion y reducir incidencias.</p>
          </div>
          <div className="panel__meta">
            <span className="chip">Registro seguro</span>
            <code>Validacion por correo corporativo</code>
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
              onChange={(e) => setPayload((current) => ({ ...current, nombreEmpresa: e.target.value }))}
            />
          </label>
          <label>
            <span>Sector</span>
            <input value={payload.sector} onChange={(e) => setPayload((current) => ({ ...current, sector: e.target.value }))} />
          </label>
          <label>
            <span>Ciudad</span>
            <input value={payload.ciudad} onChange={(e) => setPayload((current) => ({ ...current, ciudad: e.target.value }))} />
          </label>
          <label>
            <span>Web</span>
            <input
              value={payload.web}
              onChange={(e) => setPayload((current) => ({ ...current, web: e.target.value }))}
              type="url"
              placeholder="https://example.com"
            />
          </label>
          <label className="full-row">
            <span>Descripcion</span>
            <textarea
              rows={3}
              value={payload.descripcion}
              onChange={(e) => setPayload((current) => ({ ...current, descripcion: e.target.value }))}
              placeholder="Cuesta, perfiles, duracion, objetivos y alcance de la colaboracion."
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
                  onChange={(e) => setPayload((current) => ({ ...current, contactoNombre: e.target.value }))}
                />
              </label>
              <label>
                <span>Email corporativo*</span>
                <input
                  required
                  type="email"
                  value={payload.contactoEmail}
                  onChange={(e) => setPayload((current) => ({ ...current, contactoEmail: e.target.value }))}
                />
              </label>
              <label>
                <span>Telefono</span>
                <input
                  value={payload.contactoTelefono}
                  onChange={(e) => setPayload((current) => ({ ...current, contactoTelefono: e.target.value }))}
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
  );
}

function InboxPage() {
  const query = useQuery();
  const enviada = query.get('enviada') === '1';
  const token = query.get('token') ?? '';
  const verificationLink = token ? `/verificar?token=${encodeURIComponent(token)}` : '/verificar';

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Bandeja</p>
            <h2>Verificacion por correo</h2>
            <p>Revisa el mensaje enviado al correo corporativo para completar la validacion del registro.</p>
          </div>
        </div>

        {enviada && <div className="alert alert--success">Solicitud enviada. Revisa el correo corporativo para continuar.</div>}

        <article className="mail-card">
          <header>
            <div>
              <p className="eyebrow">Centro educativo</p>
              <h3>Confirma tu registro</h3>
            </div>
            <span className="chip">Verificacion</span>
          </header>
          <p>Hemos recibido tu solicitud. Utiliza el enlace de verificacion enviado al correo corporativo para confirmar el acceso.</p>
          {token ? (
            <Link className="link" to={verificationLink}>{verificationLink}</Link>
          ) : (
            <p className="mail-card__hint">El enlace personalizado se envia unicamente al correo registrado.</p>
          )}
          <p className="mail-card__hint">Tras confirmar el correo, el equipo del centro revisara la solicitud desde el portal interno.</p>
        </article>
      </section>
    </div>
  );
}

function VerifyPage() {
  const query = useQuery();
  const token = query.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('Abre el enlace completo recibido por correo para validar tu cuenta.');

  useEffect(() => {
    if (!token) {
      setStatus('idle');
      setMessage('Abre el enlace completo recibido por correo para verificar tu cuenta.');
      return;
    }

    setStatus('loading');
    fetch(`${REGISTRO_ENDPOINT}/confirmar?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(payload?.message || `Error ${res.status}`);
        }
        setStatus('ok');
        setMessage(payload?.message || 'Verificado correctamente. Avisaremos al centro.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'No se pudo validar el enlace de verificacion.');
      });
  }, [token]);

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Verificacion</p>
            <h2>Confirma tu correo</h2>
            <p>Validamos el enlace remitido al correo corporativo para confirmar la identidad de la empresa.</p>
          </div>
        </div>

        <div className="verify-card">
          <span className={`chip ${status === 'ok' ? 'chip--success' : status === 'error' ? 'chip--error' : ''}`}>
            {status === 'loading' ? 'Verificando...' : status === 'ok' ? 'Verificado' : status === 'error' ? 'Error' : 'Pendiente'}
          </span>
          <p className="verify-card__message">{message}</p>
          <div className="verify-card__actions">
            <Link to="/chat" className="btn btn--ghost">Ir a mensajeria</Link>
            <Link to="/inbox" className="btn btn--primary">Volver a bandeja</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatPage() {
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const nextToken = query.get('token') ?? '';
    setToken(nextToken);

    if (nextToken) {
      setLoading(true);
      fetch(`${PORTAL_BASE}/${nextToken}/mensajes`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('No se pudo cargar el chat');
          }
          const data = await res.json();
          setMessages(data);
        })
        .catch((err) => setStatus(err instanceof Error ? err.message : 'Error de red'))
        .finally(() => setLoading(false));
    }
  }, [location.search]);

  const sendMessage = () => {
    if (!draft.trim() || !token) {
      return;
    }

    setLoading(true);
    fetch(`${PORTAL_BASE}/${token}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: draft.trim() }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => undefined);
          throw new Error(data?.message || 'No se pudo enviar el mensaje');
        }
        const message = await res.json();
        setMessages((current) => [...current, message]);
        setDraft('');
      })
      .catch((err) => setStatus(err instanceof Error ? err.message : 'Error enviando mensaje'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Canal</p>
            <h2>Mensajeria con el centro</h2>
            <p>Utiliza este canal para resolver dudas y compartir aclaraciones durante la revision de la solicitud.</p>
            {!token && <p className="alert alert--error">Abre el enlace recibido por correo para consultar la mensajeria.</p>}
          </div>
        </div>
        <div className="chat">
          {status && <div className="alert alert--error">{status}</div>}
          {loading && <p className="detail-placeholder">Cargando...</p>}
          <div className="chat__messages">
            {messages.map((message) => (
              <div key={message.id} className={`chat__bubble chat__bubble--${message.author}`}>
                <p>{message.text}</p>
                <small>{message.author === 'empresa' ? 'Empresa' : 'Centro'} - {new Date(message.createdAt).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
          <div className="chat__input">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un mensaje para el centro..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={!token || loading}
            />
            <button type="button" className="btn btn--primary" onClick={sendMessage} disabled={!token || loading}>
              Enviar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/verificar" element={<VerifyPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
