/**
 * Comentario de mantenimiento Agora.
 * Proposito: Componente raiz React: orquesta rutas, estado principal, formularios y llamadas al cliente de API.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

type AccountRegistrationPayload = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type CompanyRequestPayload = {
  nombreEmpresa: string;
  cif?: string;
  sector?: string;
  ciudad?: string;
  web?: string;
  descripcion?: string;
  contactoNombre: string;
  contactoTelefono?: string;
};

type RegistroResponse = {
  message?: string;
  id?: number;
  verificationUrl?: string;
  portalUrl?: string;
  emailDelivery?: 'sent' | 'failed' | 'unavailable' | 'not_required';
  mailDetail?: string;
};

type CompanyAccountRegistrationResponse = {
  message?: string;
  email?: string;
  displayName?: string;
};

type PortalSession = {
  portalToken?: string;
  verificationUrl?: string;
  portalUrl?: string;
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
  } | null;
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
    nombreEmpresa: string;
    sector: string | null;
    ciudad: string | null;
    web: string | null;
    contactoNombre: string;
    contactoEmail: string;
    contactoTelefono: string | null;
    creadaEn: string;
    emailVerificadoEn: string | null;
    aprobadoEn: string | null;
    motivoRechazo: string | null;
  } | null;
};

const PORTAL_STORAGE_KEY = 'agora.portal.session';

/**
 * Resume la responsabilidad de resolveDefaultApiBase dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
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
const LIVE_REFRESH_MS = 5_000;

const PUBLIC_NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/estado', label: 'Estado' },
  { href: '/correo', label: 'Correo' },
  { href: '/acceso', label: 'Acceso empresa' },
  { href: '/panel', label: 'Panel empresa' },
  { href: '/recursos', label: 'Recursos' },
];

const IMPACT_METRICS: MetricCard[] = [
  {
    label: 'Cuenta previa',
    value: '1 acceso',
    detail: 'La empresa define correo y contrasena antes de enviar la solicitud.',
  },
  {
    label: 'Canal directo',
    value: 'Chat',
    detail: 'La mensajeria queda asociada a la solicitud y al panel privado.',
  },
  {
    label: 'Revision interna',
    value: 'Coordinada',
    detail: 'La empresa registra la solicitud y el centro la revisa en el portal interno.',
  },
];

const CAPABILITIES: CapabilityCard[] = [
  {
    title: 'Cuenta previa de empresa',
    detail: 'La empresa crea su acceso con correo y contrasena antes de remitir la solicitud formal.',
  },
  {
    title: 'Solicitud posterior',
    detail: 'Una vez dentro del panel, la empresa rellena sus datos corporativos y remite la propuesta.',
  },
  {
    title: 'Seguimiento continuo',
    detail: 'El centro y la empresa comparten contexto desde un canal asociado a la solicitud y a la cuenta.',
  },
];

const PROCESS_STEPS: ProcessStep[] = [
  {
    title: '1. Crear cuenta',
    detail: 'La empresa registra su acceso inicial con correo corporativo y contrasena.',
  },
  {
    title: '2. Completar solicitud',
    detail: 'Ya dentro del portal, la empresa remite datos corporativos, contacto y propuesta de colaboracion.',
  },
  {
    title: '3. Verificacion de correo',
    detail: 'El sistema remite un enlace seguro para validar el correo asociado a la solicitud.',
  },
  {
    title: '4. Revision y operativa',
    detail: 'El portal interno recibe la solicitud, la aprueba o rechaza y mantiene el canal operativo.',
  },
];

const JOURNEY_SUMMARY = [
  {
    title: 'Cuenta corporativa',
    detail: 'La empresa define un acceso persistente antes de empezar el flujo de colaboracion.',
  },
  {
    title: 'Solicitud estructurada',
    detail: 'La peticion se rellena ya dentro del portal, con los datos de la empresa y el contacto principal.',
  },
  {
    title: 'Revision y continuidad',
    detail: 'El centro revisa la solicitud y la empresa mantiene el mismo acceso para estado, chat y operativa posterior.',
  },
];

const MAIL_CHECKLIST = [
  'Confirma que la cuenta del portal se creo con el correo corporativo correcto.',
  'Revisar entrada, promociones y spam del correo corporativo.',
  'Abrir el enlace de verificacion completo recibido por email.',
  'Volver al panel o a la pagina de estado para confirmar el avance del registro.',
  'Mantener el mismo acceso de empresa para consultar mensajes y estado.',
];

const FAQ_ITEMS = [
  {
    question: 'Que ocurre despues de enviar la solicitud?',
    answer: 'La solicitud queda ligada a la cuenta de empresa, se envia el correo de verificacion y el centro la revisa internamente.',
  },
  {
    question: 'Como puedo seguir el estado?',
    answer: 'Puedes seguirlo desde la pagina de estado o desde el panel privado, usando el mismo acceso de empresa.',
  },
  {
    question: 'Cuando se habilita la mensajeria?',
    answer: 'La mensajeria queda disponible en cuanto la cuenta tiene una solicitud asociada, sin esperar a recargar manualmente.',
  },
];

/**
 * Resume la responsabilidad de readPortalSession dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
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
    if (!parsed.contactEmail && !parsed.companyName && !parsed.portalToken && !parsed.verificationUrl) {
      return null;
    }

    return {
      portalToken: parsed.portalToken ?? undefined,
      verificationUrl: parsed.verificationUrl ?? undefined,
      portalUrl: parsed.portalUrl ?? undefined,
      companyName: parsed.companyName ?? 'Empresa registrada',
      contactEmail: parsed.contactEmail ?? 'sin-dato',
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Resume la responsabilidad de writePortalSession dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function writePortalSession(session: PortalSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Elimina la sesion local del portal externo para evitar incoherencias tras cerrar sesion.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function clearPortalSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(PORTAL_STORAGE_KEY);
}

/**
 * Devuelve StatusLabel sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
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

/**
 * Resume la responsabilidad de normalizeChatMessage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
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

function mapOverviewToStatusSnapshot(overview: CompanyPortalOverview): PortalStatusSnapshot | null {
  if (!overview.solicitud) {
    return null;
  }

  return {
    id: overview.solicitud.id,
    nombreEmpresa: overview.solicitud.nombreEmpresa,
    estado: overview.solicitud.estado,
    sector: overview.solicitud.sector,
    ciudad: overview.solicitud.ciudad,
    web: overview.solicitud.web,
    creadaEn: overview.solicitud.creadaEn,
    emailVerificadoEn: overview.solicitud.emailVerificadoEn,
    aprobadoEn: overview.solicitud.aprobadoEn,
    portalAccount: {
      email: overview.account.email,
      activatedAt: overview.account.activatedAt,
      activationPending: overview.account.activatedAt === null,
    },
  };
}

/**
 * Resume la responsabilidad de useQuery dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
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
      if (response.status === 401) {
        message = 'Error 401: la sesion de empresa no es valida o ha caducado.';
      } else if (response.status >= 500) {
        message = `Error ${response.status}: el servidor no ha podido completar la operacion.`;
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Resume la responsabilidad de Layout dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function Layout({ children, session }: { children: ReactNode; session: PortalSession | null }) {
  const location = useLocation();
  const navigationLinks = PUBLIC_NAV_LINKS;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Link to="/" className="brand__title">Agora Empresas</Link>
          <span className="brand__badge">Portal externo</span>
        </div>
        <nav className="nav">
          {navigationLinks.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`nav__link${location.pathname === item.href ? ' nav__link--active' : ''}`}
              aria-current={location.pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
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

/**
 * Resume la responsabilidad de LandingPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [payload, setPayload] = useState<AccountRegistrationPayload>({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (payload.password !== payload.confirmPassword) {
      setStatus({ kind: 'error', message: 'Las contrasenas no coinciden.' });
      return;
    }

    setStatus(null);
    setLoading(true);

    try {
      await portalFetch<CompanyAccountRegistrationResponse>('/portal-auth/register', {
        method: 'POST',
        body: JSON.stringify({
          displayName: payload.displayName,
          email: payload.email,
          password: payload.password,
        }),
      });
      await portalFetch<void>('/portal-auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
      });

      setStatus({ kind: 'success', message: 'Cuenta creada correctamente. Completa ahora la solicitud de colaboracion.' });
      setPayload({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      navigate('/panel');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta de empresa.';
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
          <h1>Crea la cuenta de empresa primero y remite la solicitud formal desde tu propio panel privado.</h1>
          <p className="lede">
            Agora separa el alta de acceso y la solicitud corporativa para que la empresa conserve el mismo usuario
            durante la verificacion, la revision interna, la mensajeria y la operativa posterior.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#registro">Crear cuenta</a>
            <Link className="btn btn--ghost" to="/estado">Ver estado de una solicitud</Link>
            <Link className="btn btn--ghost" to="/acceso">Entrar al portal</Link>
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
              <li>Cuenta previa con correo y contrasena.</li>
              <li>Solicitud corporativa desde el panel privado.</li>
              <li>Correo de verificacion emitido por backend.</li>
              <li>Estado y mensajeria con el mismo acceso.</li>
            </ul>
          </div>
          <div className="hero__rail-card hero__rail-card--soft">
            <span className="eyebrow">Acceso empresarial</span>
            <strong>La cuenta existe antes de la solicitud y se mantiene despues de la aprobacion.</strong>
            <p>Evita pedir una contrasena tardia y da continuidad al chat, al estado y al panel de empresa.</p>
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
            <li>Cuenta previa con contrasena definida por la propia empresa.</li>
            <li>Formulario de solicitud dentro del area privada.</li>
            <li>Pagina de correo para reenviar y seguir el enlace de validacion.</li>
            <li>Pagina de estado con hitos y proximos pasos visibles.</li>
            <li>Mensajeria y operativa posterior sobre el mismo acceso.</li>
          </ul>
        </article>
      </section>

      <section className="panel" id="registro">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Cuenta previa</p>
            <h2>Crear acceso de empresa</h2>
            <p>Usa un correo corporativo valido. Despues entraras al panel para completar la solicitud de colaboracion.</p>
          </div>
          <div className="panel__meta">
            <span className="chip">Acceso seguro</span>
            <code>Cuenta previa + solicitud posterior</code>
          </div>
        </div>

        {status && (
          <div className={`alert alert--${status.kind}`}>
            {status.message}
          </div>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Persona responsable*</span>
            <input required value={payload.displayName} onChange={(e) => setPayload((current) => ({ ...current, displayName: e.target.value }))} />
          </label>
          <label>
            <span>Email corporativo*</span>
            <input required type="email" value={payload.email} onChange={(e) => setPayload((current) => ({ ...current, email: e.target.value }))} />
          </label>
          <label>
            <span>Contrasena*</span>
            <input required type="password" minLength={8} value={payload.password} onChange={(e) => setPayload((current) => ({ ...current, password: e.target.value }))} />
          </label>
          <label>
            <span>Confirmar contrasena*</span>
            <input required type="password" minLength={8} value={payload.confirmPassword} onChange={(e) => setPayload((current) => ({ ...current, confirmPassword: e.target.value }))} />
          </label>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear cuenta y entrar'}
            </button>
            <p className="form__hint">La solicitud se completa en el siguiente paso, ya dentro del panel privado.</p>
          </div>
        </form>
      </section>
    </div>
  );
}

/**
 * Resume la responsabilidad de MailPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
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

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
  const handleResend = async () => {
    setResending(true);
    setFeedback(null);

    try {
      const data = await portalFetch<RegistroResponse>('/api/portal-company/resend-verification', {
        method: 'POST',
      });

      if (session && data?.verificationUrl) {
        writePortalSession({
          ...session,
          verificationUrl: data.verificationUrl,
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
              <Link className="btn btn--ghost" to="/estado">
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

/**
 * Resume la responsabilidad de StatusPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function StatusPage() {
  const query = useQuery();
  const session = readPortalSession();
  const activeToken = query.get('token') ?? session?.portalToken ?? '';
  const [status, setStatus] = useState<PortalStatusSnapshot | null>(null);
  const [tokenInput, setTokenInput] = useState(activeToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleStatus = status;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });

    const loadStatus = async () => {
      try {
        if (activeToken) {
          const response = await fetch(`${PORTAL_BASE}/${encodeURIComponent(activeToken)}`);
          const data = (await response.json().catch(() => null)) as PortalStatusSnapshot | { message?: string } | null;
          if (!response.ok) {
            throw new Error((data as { message?: string } | null)?.message || `Error ${response.status}`);
          }

          if (!cancelled) {
            setStatus(data as PortalStatusSnapshot);
          }

          return;
        }

        const overview = await portalFetch<CompanyPortalOverview>('/api/portal-company/overview');
        if (!cancelled) {
          setStatus(mapOverviewToStatusSnapshot(overview));
        }
      } catch (err) {
        if (!cancelled) {
          setStatus(null);
          setError(err instanceof Error ? err.message : 'No se pudo cargar el estado de la solicitud.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [activeToken]);

  const steps = useMemo(() => {
    const isVerified = Boolean(visibleStatus?.emailVerificadoEn) || visibleStatus?.estado === 'email_verificado' || visibleStatus?.estado === 'aprobada';
    const isApproved = visibleStatus?.estado === 'aprobada';

    return [
      { label: 'Solicitud enviada', done: Boolean(visibleStatus?.creadaEn), detail: visibleStatus?.creadaEn ? new Date(visibleStatus.creadaEn).toLocaleString('es-ES') : 'Pendiente' },
      { label: 'Correo verificado', done: isVerified, detail: visibleStatus?.emailVerificadoEn ? new Date(visibleStatus.emailVerificadoEn).toLocaleString('es-ES') : 'Pendiente' },
      { label: 'Revision interna', done: Boolean(visibleStatus), detail: visibleStatus ? getStatusLabel(visibleStatus.estado) : 'Sin datos' },
      { label: 'Aprobacion final', done: isApproved, detail: visibleStatus?.aprobadoEn ? new Date(visibleStatus.aprobadoEn).toLocaleString('es-ES') : 'Pendiente' },
    ];
  }, [visibleStatus]);

  const nextActions = useMemo(() => {
    if (!visibleStatus) {
      return [
        'Inicia sesion en el portal de empresa o abre el enlace publico recibido por correo para recuperar la solicitud.',
        'Si acabas de registrarte, revisa primero la pagina de correo para verificar la direccion.',
      ];
    }

    if (visibleStatus.estado === 'pendiente') {
      return [
        'Confirma el enlace recibido en el correo corporativo.',
        'Cuando el correo este validado, vuelve a esta pagina para seguir la revision.',
      ];
    }

    if (visibleStatus.estado === 'email_verificado') {
      return [
        'La solicitud ya ha pasado la validacion por correo.',
        'El siguiente paso depende de la revision del centro desde el portal interno.',
      ];
    }

    if (visibleStatus.estado === 'aprobada') {
      return [
        visibleStatus.portalAccount?.activationPending
          ? 'Revisa el correo de activacion de cuenta para crear tu contrasena inicial.'
          : 'Accede al area privada de empresa para revisar convenios, mensajes y documentos.',
        activeToken
          ? 'Conserva el enlace publico solo para consultas puntuales desde fuera de tu sesion.'
          : 'Tu propia cuenta de empresa ya sirve como acceso principal al estado y a la operativa.',
      ];
    }

    return [
      'La solicitud ha sido rechazada. Revisa el motivo indicado por el centro y prepara una nueva propuesta si procede.',
      'Si necesitas aclaraciones, utiliza el canal habilitado o contacta con el centro.',
    ];
  }, [activeToken, visibleStatus]);

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
            {visibleStatus?.portalAccount && (
              <small>
                Cuenta empresa: {visibleStatus.portalAccount.activationPending ? 'pendiente de activacion' : 'activa'}
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
            <h3>{visibleStatus ? visibleStatus.nombreEmpresa : 'Sin solicitud cargada'}</h3>
            <p>{visibleStatus ? `Situacion: ${getStatusLabel(visibleStatus.estado)}` : 'Carga un token o utiliza la sesion guardada para ver el detalle.'}</p>
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

/**
 * Resume la responsabilidad de VerifyPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function VerifyPage() {
  const query = useQuery();
  const token = query.get('token') ?? '';
  const [verification, setVerification] = useState<{ token: string; status: 'ok' | 'error'; message: string } | null>(null);
  const effectiveStatus: 'idle' | 'loading' | 'ok' | 'error' = token
    ? verification?.token === token
      ? verification.status
      : 'loading'
    : 'idle';
  const effectiveMessage = token
    ? verification?.token === token
      ? verification.message
      : 'Validando el enlace recibido por correo...'
    : 'Abre el enlace completo recibido por correo para verificar tu cuenta.';

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    fetch(`${REGISTRO_ENDPOINT}/confirmar?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(payload?.message || `Error ${res.status}`);
        }
        if (!cancelled) {
          setVerification({
            token,
            status: 'ok',
            message: payload?.message || 'Verificado correctamente. Avisaremos al centro.',
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setVerification({
            token,
            status: 'error',
            message: err instanceof Error ? err.message : 'No se pudo validar el enlace de verificacion.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
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
          <span className={`chip ${effectiveStatus === 'ok' ? 'chip--success' : effectiveStatus === 'error' ? 'chip--error' : ''}`}>
            {effectiveStatus === 'loading' ? 'Verificando...' : effectiveStatus === 'ok' ? 'Verificado' : effectiveStatus === 'error' ? 'Error' : 'Pendiente'}
          </span>
          <p className="verify-card__message">{effectiveMessage}</p>
          <div className="verify-card__actions">
            <Link to="/chat" className="btn btn--ghost">
              Ir a mensajeria
            </Link>
            <Link to="/estado" className="btn btn--primary">
              Ir al estado
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Resume la responsabilidad de ChatPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function ChatPage() {
  const session = readPortalSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const location = useLocation();
  const publicToken = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get('token') ?? session?.portalToken ?? '';
  }, [location.search, session?.portalToken]);
  const usePublicThread = publicToken !== '';
  const canAttemptChat = usePublicThread || Boolean(session?.contactEmail);

  const loadMessages = useCallback(async (options?: { background?: boolean; silent?: boolean }) => {
    if (!options?.background) {
      setLoading(true);
    }
    if (!options?.silent) {
      setStatus(null);
    }

    try {
      if (usePublicThread) {
        const response = await fetch(`${PORTAL_BASE}/${encodeURIComponent(publicToken)}/mensajes`);
        if (!response.ok) {
          throw new Error('No se pudo cargar el chat');
        }

        const data = (await response.json()) as ChatMessage[];
        setMessages(data.map(normalizeChatMessage));
      } else {
        const overview = await portalFetch<CompanyPortalOverview>('/api/portal-company/overview');
        setMessages(overview.messages.map(normalizeChatMessage));
      }
    } catch (err) {
      if (!options?.silent) {
        setStatus(err instanceof Error ? err.message : 'No se pudo cargar el chat.');
      }
    } finally {
      if (!options?.background) {
        setLoading(false);
      }
    }
  }, [publicToken, usePublicThread]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const refreshSilently = () => {
      if (document.visibilityState === 'visible') {
        void loadMessages({ background: true, silent: true });
      }
    };

    const intervalId = window.setInterval(refreshSilently, LIVE_REFRESH_MS);
    window.addEventListener('focus', refreshSilently);
    document.addEventListener('visibilitychange', refreshSilently);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshSilently);
      document.removeEventListener('visibilitychange', refreshSilently);
    };
  }, [loadMessages]);

  /**
   * Resume la responsabilidad de sendMessage dentro de este modulo y facilita seguir el flujo al revisarlo.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
  const sendMessage = () => {
    if (!draft.trim()) {
      return;
    }

    setLoading(true);
    const requestPromise = usePublicThread
      ? fetch(`${PORTAL_BASE}/${encodeURIComponent(publicToken)}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: draft.trim() }),
      }).then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => undefined);
          throw new Error(data?.message || 'No se pudo enviar el mensaje');
        }

        return normalizeChatMessage((await response.json()) as ChatMessage);
      })
      : portalFetch<ChatMessage>('/api/portal-company/messages', {
        method: 'POST',
        body: JSON.stringify({ texto: draft.trim() }),
      }).then((response) => normalizeChatMessage(response));

    requestPromise
      .then((message) => {
        setMessages((current) => [...current, message]);
        setDraft('');
        void loadMessages({ background: true, silent: true });
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
            {!canAttemptChat && <p className="alert alert--error">Inicia sesion o abre el enlace recibido por correo para consultar la mensajeria.</p>}
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
              disabled={!canAttemptChat || loading}
            />
            <button type="button" className="btn btn--primary" onClick={sendMessage} disabled={!canAttemptChat || loading}>
              Enviar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Resume la responsabilidad de ResourcesPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
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

/**
 * Resume la responsabilidad de CompanyLoginPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function CompanyLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
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
            <p>Accede con la cuenta previa de empresa para completar la solicitud, seguir el estado o trabajar ya con la empresa aprobada.</p>
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

/**
 * Resume la responsabilidad de ActivateAccountPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function ActivateAccountPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
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
            <h2>Definir contrasena inicial</h2>
            <p>Esta pantalla queda como respaldo para cuentas antiguas o activaciones por correo que todavia no tengan contrasena.</p>
          </div>
        </div>
        {status && <div className={`alert ${status.kind === 'success' ? 'alert--success' : 'alert--error'}`}>{status.message}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Nueva contrasena</span>
            <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <label>
            <span>Confirmar contrasena</span>
            <input type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
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

/**
 * Resume la responsabilidad de RequestResetPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
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

/**
 * Resume la responsabilidad de ResetPasswordPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function ResetPasswordPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
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
            <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <label>
            <span>Confirmar contrasena</span>
            <input type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
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

/**
 * Resume la responsabilidad de CompanyAreaPage dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function CompanyAreaPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<CompanyAuthMe | null>(null);
  const [overview, setOverview] = useState<CompanyPortalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [requestPayload, setRequestPayload] = useState<CompanyRequestPayload>({
    nombreEmpresa: '',
    cif: '',
    sector: '',
    ciudad: '',
    web: '',
    descripcion: '',
    contactoNombre: '',
    contactoTelefono: '',
  });

  /**
   * Resume la responsabilidad de loadOverview dentro de este modulo y facilita seguir el flujo al revisarlo.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
  const loadOverview = useCallback(async (options?: { background?: boolean; silent?: boolean }) => {
    if (!options?.background) {
      setLoading(true);
    }
    try {
      const [meResponse, overviewResponse] = await Promise.all([
        portalFetch<CompanyAuthMe>('/portal-auth/me'),
        portalFetch<CompanyPortalOverview>('/api/portal-company/overview'),
      ]);
      setMe(meResponse);
      setOverview(overviewResponse);
      setRequestPayload((current) => ({
        ...current,
        contactoNombre: current.contactoNombre || meResponse.displayName || '',
      }));
      if (!options?.silent) {
        setStatus(null);
      }
    } catch (err) {
      if (!options?.silent) {
        setStatus(err instanceof Error ? err.message : 'No se pudo cargar el panel privado.');
      }
      if (!options?.background) {
        setOverview(null);
        setMe(null);
      }
    } finally {
      if (!options?.background) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const refreshSilently = () => {
      if (document.visibilityState === 'visible') {
        void loadOverview({ background: true, silent: true });
      }
    };

    const intervalId = window.setInterval(refreshSilently, LIVE_REFRESH_MS);
    window.addEventListener('focus', refreshSilently);
    document.addEventListener('visibilitychange', refreshSilently);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshSilently);
      document.removeEventListener('visibilitychange', refreshSilently);
    };
  }, [loadOverview]);

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
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
      await loadOverview({ background: true });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.');
    }
  };

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
  const handleLogout = async () => {
    try {
      await portalFetch<void>('/portal-auth/logout', { method: 'POST' });
    } catch {
      // ignored
    } finally {
      clearPortalSession();
      navigate('/acceso');
    }
  };

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestLoading(true);
    setRequestFeedback(null);

    try {
      const response = await portalFetch<RegistroResponse>('/api/portal-company/request', {
        method: 'POST',
        body: JSON.stringify({
          nombreEmpresa: requestPayload.nombreEmpresa,
          cif: requestPayload.cif || undefined,
          sector: requestPayload.sector || undefined,
          ciudad: requestPayload.ciudad || undefined,
          web: requestPayload.web || undefined,
          descripcion: requestPayload.descripcion || undefined,
          contactoNombre: requestPayload.contactoNombre,
          contactoTelefono: requestPayload.contactoTelefono || undefined,
        }),
      });

      if (me?.email) {
        writePortalSession({
          verificationUrl: response.verificationUrl ?? undefined,
          companyName: requestPayload.nombreEmpresa,
          contactEmail: me.email,
          createdAt: new Date().toISOString(),
        });
      }

      setRequestFeedback({
        kind: 'success',
        message: response.message || 'Solicitud enviada correctamente.',
      });
      await loadOverview();
      navigate(`/correo?enviada=1&delivery=${encodeURIComponent(response.emailDelivery ?? 'sent')}`);
    } catch (err) {
      setRequestFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : 'No se pudo registrar la solicitud de colaboracion.',
      });
    } finally {
      setRequestLoading(false);
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

  const hasApprovedCompany = overview.company !== null;
  const requestStateLabel = overview.solicitud ? getStatusLabel(overview.solicitud.estado) : 'Sin solicitud';
  const requestTimeline = overview.solicitud ? [
    {
      label: 'Solicitud creada',
      detail: overview.solicitud.nombreEmpresa,
      done: true,
    },
    {
      label: 'Correo verificado',
      detail: overview.solicitud.emailVerificadoEn
        ? new Date(overview.solicitud.emailVerificadoEn).toLocaleString('es-ES')
        : 'Pendiente',
      done: Boolean(overview.solicitud.emailVerificadoEn),
    },
    {
      label: 'Revision interna',
      detail: requestStateLabel,
      done: ['email_verificado', 'aprobada', 'rechazada'].includes(overview.solicitud.estado),
    },
    {
      label: 'Aprobacion operativa',
      detail: overview.solicitud.aprobadoEn
        ? new Date(overview.solicitud.aprobadoEn).toLocaleString('es-ES')
        : 'Pendiente',
      done: Boolean(overview.solicitud.aprobadoEn),
    },
  ] : [];

  return (
    <div className="page">
      <section className="hero hero--landing">
        <div className="hero__copy">
          <p className="eyebrow">Area privada empresa</p>
          <h1>{overview.company?.nombre ?? overview.solicitud?.nombreEmpresa ?? (me.displayName ?? 'Portal de empresa')}</h1>
          <p className="lede">
            {hasApprovedCompany
              ? 'Cuenta activa para revisar convenios, asignaciones, documentacion y el canal operativo con el centro.'
              : 'Cuenta previa registrada. Desde aqui completas la solicitud, sigues el estado y mantienes el canal con el centro.'}
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => void loadOverview()}>Actualizar</button>
            <button type="button" className="btn btn--ghost" onClick={() => void handleLogout()}>Cerrar sesion</button>
          </div>
          <div className="metric-grid">
            <article className="metric-card"><span>Solicitud</span><strong>{requestStateLabel}</strong><small>{hasApprovedCompany ? 'Operativa completada' : 'Seguimiento del alta'}</small></article>
            <article className="metric-card"><span>Convenios</span><strong>{overview.convenios.length}</strong><small>{hasApprovedCompany ? 'Acuerdos visibles' : 'Apareceran tras la aprobacion'}</small></article>
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

      {!hasApprovedCompany && !overview.solicitud && (
        <>
          <section className="section-grid">
            <article className="surface-card">
              <p className="eyebrow">Cuenta</p>
              <h3>{me.displayName ?? me.email}</h3>
              <p>{me.email}</p>
              <small>Ultimo acceso: {overview.account.lastLoginAt ? new Date(overview.account.lastLoginAt).toLocaleString('es-ES') : 'Primera sesion'}</small>
            </article>
            <article className="surface-card">
              <p className="eyebrow">Siguiente paso</p>
              <h3>Completar solicitud</h3>
              <p>La cuenta ya existe. Ahora falta registrar la empresa, el contacto y el alcance de colaboracion.</p>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel panel--soft">
              <header className="panel__header">
                <div>
                  <p className="eyebrow">Solicitud de colaboracion</p>
                  <h2>Datos de la empresa</h2>
                </div>
              </header>
              {requestFeedback && <div className={`alert ${requestFeedback.kind === 'success' ? 'alert--success' : 'alert--error'}`}>{requestFeedback.message}</div>}
              <form className="form-grid" onSubmit={handleCreateRequest}>
                <label>
                  <span>Nombre de la empresa*</span>
                  <input required value={requestPayload.nombreEmpresa} onChange={(event) => setRequestPayload((current) => ({ ...current, nombreEmpresa: event.target.value }))} />
                </label>
                <label>
                  <span>CIF</span>
                  <input value={requestPayload.cif} onChange={(event) => setRequestPayload((current) => ({ ...current, cif: event.target.value }))} />
                </label>
                <label>
                  <span>Sector</span>
                  <input value={requestPayload.sector} onChange={(event) => setRequestPayload((current) => ({ ...current, sector: event.target.value }))} />
                </label>
                <label>
                  <span>Ciudad</span>
                  <input value={requestPayload.ciudad} onChange={(event) => setRequestPayload((current) => ({ ...current, ciudad: event.target.value }))} />
                </label>
                <label>
                  <span>Web</span>
                  <input type="url" placeholder="https://example.com" value={requestPayload.web} onChange={(event) => setRequestPayload((current) => ({ ...current, web: event.target.value }))} />
                </label>
                <label>
                  <span>Telefono de contacto</span>
                  <input value={requestPayload.contactoTelefono} onChange={(event) => setRequestPayload((current) => ({ ...current, contactoTelefono: event.target.value }))} />
                </label>
                <label className="full-row">
                  <span>Persona responsable*</span>
                  <input required value={requestPayload.contactoNombre} onChange={(event) => setRequestPayload((current) => ({ ...current, contactoNombre: event.target.value }))} />
                </label>
                <label className="full-row">
                  <span>Descripcion</span>
                  <textarea rows={4} value={requestPayload.descripcion} onChange={(event) => setRequestPayload((current) => ({ ...current, descripcion: event.target.value }))} placeholder="Perfiles, duracion, objetivos y alcance de la colaboracion." />
                </label>
                <div className="form__actions">
                  <button type="submit" className="btn btn--primary" disabled={requestLoading}>
                    {requestLoading ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                  <p className="form__hint">La verificacion del correo se hara sobre {me.email}.</p>
                </div>
              </form>
            </article>

            <article className="panel panel--dark">
              <header className="panel__header">
                <div>
                  <p className="eyebrow">Recorrido</p>
                  <h2>Que ocurrira despues</h2>
                </div>
              </header>
              <ul className="feature-list">
                <li>Se registra la solicitud vinculada a esta cuenta.</li>
                <li>Recibiras un correo de verificacion en el mismo email del portal.</li>
                <li>El centro revisara la propuesta desde el panel interno.</li>
                <li>El mismo acceso servira despues para chat, documentos y operativa.</li>
              </ul>
            </article>
          </section>
        </>
      )}

      {!hasApprovedCompany && overview.solicitud && (
        <>
          <section className="section-grid">
            <article className="surface-card">
              <p className="eyebrow">Solicitud</p>
              <h3>{overview.solicitud.nombreEmpresa}</h3>
              <p>{requestStateLabel}</p>
              <small>{overview.solicitud.contactoEmail}  |  {overview.solicitud.contactoTelefono ?? 'sin telefono'}</small>
            </article>
            <article className="surface-card">
              <p className="eyebrow">Estado</p>
              <h3>{overview.solicitud.aprobadoEn ? 'Aprobada' : 'En revision'}</h3>
              <p>{overview.solicitud.emailVerificadoEn ? 'Correo validado' : 'Pendiente de verificacion por correo'}</p>
              {overview.solicitud.motivoRechazo && <small>Motivo rechazo: {overview.solicitud.motivoRechazo}</small>}
            </article>
          </section>

          <section className="content-grid">
            <article className="panel panel--soft">
              <header className="panel__header">
                <div>
                  <p className="eyebrow">Seguimiento</p>
                  <h2>Linea temporal de la solicitud</h2>
                </div>
              </header>
              <div className="timeline">
                {requestTimeline.map((step) => (
                  <article key={step.label} className={`timeline__item${step.done ? ' timeline__item--done' : ''}`}>
                    <strong>{step.label}</strong>
                    <p>{step.detail}</p>
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
                  {overview.messages.length === 0 && <p className="detail-placeholder">Aun no hay mensajes en esta solicitud.</p>}
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
        </>
      )}

      {hasApprovedCompany && overview.company && (
        <>
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
        </>
      )}
    </div>
  );
}

/**
 * Resume la responsabilidad de App dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
