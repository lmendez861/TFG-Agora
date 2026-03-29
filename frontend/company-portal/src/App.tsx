import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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

type RegistroResponse = {
  message?: string;
  id?: number;
  portalToken?: string;
  verificationUrl?: string;
  portalUrl?: string;
  emailDelivery?: 'sent' | 'failed' | 'unavailable';
  mailDetail?: string;
};

type PortalSession = {
  portalToken: string;
  verificationUrl: string;
  portalUrl: string;
  companyName: string;
  contactEmail: string;
  createdAt: string;
};

type PortalStatusSnapshot = {
  id: number;
  nombreEmpresa: string;
  estado: string;
  sector: string | null;
  ciudad: string | null;
  web: string | null;
  creadaEn: string;
  emailVerificadoEn: string | null;
  aprobadoEn: string | null;
  portalAccount?: {
    email: string;
    activatedAt: string | null;
    activationPending: boolean;
  } | null;
};

type ChatMessage = {
  id: number | string;
  author?: 'empresa' | 'centro';
  autor?: 'empresa' | 'centro';
  text?: string;
  texto?: string;
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

type CompanyAuthMe = {
  email: string;
  displayName: string | null;
  roles: string[];
  activatedAt: string | null;
  lastLoginAt: string | null;
  empresa: {
    id: number | null;
    nombre: string | null;
  };
};

type CompanyPortalOverview = {
  account: {
    email: string;
    displayName: string | null;
    activatedAt: string | null;
    lastLoginAt: string | null;
  };
  company: {
    id: number;
    nombre: string;
    sector: string | null;
    ciudad: string | null;
    email: string | null;
    telefono: string | null;
    web: string | null;
    estadoColaboracion: string | null;
  };
  convenios: Array<{
    id: number;
    titulo: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string | null;
  }>;
  asignaciones: Array<{
    id: number;
    estado: string;
    modalidad: string;
    fechaInicio: string;
    fechaFin: string | null;
    estudiante: {
      id: number;
      nombre: string;
      apellido: string;
    };
  }>;
  documents: {
    empresa: Array<{
      id: number;
      name: string;
      type: string | null;
      version: number;
      uploadedAt: string;
      url: string;
    }>;
    convenio: Array<{
      id: number;
      name: string;
      type: string | null;
      version: number;
      uploadedAt: string;
      url: string;
      sourceLabel: string;
    }>;
  };
  messages: Array<{
    id: number;
    autor: 'empresa' | 'centro';
    texto: string;
    createdAt: string;
  }>;
  solicitud: {
    id: number;
    estado: string;
    portalToken: string;
  } | null;
};

const PORTAL_STORAGE_KEY = 'agora.portal.session';

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

const PUBLIC_NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/estado', label: 'Estado' },
  { href: '/correo', label: 'Correo' },
  { href: '/acceso', label: 'Acceso empresa' },
  { href: '/recursos', label: 'Recursos' },
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
    detail: 'La empresa envia sus datos, ambito de colaboracion y persona de contacto.',
  },
  {
    title: '2. Verificacion de correo',
    detail: 'El sistema remite un enlace seguro para validar la cuenta corporativa.',
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

const JOURNEY_SUMMARY = [
  {
    title: 'Registro guiado',
    detail: 'La empresa completa un alta clara con datos de contacto, sector y objetivo de colaboracion.',
  },
  {
    title: 'Validacion del correo',
    detail: 'El sistema remite un enlace para confirmar la identidad corporativa antes de pasar a revision.',
  },
  {
    title: 'Revision y acceso',
    detail: 'El centro aprueba la solicitud y, cuando corresponde, habilita la cuenta persistente de empresa.',
  },
];

const MAIL_CHECKLIST = [
  'Revisar entrada, promociones y spam del correo corporativo.',
  'Abrir el enlace de verificacion completo recibido por email.',
  'Volver a la pagina de estado para confirmar el avance del registro.',
  'Entrar en Acceso empresa solo cuando el centro haya activado la cuenta.',
];

const FAQ_ITEMS = [
  {
    question: 'Que ocurre despues de enviar la solicitud?',
    answer: 'Se registra la empresa, se envia un correo de verificacion y la solicitud pasa a revision interna.',
  },
  {
    question: 'Como puedo seguir el estado?',
    answer: 'El portal guarda una sesion local y permite abrir la pagina de estado con el token asociado.',
  },
  {
    question: 'Cuando se habilita la mensajeria?',
    answer: 'La mensajeria queda disponible en cuanto existe acceso de portal con token valido.',
  },
];

function readPortalSession(): PortalSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PORTAL_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PortalSession>;
    if (!parsed.portalToken) {
      return null;
    }

    return {
      portalToken: parsed.portalToken,
      verificationUrl: parsed.verificationUrl ?? '',
      portalUrl: parsed.portalUrl ?? '',
      companyName: parsed.companyName ?? 'Empresa registrada',
      contactEmail: parsed.contactEmail ?? 'sin-dato',
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writePortalSession(session: PortalSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(session));
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'email_verificado':
      return 'Correo verificado';
    case 'aprobada':
      return 'Aprobada';
    case 'rechazada':
      return 'Rechazada';
    case 'pendiente':
    default:
      return 'Pendiente';
  }
}

function normalizeChatMessage(message: ChatMessage): Required<Pick<ChatMessage, 'id' | 'createdAt'>> & {
  author: 'empresa' | 'centro';
  text: string;
} {
  return {
    id: message.id,
    author: message.author ?? message.autor ?? 'empresa',
    text: message.text ?? message.texto ?? '',
    createdAt: message.createdAt,
  };
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

async function portalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE.replace(/\/$/, '')}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = `${message}: ${payload.message}`;
      }
    } catch {
      // ignored
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function Layout({ children, session }: { children: ReactNode; session: PortalSession | null }) {
  const navigationLinks = session
    ? [...PUBLIC_NAV_LINKS, { href: '/panel', label: 'Panel empresa' }]
    : PUBLIC_NAV_LINKS;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Link to="/" className="brand__title">Agora Empresas</Link>
          <span className="brand__badge">Portal externo</span>
        </div>
        <nav className="nav">
          {navigationLinks.map((item) => (
            <Link key={item.label} to={item.href} className="nav__link">{item.label}</Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <p>Agora | Portal de relacion empresa-centro</p>
        <small>
          Registro, verificacion y acceso empresarial coordinados desde un unico portal.
          {session ? ` | Sesion local: ${session.companyName}` : ''}
        </small>
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

      const data = (await response.json().catch(() => null)) as RegistroResponse | null;
      if (!response.ok) {
        throw new Error(data?.message || `Error ${response.status}`);
      }

      if (data?.portalToken) {
        writePortalSession({
          portalToken: data.portalToken,
          verificationUrl: data.verificationUrl ?? '',
          portalUrl: data.portalUrl ?? '',
          companyName: payload.nombreEmpresa,
          contactEmail: payload.contactoEmail,
          createdAt: new Date().toISOString(),
        });
      }

      setStatus({
        kind: 'success',
        message: data?.message || 'Solicitud enviada. Revisa tu correo y sigue el enlace de verificacion.',
      });
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
      const delivery = data?.emailDelivery ?? 'sent';
      navigate(`/correo?enviada=1&delivery=${encodeURIComponent(delivery)}`);
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
          <h1>Presenta la colaboracion, valida el correo y activa el acceso empresarial sin salir del mismo flujo.</h1>
          <p className="lede">
            Agora concentra el registro inicial, la validacion por correo, el seguimiento de la solicitud y el
            acceso posterior de la empresa en un recorrido unico, mas claro y mas facil de operar.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#registro">Solicitar colaboracion</a>
            <Link className="btn btn--ghost" to="/estado">Ver estado de una solicitud</Link>
            <Link className="btn btn--ghost" to="/acceso">Acceso empresa aprobada</Link>
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
            <h2>Un recorrido coherente de principio a fin.</h2>
            <ul className="rail-list">
              <li>Alta de empresa con datos estructurados.</li>
              <li>Correo de verificacion emitido por backend.</li>
              <li>Estado visible durante toda la revision.</li>
              <li>Acceso persistente cuando la empresa queda aprobada.</li>
            </ul>
          </div>
          <div className="hero__rail-card hero__rail-card--soft">
            <span className="eyebrow">Acceso empresarial</span>
            <strong>La cuenta privada se activa solo cuando el centro lo confirma.</strong>
            <p>Evita accesos prematuros y mantiene una transicion limpia entre solicitud, aprobacion y operativa.</p>
          </div>
        </aside>
      </section>

      <section className="section-grid">
        {JOURNEY_SUMMARY.map((item) => (
          <article key={item.title} className="surface-card">
            <p className="eyebrow">Flujo</p>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </article>
        ))}
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
              <h2>Que puede hacer la empresa en cada etapa</h2>
            </div>
          </header>
          <ul className="feature-list">
            <li>Formulario claro para contacto y descripcion de la colaboracion.</li>
            <li>Pagina de correo para reenviar y seguir el enlace de validacion.</li>
            <li>Pagina de estado con hitos y proximos pasos visibles.</li>
            <li>Acceso privado solo tras la aprobacion y activacion de la cuenta.</li>
            <li>Mensajeria y documentos cuando ya existe contexto operativo.</li>
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

function MailPage() {
  const query = useQuery();
  const session = readPortalSession();
  const enviada = query.get('enviada') === '1';
  const delivery = query.get('delivery') ?? 'sent';
  const verificationLink = session?.verificationUrl
    ? session.verificationUrl
    : '/verificar';
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const handleResend = async () => {
    if (!session?.portalToken && !session?.contactEmail) {
      setFeedback({
        kind: 'error',
        message: 'No hay una solicitud guardada en este navegador para reenviar el correo.',
      });
      return;
    }

    setResending(true);
    setFeedback(null);

    try {
      const response = await fetch(`${REGISTRO_ENDPOINT}/reenviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalToken: session?.portalToken || undefined,
          contactoEmail: session?.contactEmail || undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as RegistroResponse | null;
      if (!response.ok) {
        throw new Error(data?.message || `Error ${response.status}`);
      }

      if (session && data?.verificationUrl) {
        writePortalSession({
          ...session,
          verificationUrl: data.verificationUrl,
          portalUrl: data.portalUrl ?? session.portalUrl,
        });
      }

      setFeedback({
        kind: 'success',
        message: data?.message || 'Correo reenviado correctamente.',
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'No se pudo reenviar el correo de verificacion.',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page">
      <section className="content-grid">
        <article className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Correo</p>
              <h2>Verificacion por correo</h2>
              <p>Revisa el mensaje enviado al correo corporativo para completar la validacion del registro.</p>
            </div>
          </div>

          {enviada && (
            <div className={`alert ${delivery === 'sent' ? 'alert--success' : 'alert--error'}`}>
              {delivery === 'sent'
                ? 'Solicitud enviada. Revisa el correo corporativo para continuar.'
                : 'La solicitud se ha registrado, pero el correo saliente no esta operativo todavia. Debe revisarse la configuracion SMTP.'}
            </div>
          )}
          {feedback && <div className={`alert ${feedback.kind === 'success' ? 'alert--success' : 'alert--error'}`}>{feedback.message}</div>}

          <article className="mail-card">
            <header>
              <div>
                <p className="eyebrow">Centro educativo</p>
                <h3>Confirma tu registro</h3>
              </div>
              <span className="chip">Verificacion</span>
            </header>
            <p>Hemos recibido tu solicitud. Utiliza el enlace de verificacion enviado al correo corporativo para confirmar el acceso.</p>
            {session?.verificationUrl ? (
              <a className="link" href={verificationLink} target="_blank" rel="noreferrer">{verificationLink}</a>
            ) : (
              <p className="mail-card__hint">El enlace personalizado se envia unicamente al correo registrado.</p>
            )}
            <p className="mail-card__hint">Tras confirmar el correo, el equipo del centro revisara la solicitud desde el portal interno.</p>
            <div className="hero__actions">
              <Link className="btn btn--ghost" to={session?.portalToken ? `/estado?token=${encodeURIComponent(session.portalToken)}` : '/estado'}>
                Ver estado
              </Link>
              <button type="button" className="btn btn--primary" onClick={handleResend} disabled={resending}>
                {resending ? 'Reenviando...' : 'Reenviar correo'}
              </button>
            </div>
          </article>
        </article>

        <article className="panel panel--soft">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Siguientes pasos</p>
              <h2>Que revisar antes de continuar</h2>
            </div>
          </div>
          <ul className="feature-list">
            {MAIL_CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function StatusPage() {
  const query = useQuery();
  const session = readPortalSession();
  const activeToken = query.get('token') ?? session?.portalToken ?? '';
  const [status, setStatus] = useState<PortalStatusSnapshot | null>(null);
  const [tokenInput, setTokenInput] = useState(activeToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeToken) {
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${PORTAL_BASE}/${encodeURIComponent(activeToken)}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as PortalStatusSnapshot | { message?: string } | null;
        if (!response.ok) {
          throw new Error((data as { message?: string } | null)?.message || `Error ${response.status}`);
        }
        setStatus(data as PortalStatusSnapshot);
      })
      .catch((err) => {
        setStatus(null);
        setError(err instanceof Error ? err.message : 'No se pudo cargar el estado de la solicitud.');
      })
      .finally(() => setLoading(false));
  }, [activeToken]);

  const steps = useMemo(() => {
    const isVerified = Boolean(status?.emailVerificadoEn) || status?.estado === 'email_verificado' || status?.estado === 'aprobada';
    const isApproved = status?.estado === 'aprobada';

    return [
      { label: 'Solicitud enviada', done: Boolean(status?.creadaEn), detail: status?.creadaEn ? new Date(status.creadaEn).toLocaleString('es-ES') : 'Pendiente' },
      { label: 'Correo verificado', done: isVerified, detail: status?.emailVerificadoEn ? new Date(status.emailVerificadoEn).toLocaleString('es-ES') : 'Pendiente' },
      { label: 'Revision interna', done: Boolean(status), detail: status ? getStatusLabel(status.estado) : 'Sin datos' },
      { label: 'Aprobacion final', done: isApproved, detail: status?.aprobadoEn ? new Date(status.aprobadoEn).toLocaleString('es-ES') : 'Pendiente' },
    ];
  }, [status]);

  const nextActions = useMemo(() => {
    if (!status) {
      return [
        'Introduce el token del portal o utiliza la sesion guardada para recuperar la solicitud.',
        'Si acabas de registrarte, revisa primero la pagina de correo para verificar la direccion.',
      ];
    }

    if (status.estado === 'pendiente') {
      return [
        'Confirma el enlace recibido en el correo corporativo.',
        'Cuando el correo este validado, vuelve a esta pagina para seguir la revision.',
      ];
    }

    if (status.estado === 'email_verificado') {
      return [
        'La solicitud ya ha pasado la validacion por correo.',
        'El siguiente paso depende de la revision del centro desde el portal interno.',
      ];
    }

    if (status.estado === 'aprobada') {
      return [
        status.portalAccount?.activationPending
          ? 'Revisa el correo de activacion de cuenta para crear tu contrasena inicial.'
          : 'Accede al area privada de empresa para revisar convenios, mensajes y documentos.',
        'Conserva este token para consultar el historial de la solicitud cuando lo necesites.',
      ];
    }

    return [
      'La solicitud ha sido rechazada. Revisa el motivo indicado por el centro y prepara una nueva propuesta si procede.',
      'Si necesitas aclaraciones, utiliza el canal habilitado o contacta con el centro.',
    ];
  }, [status]);

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2>Estado de la solicitud</h2>
            <p>Consulta la evolucion del registro y recupera el acceso a la mensajeria vinculada.</p>
          </div>
          {session && (
            <div className="panel__meta">
              <span className="chip">{session.companyName}</span>
              <code>{session.contactEmail}</code>
            </div>
          )}
        </div>

        <div className="status-grid">
          <article className="surface-card">
            <p className="eyebrow">Acceso</p>
            <h3>Sesion del portal</h3>
            <p>{session ? 'Existe una sesion local guardada en este navegador.' : 'No hay sesion local guardada.'}</p>
            {status?.portalAccount && (
              <small>
                Cuenta empresa: {status.portalAccount.activationPending ? 'pendiente de activacion' : 'activa'}
              </small>
            )}
            <label className="status-grid__field">
              <span>Token portal</span>
              <input value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="Introduce el token del portal" />
            </label>
            <div className="hero__actions">
              <Link className="btn btn--primary" to={tokenInput ? `/estado?token=${encodeURIComponent(tokenInput)}` : '/estado'}>
                Consultar estado
              </Link>
              <Link className="btn btn--ghost" to={tokenInput ? `/chat?token=${encodeURIComponent(tokenInput)}` : '/chat'}>
                Abrir mensajeria
              </Link>
            </div>
          </article>

          <article className="surface-card">
            <p className="eyebrow">Estado actual</p>
            <h3>{status ? status.nombreEmpresa : 'Sin solicitud cargada'}</h3>
            <p>{status ? `Situacion: ${getStatusLabel(status.estado)}` : 'Carga un token o utiliza la sesion guardada para ver el detalle.'}</p>
            {error && <div className="alert alert--error">{error}</div>}
            {loading && <p className="detail-placeholder">Cargando estado...</p>}
          </article>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel panel--soft">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Linea temporal</p>
              <h2>Hitos de la solicitud</h2>
            </div>
          </div>
          <div className="timeline">
            {steps.map((step) => (
              <article key={step.label} className={`timeline__item${step.done ? ' timeline__item--done' : ''}`}>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel panel--dark">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Proximo movimiento</p>
              <h2>Que debes hacer ahora</h2>
            </div>
          </div>
          <ul className="feature-list">
            {nextActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function VerifyPage() {
  const query = useQuery();
  const session = readPortalSession();
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
            <Link to={session?.portalToken ? `/chat?token=${encodeURIComponent(session.portalToken)}` : '/chat'} className="btn btn--ghost">
              Ir a mensajeria
            </Link>
            <Link to={session?.portalToken ? `/estado?token=${encodeURIComponent(session.portalToken)}` : '/estado'} className="btn btn--primary">
              Ir al estado
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ChatPage() {
  const session = readPortalSession();
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const nextToken = query.get('token') ?? session?.portalToken ?? '';
    setToken(nextToken);

    if (nextToken) {
      setLoading(true);
      fetch(`${PORTAL_BASE}/${nextToken}/mensajes`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('No se pudo cargar el chat');
          }
          const data = (await res.json()) as ChatMessage[];
          setMessages(data.map(normalizeChatMessage));
        })
        .catch((err) => setStatus(err instanceof Error ? err.message : 'Error de red'))
        .finally(() => setLoading(false));
    }
  }, [location.search, session?.portalToken]);

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
        const message = normalizeChatMessage((await res.json()) as ChatMessage);
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

function ResourcesPage() {
  return (
    <div className="page">
      <section className="section-grid">
        {FAQ_ITEMS.map((item) => (
          <article key={item.question} className="surface-card">
            <p className="eyebrow">FAQ</p>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>

      <section className="panel panel--soft">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Material recomendado</p>
            <h2>Que preparar antes de enviar la solicitud</h2>
          </div>
        </div>
        <ul className="feature-list">
          <li>Descripcion clara del perfil o area de colaboracion.</li>
          <li>Correo corporativo valido para recibir el enlace de verificacion.</li>
          <li>Telefono y persona de contacto del equipo responsable.</li>
          <li>Datos de web y ciudad para la primera revision interna.</li>
        </ul>
      </section>
    </div>
  );
}

function CompanyLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await portalFetch<void>('/portal-auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      navigate('/panel');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo iniciar sesion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Cuenta empresa</p>
            <h2>Acceso persistente</h2>
            <p>Disponible para empresas aprobadas con cuenta activada desde el correo corporativo.</p>
          </div>
        </div>
        {status && <div className="alert alert--error">{status}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Email corporativo</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            <span>Contrasena</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Accediendo...' : 'Entrar al portal'}
            </button>
            <Link className="btn btn--ghost" to="/recuperar-clave">Recuperar contrasena</Link>
          </div>
        </form>
      </section>
    </div>
  );
}

function ActivateAccountPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setStatus({ kind: 'error', message: 'El enlace de activacion no incluye un token valido.' });
      return;
    }
    if (password !== confirmPassword) {
      setStatus({ kind: 'error', message: 'Las contrasenas no coinciden.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await portalFetch<{ message: string }>('/portal-auth/activate', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setStatus({ kind: 'success', message: response.message });
      window.setTimeout(() => navigate('/acceso'), 1200);
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'No se pudo activar la cuenta.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Activacion</p>
            <h2>Crear acceso de empresa</h2>
            <p>Define la contrasena inicial para el portal privado posterior a la aprobacion.</p>
          </div>
        </div>
        {status && <div className={`alert ${status.kind === 'success' ? 'alert--success' : 'alert--error'}`}>{status.message}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Nueva contrasena</span>
            <input type="password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <label>
            <span>Confirmar contrasena</span>
            <input type="password" minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </label>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Activando...' : 'Activar cuenta'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await portalFetch<{ message: string }>('/portal-auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStatus(response.message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo solicitar la recuperacion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Recuperacion</p>
            <h2>Solicitar restablecimiento</h2>
            <p>Enviaremos un enlace de recuperacion a la cuenta ya activada.</p>
          </div>
        </div>
        {status && <div className="alert alert--success">{status}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Email corporativo</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Solicitar enlace'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ResetPasswordPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setStatus('Las contrasenas no coinciden.');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await portalFetch<{ message: string }>('/portal-auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setStatus(response.message);
      window.setTimeout(() => navigate('/acceso'), 1200);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo actualizar la contrasena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Nueva contrasena</p>
            <h2>Restablecer acceso</h2>
          </div>
        </div>
        {status && <div className="alert alert--success">{status}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Nueva contrasena</span>
            <input type="password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <label>
            <span>Confirmar contrasena</span>
            <input type="password" minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </label>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar contrasena'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CompanyAreaPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<CompanyAuthMe | null>(null);
  const [overview, setOverview] = useState<CompanyPortalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [meResponse, overviewResponse] = await Promise.all([
        portalFetch<CompanyAuthMe>('/portal-auth/me'),
        portalFetch<CompanyPortalOverview>('/api/portal-company/overview'),
      ]);
      setMe(meResponse);
      setOverview(overviewResponse);
      setStatus(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo cargar el panel privado.');
      setOverview(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleSendMessage = async () => {
    if (!draft.trim()) {
      return;
    }

    try {
      await portalFetch('/api/portal-company/messages', {
        method: 'POST',
        body: JSON.stringify({ texto: draft.trim() }),
      });
      setDraft('');
      await loadOverview();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.');
    }
  };

  const handleLogout = async () => {
    try {
      await portalFetch<void>('/portal-auth/logout', { method: 'POST' });
    } catch {
      // ignored
    } finally {
      navigate('/acceso');
    }
  };

  if (loading) {
    return <div className="page"><section className="panel"><p>Cargando panel de empresa...</p></section></div>;
  }

  if (!overview || !me) {
    return (
      <div className="page">
        <section className="panel">
          {status && <div className="alert alert--error">{status}</div>}
          <p>La sesion de empresa no esta activa o la cuenta aun no se ha aprobado.</p>
          <div className="hero__actions">
            <Link className="btn btn--primary" to="/acceso">Ir a acceso</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero hero--landing">
        <div className="hero__copy">
          <p className="eyebrow">Area privada empresa</p>
          <h1>{overview.company.nombre}</h1>
          <p className="lede">
            Cuenta activa para revisar convenios, asignaciones, documentacion y el canal operativo con el centro.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => void loadOverview()}>Actualizar</button>
            <button type="button" className="btn btn--ghost" onClick={() => void handleLogout()}>Cerrar sesion</button>
          </div>
          <div className="metric-grid">
            <article className="metric-card"><span>Convenios</span><strong>{overview.convenios.length}</strong><small>Acuerdos visibles</small></article>
            <article className="metric-card"><span>Asignaciones</span><strong>{overview.asignaciones.length}</strong><small>Practicas vinculadas</small></article>
            <article className="metric-card"><span>Mensajes</span><strong>{overview.messages.length}</strong><small>Canal con el centro</small></article>
          </div>
        </div>
        <aside className="hero__rail">
          <div className="hero__rail-card">
            <p className="eyebrow">Cuenta</p>
            <h2>{me.displayName ?? me.email}</h2>
            <p>{me.email}</p>
            <small>Activada: {me.activatedAt ? new Date(me.activatedAt).toLocaleString('es-ES') : 'pendiente'}</small>
          </div>
        </aside>
      </section>

      {status && <div className="alert alert--error">{status}</div>}

      <section className="section-grid">
        <article className="surface-card">
          <p className="eyebrow">Empresa</p>
          <h3>Ficha de colaboracion</h3>
          <p>{overview.company.sector ?? 'Sector pendiente'}  |  {overview.company.ciudad ?? 'Ciudad pendiente'}</p>
          <small>{overview.company.email ?? 'Sin email'}  |  {overview.company.telefono ?? 'Sin telefono'}</small>
        </article>
        <article className="surface-card">
          <p className="eyebrow">Estado</p>
          <h3>{overview.company.estadoColaboracion ?? 'Sin estado'}</h3>
          <p>Ultimo acceso: {overview.account.lastLoginAt ? new Date(overview.account.lastLoginAt).toLocaleString('es-ES') : 'Primera sesion'}</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel panel--soft">
          <header className="panel__header">
            <div>
              <p className="eyebrow">Convenios</p>
              <h2>Acuerdos disponibles</h2>
            </div>
          </header>
          <div className="timeline">
            {overview.convenios.map((convenio) => (
              <article key={convenio.id} className="timeline__item">
                <strong>{convenio.titulo}</strong>
                <p>{convenio.estado}</p>
                <small>{convenio.fechaInicio}  |  {convenio.fechaFin ?? 'sin fin'}</small>
              </article>
            ))}
          </div>
        </article>

        <article className="panel panel--dark">
          <header className="panel__header">
            <div>
              <p className="eyebrow">Mensajeria</p>
              <h2>Canal con el centro</h2>
            </div>
          </header>
          <div className="chat">
            <div className="chat__messages">
              {overview.messages.map((message) => (
                <div key={message.id} className={`chat__bubble chat__bubble--${message.autor}`}>
                  <p>{message.texto}</p>
                  <small>{message.autor}  |  {new Date(message.createdAt).toLocaleString('es-ES')}</small>
                </div>
              ))}
            </div>
            <div className="chat__input">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Mensaje para el centro..." />
              <button type="button" className="btn btn--primary" onClick={() => void handleSendMessage()}>Enviar</button>
            </div>
          </div>
        </article>
      </section>

      <section className="section-grid">
        {[...overview.documents.empresa, ...overview.documents.convenio].map((document) => (
          <article key={`${document.id}-${document.url}`} className="surface-card">
            <p className="eyebrow">Documento</p>
            <h3>{document.name}</h3>
            <p>Version {document.version}  |  {document.type ?? 'Documento'}</p>
            <a className="link" href={document.url} target="_blank" rel="noreferrer">Descargar</a>
          </article>
        ))}
      </section>
    </div>
  );
}

function App() {
  const session = readPortalSession();

  return (
    <Layout session={session}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/correo" element={<MailPage />} />
        <Route path="/inbox" element={<Navigate to="/correo" replace />} />
        <Route path="/estado" element={<StatusPage />} />
        <Route path="/verificar" element={<VerifyPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/acceso" element={<CompanyLoginPage />} />
        <Route path="/activar-cuenta" element={<ActivateAccountPage />} />
        <Route path="/recuperar-clave" element={<RequestResetPage />} />
        <Route path="/restablecer-clave" element={<ResetPasswordPage />} />
        <Route path="/panel" element={<CompanyAreaPage />} />
        <Route path="/recursos" element={<ResourcesPage />} />
      </Routes>
    </Layout>
  );
}

export default App;

