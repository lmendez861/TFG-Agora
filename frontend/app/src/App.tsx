import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DataTable, type TableColumn } from './components/DataTable';
import { DocumentationGuidePage } from './components/DocumentationGuidePage';
import { EstudianteForm, type EstudianteFormValues } from './components/EstudianteForm';
import { EmpresaForm, type EmpresaFormValues } from './components/EmpresaForm';
import { ConvenioForm, type ConvenioFormValues } from './components/ConvenioForm';
import { AsignacionForm, type AsignacionFormValues } from './components/AsignacionForm';
import { DashboardHomePage } from './components/DashboardHomePage';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { Modal } from './components/Modal';
import { MonitorPage } from './components/MonitorPage';
import { ToastStack, type ToastMessage } from './components/ToastStack';
import {
  advanceConvenioWorkflow,
  approveEmpresaSolicitud,
  createAsignacion,
  createConvenio,
  createEmpresa,
  createEstudiante,
  addConvenioDocument,
  addEmpresaDocument,
  dismissConvenioAlert,
  downloadCsvExport,
  fetchCollections,
  fetchEmpresaSolicitudes,
  fetchTutorAcademicos,
  fetchTutorProfesionales,
  getApiBaseUrl,
  getConfiguredAuthPassword,
  getConfiguredAuthUsername,
  getAsignacionDetail,
  getConvenioDetail,
  getConvenioExtras,
  getEmpresaDetail,
  getEstudianteDetail,
  toggleConvenioChecklist,
  updateAsignacion,
  updateConvenio,
  rejectEmpresaSolicitud,
  updateEmpresa,
  updateEstudiante,
  login,
  logout,
  fetchMe,
  fetchEmpresaMensajes,
  postEmpresaMensaje,
  type CsvExportScope,
} from './services/api';
import { downloadCsv, type CsvRow } from './utils/csv';
import {
  buildDashboardAnalytics,
  buildDashboardStats,
  getDashboardBaseRecordCount,
} from './utils/dashboard';
import { canPreviewDocument, resolveDocumentUrl } from './utils/documents';
import type {
  ApiCollections,
  AsignacionDetail,
  AsignacionPayload,
  AsignacionSummary,
  ConvenioDetail,
  ConvenioExtras,
  ConvenioPayload,
  ConvenioSummary,
  ConvenioDocumentRecord,
  EmpresaDetail,
  EmpresaPayload,
  EmpresaSummary,
  EmpresaSolicitudSummary,
  EmpresaSolicitudMensaje,
  EmpresaDocument,
  EstudianteDetail,
  EstudiantePayload,
  EstudianteSummary,
  TutorAcademicoSummary,
  TutorProfesionalSummary,
  MeResponse,
  PaginatedResponse,
} from './types';
import './App.css';

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });

function buildExportFilename(scope: string): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');

  return `agora-${scope}-${stamp}-${time}.csv`;
}

const SOLICITUD_ESTADO_LABELS: Record<EmpresaSolicitudSummary['estado'], string> = {
  pendiente: 'Pendiente',
  email_verificado: 'Correo verificado',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const TUTOR_PAGE_SIZE = 8;
const APP_BOOTSTRAP_CACHE_KEY = 'agora.internal.bootstrap.v1';
const EMPTY_COLLECTIONS: ApiCollections = {
  empresas: [],
  estudiantes: [],
  convenios: [],
  asignaciones: [],
};

interface BootstrapCachePayload {
  collections: ApiCollections;
  updatedAt: string;
}

function isCollectionArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function readBootstrapCache(): { collections: ApiCollections | null; updatedAt: Date | null } {
  if (typeof window === 'undefined') {
    return { collections: null, updatedAt: null };
  }

  try {
    const rawValue = window.localStorage.getItem(APP_BOOTSTRAP_CACHE_KEY);
    if (!rawValue) {
      return { collections: null, updatedAt: null };
    }

    const parsed = JSON.parse(rawValue) as Partial<BootstrapCachePayload>;
    const collections = parsed.collections;

    if (
      !collections ||
      !isCollectionArray(collections.empresas) ||
      !isCollectionArray(collections.estudiantes) ||
      !isCollectionArray(collections.convenios) ||
      !isCollectionArray(collections.asignaciones)
    ) {
      return { collections: null, updatedAt: null };
    }

    const updatedAt = parsed.updatedAt ? new Date(parsed.updatedAt) : null;

    return {
      collections,
      updatedAt: updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt : null,
    };
  } catch {
    return { collections: null, updatedAt: null };
  }
}

function persistBootstrapCache(collections: ApiCollections, updatedAt: Date): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload: BootstrapCachePayload = {
      collections,
      updatedAt: updatedAt.toISOString(),
    };

    window.localStorage.setItem(APP_BOOTSTRAP_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignorado: el panel funciona igualmente aunque no se pueda persistir el snapshot.
  }
}

function normalizeListResponse<T>(
  value: T[] | PaginatedResponse<T>,
  fallbackPerPage: number = TUTOR_PAGE_SIZE,
): { items: T[]; page: number; perPage: number; total: number } {
  if (Array.isArray(value)) {
    const total = value.length;
    return {
      items: value,
      page: 1,
      perPage: total > 0 ? Math.min(total, fallbackPerPage) : fallbackPerPage,
      total,
    };
  }

  return {
    items: value.items,
    page: value.page ?? 1,
    perPage: value.perPage ?? fallbackPerPage,
    total: value.total ?? value.items.length,
  };
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'N/D';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

const BASE_EMPRESA_COLUMNS: Array<TableColumn<EmpresaSummary>> = [
  { key: 'nombre', header: 'Empresa', render: (empresa) => empresa.nombre },
  { key: 'sector', header: 'Sector', render: (empresa) => empresa.sector ?? '-' },
  { key: 'ciudad', header: 'Ciudad', render: (empresa) => empresa.ciudad ?? '-' },
  { key: 'estado', header: 'Estado', render: (empresa) => empresa.estadoColaboracion, align: 'center' },
  {
    key: 'conveniosActivos',
    header: 'Convenios',
    render: (empresa) => empresa.conveniosActivos,
    align: 'center',
  },
  {
    key: 'asignaciones',
    header: 'Asignaciones (total / en curso)',
    render: (empresa) => `${empresa.asignaciones.total} / ${empresa.asignaciones.enCurso}`,
    align: 'center',
  },
];

const BASE_CONVENIO_COLUMNS: Array<TableColumn<ConvenioSummary>> = [
  { key: 'titulo', header: 'Convenio', render: (convenio) => convenio.titulo },
  {
    key: 'empresa',
    header: 'Empresa',
    render: (convenio) => convenio.empresa.nombre,
  },
  { key: 'tipo', header: 'Tipo', render: (convenio) => convenio.tipo },
  { key: 'estado', header: 'Estado', render: (convenio) => convenio.estado, align: 'center' },
  {
    key: 'fechaInicio',
    header: 'Inicio',
    render: (convenio) => formatDate(convenio.fechaInicio),
  },
  {
    key: 'fechaFin',
    header: 'Fin',
    render: (convenio) => formatDate(convenio.fechaFin),
  },
  {
    key: 'asignaciones',
    header: 'Asignaciones',
    render: (convenio) => convenio.asignacionesAsociadas,
    align: 'center',
  },
];

const BASE_ASIGNACION_COLUMNS: Array<TableColumn<AsignacionSummary>> = [
  {
    key: 'empresa',
    header: 'Empresa',
    render: (asignacion) => asignacion.empresa.nombre,
  },
  {
    key: 'estudiante',
    header: 'Estudiante',
    render: (asignacion) => `${asignacion.estudiante.nombre} ${asignacion.estudiante.apellido}`,
  },
  {
    key: 'modalidad',
    header: 'Modalidad',
    render: (asignacion) => asignacion.modalidad,
  },
  { key: 'estado', header: 'Estado', render: (asignacion) => asignacion.estado, align: 'center' },
  {
    key: 'inicio',
    header: 'Inicio',
    render: (asignacion) => formatDate(asignacion.fechaInicio),
  },
  {
    key: 'fin',
    header: 'Fin',
    render: (asignacion) => formatDate(asignacion.fechaFin),
  },
  {
    key: 'horas',
    header: 'Horas',
    render: (asignacion) => asignacion.horasTotales ?? '-',
    align: 'center',
  },
];

const EMPTY_STUDENT_VALUES: EstudianteFormValues = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  telefono: '',
  grado: '',
  curso: '',
  expediente: '',
  estado: 'disponible',
};

function cloneStudentForm(values: EstudianteFormValues): EstudianteFormValues {
  return { ...values };
}

function sanitizeValue(value: string | null | undefined): string {
  return value ?? '';
}

function mapSummaryToStudentForm(summary: EstudianteSummary): EstudianteFormValues {
  return {
    nombre: summary.nombre,
    apellido: summary.apellido,
    dni: summary.dni,
    email: summary.email,
    telefono: '',
    grado: sanitizeValue(summary.grado),
    curso: sanitizeValue(summary.curso),
    expediente: '',
    estado: summary.estado,
  };
}

function mapDetailToStudentForm(detail: EstudianteDetail): EstudianteFormValues {
  return {
    nombre: detail.nombre,
    apellido: detail.apellido,
    dni: detail.dni,
    email: detail.email,
    telefono: sanitizeValue(detail.telefono),
    grado: sanitizeValue(detail.grado),
    curso: sanitizeValue(detail.curso),
    expediente: sanitizeValue(detail.expediente),
    estado: detail.estado,
  };
}

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildEstudiantePayload(values: EstudianteFormValues): EstudiantePayload {
  const payload: EstudiantePayload = {
    nombre: values.nombre.trim(),
    apellido: values.apellido.trim(),
    dni: values.dni.trim(),
    email: values.email.trim(),
  };

  const telefono = trimOrUndefined(values.telefono);
  if (telefono) {
    payload.telefono = telefono;
  }

  const grado = trimOrUndefined(values.grado);
  if (grado) {
    payload.grado = grado;
  }

  const curso = trimOrUndefined(values.curso);
  if (curso) {
    payload.curso = curso;
  }

  const expediente = trimOrUndefined(values.expediente);
  if (expediente) {
    payload.expediente = expediente;
  }

  const estado = trimOrUndefined(values.estado);
  if (estado) {
    payload.estado = estado;
  }

  return payload;
}

const EMPTY_EMPRESA_VALUES: EmpresaFormValues = {
  nombre: '',
  sector: '',
  direccion: '',
  ciudad: '',
  provincia: '',
  pais: '',
  telefono: '',
  email: '',
  web: '',
  estadoColaboracion: '',
  fechaAlta: '',
  observaciones: '',
};

function cloneEmpresaForm(values: EmpresaFormValues): EmpresaFormValues {
  return { ...values };
}

function mapEmpresaDetailToForm(detail: EmpresaDetail): EmpresaFormValues {
  return {
    nombre: detail.nombre ?? '',
    sector: sanitizeValue(detail.sector),
    direccion: sanitizeValue(detail.direccion),
    ciudad: sanitizeValue(detail.ciudad),
    provincia: sanitizeValue(detail.provincia),
    pais: sanitizeValue(detail.pais),
    telefono: sanitizeValue(detail.telefono),
    email: sanitizeValue(detail.email),
    web: sanitizeValue(detail.web),
    estadoColaboracion: sanitizeValue(detail.estadoColaboracion),
    fechaAlta: detail.fechaAlta ?? '',
    observaciones: sanitizeValue(detail.observaciones),
  };
}

function mapEmpresaSummaryToForm(summary: EmpresaSummary): EmpresaFormValues {
  return {
    nombre: summary.nombre,
    sector: sanitizeValue(summary.sector),
    direccion: '',
    ciudad: sanitizeValue(summary.ciudad),
    provincia: '',
    pais: '',
    telefono: '',
    email: '',
    web: '',
    estadoColaboracion: sanitizeValue(summary.estadoColaboracion),
    fechaAlta: '',
    observaciones: '',
  };
}

function buildEmpresaPayload(values: EmpresaFormValues): EmpresaPayload {
  const payload: EmpresaPayload = {
    nombre: values.nombre.trim(),
  };

  const sector = trimOrUndefined(values.sector);
  if (sector) {
    payload.sector = sector;
  }
  const direccion = trimOrUndefined(values.direccion);
  if (direccion) {
    payload.direccion = direccion;
  }
  const ciudad = trimOrUndefined(values.ciudad);
  if (ciudad) {
    payload.ciudad = ciudad;
  }
  const provincia = trimOrUndefined(values.provincia);
  if (provincia) {
    payload.provincia = provincia;
  }
  const pais = trimOrUndefined(values.pais);
  if (pais) {
    payload.pais = pais;
  }
  const telefono = trimOrUndefined(values.telefono);
  if (telefono) {
    payload.telefono = telefono;
  }
  const email = trimOrUndefined(values.email);
  if (email) {
    payload.email = email;
  }
  const web = trimOrUndefined(values.web);
  if (web) {
    payload.web = web;
  }
  const estadoColaboracion = trimOrUndefined(values.estadoColaboracion);
  if (estadoColaboracion) {
    payload.estadoColaboracion = estadoColaboracion;
  }
  const observaciones = trimOrUndefined(values.observaciones);
  if (observaciones) {
    payload.observaciones = observaciones;
  }

  if (values.fechaAlta.trim()) {
    payload.fechaAlta = values.fechaAlta;
  }

  return payload;
}

const EMPTY_CONVENIO_VALUES: ConvenioFormValues = {
  empresaId: '',
  titulo: '',
  tipo: '',
  descripcion: '',
  estado: '',
  fechaInicio: '',
  fechaFin: '',
  documentoUrl: '',
  observaciones: '',
};

function cloneConvenioForm(values: ConvenioFormValues): ConvenioFormValues {
  return { ...values };
}

function mapConvenioDetailToForm(detail: ConvenioDetail): ConvenioFormValues {
  return {
    empresaId: String(detail.empresa.id),
    titulo: detail.titulo,
    tipo: detail.tipo,
    descripcion: sanitizeValue(detail.descripcion),
    estado: sanitizeValue(detail.estado),
    fechaInicio: detail.fechaInicio,
    fechaFin: sanitizeValue(detail.fechaFin),
    documentoUrl: sanitizeValue(detail.documentoUrl),
    observaciones: sanitizeValue(detail.observaciones),
  };
}

function mapConvenioSummaryToForm(summary: ConvenioSummary): ConvenioFormValues {
  return {
    empresaId: String(summary.empresa.id),
    titulo: summary.titulo,
    tipo: summary.tipo,
    descripcion: '',
    estado: summary.estado,
    fechaInicio: summary.fechaInicio,
    fechaFin: sanitizeValue(summary.fechaFin),
    documentoUrl: '',
    observaciones: '',
  };
}

function buildConvenioPayload(values: ConvenioFormValues): ConvenioPayload {
  const payload: ConvenioPayload = {
    empresaId: parseInt(values.empresaId, 10),
    titulo: values.titulo.trim(),
    tipo: values.tipo.trim(),
    fechaInicio: values.fechaInicio,
  };

  const descripcion = trimOrUndefined(values.descripcion);
  if (descripcion) {
    payload.descripcion = descripcion;
  }
  const estado = trimOrUndefined(values.estado);
  if (estado) {
    payload.estado = estado;
  }
  const documentoUrl = trimOrUndefined(values.documentoUrl);
  if (documentoUrl) {
    payload.documentoUrl = documentoUrl;
  }
  const observaciones = trimOrUndefined(values.observaciones);
  if (observaciones) {
    payload.observaciones = observaciones;
  }

  if (values.fechaFin.trim()) {
    payload.fechaFin = values.fechaFin;
  } else {
    payload.fechaFin = null;
  }

  return payload;
}

const EMPTY_ASIGNACION_VALUES: AsignacionFormValues = {
  estudianteId: '',
  empresaId: '',
  convenioId: '',
  tutorAcademicoId: '',
  tutorProfesionalId: '',
  fechaInicio: '',
  fechaFin: '',
  modalidad: '',
  horasTotales: '',
  estado: '',
};

function cloneAsignacionForm(values: AsignacionFormValues): AsignacionFormValues {
  return { ...values };
}

function mapAsignacionDetailToForm(detail: AsignacionDetail): AsignacionFormValues {
  return {
    estudianteId: String(detail.estudiante.id),
    empresaId: String(detail.empresa.id),
    convenioId: String(detail.convenio.id),
    tutorAcademicoId: String(detail.tutorAcademico.id),
    tutorProfesionalId: detail.tutorProfesional ? String(detail.tutorProfesional.id) : '',
    fechaInicio: detail.fechaInicio,
    fechaFin: sanitizeValue(detail.fechaFin),
    modalidad: detail.modalidad,
    horasTotales: detail.horasTotales?.toString() ?? '',
    estado: detail.estado,
  };
}

function mapAsignacionSummaryToForm(summary: AsignacionSummary): AsignacionFormValues {
  return {
    estudianteId: String(summary.estudiante.id),
    empresaId: String(summary.empresa.id),
    convenioId: '',
    tutorAcademicoId: '',
    tutorProfesionalId: '',
    fechaInicio: summary.fechaInicio,
    fechaFin: sanitizeValue(summary.fechaFin),
    modalidad: summary.modalidad,
    horasTotales: summary.horasTotales?.toString() ?? '',
    estado: summary.estado,
  };
}

function buildAsignacionPayload(values: AsignacionFormValues): AsignacionPayload {
  const payload: AsignacionPayload = {
    estudianteId: parseInt(values.estudianteId, 10),
    empresaId: parseInt(values.empresaId, 10),
    convenioId: parseInt(values.convenioId, 10),
    tutorAcademicoId: parseInt(values.tutorAcademicoId, 10),
    fechaInicio: values.fechaInicio,
    modalidad: values.modalidad.trim(),
    estado: values.estado.trim(),
  };

  if (values.tutorProfesionalId) {
    payload.tutorProfesionalId = parseInt(values.tutorProfesionalId, 10);
  } else {
    payload.tutorProfesionalId = null;
  }

  if (values.fechaFin.trim()) {
    payload.fechaFin = values.fechaFin;
  } else {
    payload.fechaFin = null;
  }

  if (values.horasTotales.trim()) {
    payload.horasTotales = Number(values.horasTotales);
  } else {
    payload.horasTotales = null;
  }

  return payload;
}

interface ReferenceData {
  tutoresAcademicos: TutorAcademicoSummary[];
  tutoresProfesionales: TutorProfesionalSummary[];
}

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `toast-${Math.random().toString(36).slice(2)}`;
};

interface EntityModalState<TValues> {
  mode: 'create' | 'edit';
  entityId?: number;
  initialValues: TValues;
  loadingValues: boolean;
}

type StudentModalState = EntityModalState<EstudianteFormValues>;
type EmpresaModalState = EntityModalState<EmpresaFormValues>;
type ConvenioModalState = EntityModalState<ConvenioFormValues>;
type AsignacionModalState = EntityModalState<AsignacionFormValues>;

type StudentDetailTab = 'academico' | 'asignaciones' | 'seguimiento';
type EmpresaNote = {
  id: number;
  author: string;
  content: string;
  timestamp: string;
};

type ConvenioChecklistItem = {
  id: number;
  label: string;
  completed: boolean;
};

type ConvenioAlert = {
  id: number;
  message: string;
  level: 'info' | 'warning';
  active: boolean;
};

type DocumentPreviewState = {
  title: string;
  url: string | null;
};

const CONVENIO_STEP_FLOW = ['borrador', 'revisado', 'firmado', 'vigente', 'renovacion', 'finalizado'];

interface LoginPageProps {
  onLogin: (user: MeResponse) => Promise<void> | void;
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState(getConfiguredAuthUsername());
  const [password, setPassword] = useState(getConfiguredAuthPassword());
  const [status, setStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Autenticando...');
    try {
      await login(email, password);
      const meData = await fetchMe();
      await onLogin(meData);
      setStatus(`Bienvenido ${meData.username}`);
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesion.';
      setStatus(message);
    }
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="auth-card__eyebrow">Bienvenido de nuevo</p>
        <h2>Iniciar sesion</h2>
        <p className="auth-card__description">
          Inicia sesion con tus credenciales. Las llamadas posteriores usan la sesion del navegador.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form__field">
            <span>Usuario</span>
            <input
              type="text"
              placeholder="admin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="form__field">
            <span>Contrasena</span>
            <input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" className="button button--primary button--lg">
            Entrar
          </button>
          {status && <p className="form__error">{status}</p>}
          <p className="auth-card__hint">
            Credenciales gestionadas desde `.env.local`. Si cambian en backend, actualiza tambien `VITE_API_USERNAME` y `VITE_API_PASSWORD`.
          </p>
        </form>
      </div>
    </section>
  );
}

const API_BASE_URL = getApiBaseUrl();

export default function App() {
  const cachedBootstrap = useMemo(() => readBootstrapCache(), []);
  const [collections, setCollections] = useState<ApiCollections | null>(cachedBootstrap.collections);
  const [loading, setLoading] = useState<boolean>(cachedBootstrap.collections === null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(cachedBootstrap.updatedAt);
  const [studentModal, setStudentModal] = useState<StudentModalState | null>(null);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [empresaModal, setEmpresaModal] = useState<EmpresaModalState | null>(null);
  const [empresaFormError, setEmpresaFormError] = useState<string | null>(null);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [convenioModal, setConvenioModal] = useState<ConvenioModalState | null>(null);
  const [convenioFormError, setConvenioFormError] = useState<string | null>(null);
  const [savingConvenio, setSavingConvenio] = useState(false);
  const [asignacionModal, setAsignacionModal] = useState<AsignacionModalState | null>(null);
  const [asignacionFormError, setAsignacionFormError] = useState<string | null>(null);
  const [savingAsignacion, setSavingAsignacion] = useState(false);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const rawPathname = typeof window === 'undefined' ? location.pathname : window.location.pathname;
  const isDocumentationRoute = rawPathname === '/documentacion'
    || rawPathname.startsWith('/documentacion/')
    || rawPathname === '/app/documentacion'
    || rawPathname.startsWith('/app/documentacion/');
  const isMonitorRoute = rawPathname === '/monitor'
    || rawPathname.startsWith('/monitor/')
    || rawPathname === '/app/monitor'
    || rawPathname.startsWith('/app/monitor/');
  const isEmpresasRoute = rawPathname === '/empresas'
    || rawPathname.startsWith('/empresas/')
    || rawPathname === '/app/empresas'
    || rawPathname.startsWith('/app/empresas/');
  const isConveniosRoute = rawPathname === '/convenios'
    || rawPathname.startsWith('/convenios/')
    || rawPathname === '/app/convenios'
    || rawPathname.startsWith('/app/convenios/');
  const isTutoresRoute = rawPathname === '/tutores'
    || rawPathname.startsWith('/tutores/')
    || rawPathname === '/app/tutores'
    || rawPathname.startsWith('/app/tutores/');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [empresaSectorFilter, setEmpresaSectorFilter] = useState<string>('todos');
  const [selectedConvenioId, setSelectedConvenioId] = useState<number | null>(null);
  const [convenioEstadoFilter, setConvenioEstadoFilter] = useState<string>('todos');
  const [convenioEmpresaFilter, setConvenioEmpresaFilter] = useState<string>('todos');
  const [selectedStudent, setSelectedStudent] = useState<EstudianteSummary | null>(null);
  const [studentEstadoFilter, setStudentEstadoFilter] = useState<string>('todos');
  const [selectedAsignacion, setSelectedAsignacion] = useState<AsignacionSummary | null>(null);
  const [asignacionEstadoFilter, setAsignacionEstadoFilter] = useState<string>('todos');
  const [asignacionModalidadFilter, setAsignacionModalidadFilter] = useState<string>('todas');
  const [studentDetailTab, setStudentDetailTab] = useState<StudentDetailTab>('academico');
  const [empresaNotes, setEmpresaNotes] = useState<Record<number, EmpresaNote[]>>({});
  const [empresaLabels, setEmpresaLabels] = useState<Record<number, string[]>>({});
  const [empresaDocs, setEmpresaDocs] = useState<Record<number, EmpresaDocument[]>>({});
  const [convenioChecklist, setConvenioChecklist] = useState<Record<number, ConvenioChecklistItem[]>>({});
  const [convenioDocuments, setConvenioDocuments] = useState<Record<number, ConvenioDocumentRecord[]>>({});
  const [convenioAlerts, setConvenioAlerts] = useState<Record<number, ConvenioAlert[]>>({});
  const [convenioWorkflowState, setConvenioWorkflowState] = useState<Record<number, string>>({});
  const [loadingConvenioExtrasId, setLoadingConvenioExtrasId] = useState<number | null>(null);
  const [processingConvenioActionId, setProcessingConvenioActionId] = useState<number | null>(null);
  const [empresaSolicitudes, setEmpresaSolicitudes] = useState<EmpresaSolicitudSummary[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [processingSolicitudId, setProcessingSolicitudId] = useState<number | null>(null);
  const [solicitudMensajes, setSolicitudMensajes] = useState<Record<number, EmpresaSolicitudMensaje[]>>({});
  const [mensajeDraft, setMensajeDraft] = useState<Record<number, string>>({});
  const [loadingMensajesId, setLoadingMensajesId] = useState<number | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tutorAcademicosList, setTutorAcademicosList] = useState<TutorAcademicoSummary[]>([]);
  const [tutorAcademicoPage, setTutorAcademicoPage] = useState(1);
  const [tutorAcademicoTotal, setTutorAcademicoTotal] = useState(0);
  const [tutorAcademicoEstado, setTutorAcademicoEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [loadingTutorAcademicos, setLoadingTutorAcademicos] = useState(false);
  const [tutorProfesionalesList, setTutorProfesionalesList] = useState<TutorProfesionalSummary[]>([]);
  const [tutorProfesionalPage, setTutorProfesionalPage] = useState(1);
  const [tutorProfesionalTotal, setTutorProfesionalTotal] = useState(0);
  const [tutorProfesionalEstado, setTutorProfesionalEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [tutorProfesionalEmpresa, setTutorProfesionalEmpresa] = useState<string>('todas');
  const [loadingTutorProfesionales, setLoadingTutorProfesionales] = useState(false);
  const [loadingReferenceData, setLoadingReferenceData] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<DocumentPreviewState | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const skipInitialTutorFilterLoad = useRef(false);


  const [savingConvenioDocument, setSavingConvenioDocument] = useState(false);

  const openCreateStudent = useCallback(() => {
    setStudentFormError(null);
    setStudentModal({
      mode: 'create',
      initialValues: cloneStudentForm(EMPTY_STUDENT_VALUES),
      loadingValues: false,
    });
  }, []);
  const pushToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = randomId();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const syncConvenioState = useCallback((convenioId: number, estado: string) => {
    setConvenioWorkflowState((prev) => ({ ...prev, [convenioId]: estado }));
    setCollections((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        convenios: prev.convenios.map((convenio) =>
          convenio.id === convenioId ? { ...convenio, estado } : convenio,
        ),
      };
    });
  }, []);

  const applyConvenioExtras = useCallback((
    convenioId: number,
    extras: Pick<ConvenioExtras, 'workflow' | 'checklist' | 'documents' | 'alerts'>,
  ) => {
    syncConvenioState(convenioId, extras.workflow.current);
    setConvenioChecklist((prev) => ({
      ...prev,
      [convenioId]: extras.checklist.map((item) => ({
        id: item.id,
        label: item.label,
        completed: item.completed,
      })),
    }));
    setConvenioDocuments((prev) => ({
      ...prev,
      [convenioId]: extras.documents,
    }));
    setConvenioAlerts((prev) => ({
      ...prev,
      [convenioId]: extras.alerts.map((alert) => ({
        id: alert.id,
        message: alert.message,
        level: alert.level === 'warning' ? 'warning' : 'info',
        active: alert.active,
      })),
    }));
  }, [syncConvenioState]);

  const exportCsv = useCallback((scope: string, rows: CsvRow[], emptyMessage: string) => {
    if (rows.length === 0) {
      pushToast('error', emptyMessage);
      return;
    }

    downloadCsv(buildExportFilename(scope), rows);
    pushToast('success', `CSV generado con ${rows.length} registros.`);
  }, [pushToast]);

  const exportApiCsv = useCallback(async (
    scope: CsvExportScope,
    hasRows: boolean,
    emptyMessage: string,
    params?: Record<string, string | number | boolean | null | undefined>,
  ) => {
    if (!hasRows) {
      pushToast('error', emptyMessage);
      return;
    }

    try {
      await downloadCsvExport(scope, buildExportFilename(scope), params);
      pushToast('success', 'CSV descargado correctamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo descargar el CSV.';
      pushToast('error', message);
    }
  }, [pushToast]);

  const openDocumentPreview = useCallback((title: string, url: string | null) => {
    setDocumentPreview({ title, url });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toggleNotifications = useCallback(() => {
    setNotificationsOpen((prev) => !prev);
  }, []);

  const closeNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  const openSolicitudesPage = useCallback(() => {
    setNotificationsOpen(false);
    navigate('/solicitudes');
  }, [navigate]);

  const handleAddEmpresaNote = useCallback((empresaId: number, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return false;
    }
    setEmpresaNotes((prev) => {
      const notes = prev[empresaId] ?? [];
        const newNote: EmpresaNote = {
          id: Date.now(),
          author: 'Coordinacion',
          content: trimmed,
          timestamp: new Date().toISOString(),
        };
      return { ...prev, [empresaId]: [newNote, ...notes] };
    });
    return true;
  }, []);

  const handleAddEmpresaLabel = useCallback((empresaId: number, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) {
      return false;
    }
    setEmpresaLabels((prev) => {
      const labels = prev[empresaId] ?? [];
      if (labels.includes(trimmed)) {
        return prev;
      }
      return { ...prev, [empresaId]: [...labels, trimmed] };
    });
    return true;
  }, []);

  const handleRemoveEmpresaLabel = useCallback((empresaId: number, label: string) => {
    setEmpresaLabels((prev) => {
      const labels = prev[empresaId] ?? [];
      return { ...prev, [empresaId]: labels.filter((item) => item !== label) };
    });
  }, []);

  const handleAddEmpresaDocument = useCallback(async (
    empresaId: number,
    name: string,
    type: string,
    urlOrFile?: string | File,
  ) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return false;
    }
    const typeValue = type.trim() || undefined;
    const urlValue = typeof urlOrFile === 'string' ? (urlOrFile.trim() || undefined) : undefined;
    const fileValue = urlOrFile instanceof File ? urlOrFile : undefined;
    setSavingConvenioDocument(true);
    try {
      const nuevo = await addEmpresaDocument(empresaId, trimmedName, typeValue, urlValue, fileValue);
      setEmpresaDocs((prev) => {
        const docs = prev[empresaId] ?? [];
        return { ...prev, [empresaId]: [nuevo, ...docs] };
      });
      pushToast('success', 'Documento anadido.');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo subir el documento.';
      pushToast('error', message);
      return false;
    } finally {
      setSavingConvenioDocument(false);
    }
  }, [pushToast]);

  const loadConvenioExtras = useCallback(
    async (convenioId: number, options?: { silent?: boolean; background?: boolean }) => {
      if (!options?.background) {
        setLoadingConvenioExtrasId(convenioId);
      }

      try {
        const extras = await getConvenioExtras(convenioId);
        applyConvenioExtras(convenioId, extras);
        return extras;
      } catch (err) {
        if (!options?.silent) {
          const message = err instanceof Error ? err.message : 'No se pudieron cargar los extras del convenio.';
          pushToast('error', message);
        }
        return null;
      } finally {
        if (!options?.background) {
          setLoadingConvenioExtrasId((current) => (current === convenioId ? null : current));
        }
      }
    },
    [applyConvenioExtras, pushToast],
  );

  const handleToggleChecklistItem = useCallback(async (convenioId: number, itemId: number) => {
    setProcessingConvenioActionId(convenioId);
    try {
      const updated = await toggleConvenioChecklist(convenioId, itemId);
      setConvenioChecklist((prev) => {
        const items = prev[convenioId] ?? [];
        return {
          ...prev,
          [convenioId]: items.map((item) =>
            item.id === itemId ? { ...item, completed: updated.completed } : item,
          ),
        };
      });
      pushToast('success', 'Checklist actualizado.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el checklist.';
      pushToast('error', message);
    } finally {
      setProcessingConvenioActionId((current) => (current === convenioId ? null : current));
    }
  }, [pushToast]);

  const handleAdvanceConvenioState = useCallback(async (convenioId: number) => {
    setProcessingConvenioActionId(convenioId);
    try {
      const response = await advanceConvenioWorkflow(convenioId);
      syncConvenioState(convenioId, response.estado);
      pushToast('success', `Convenio ${convenioId} cambia a ${response.estado}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo avanzar el estado del convenio.';
      pushToast('error', message);
    } finally {
      setProcessingConvenioActionId((current) => (current === convenioId ? null : current));
    }
  }, [pushToast, syncConvenioState]);

  const handleAddConvenioDocument = useCallback(async (convenioId: number, name: string, type: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return false;
    }
    setSavingConvenioDocument(true);
    try {
      const nuevo = await addConvenioDocument(convenioId, trimmedName, type.trim() || undefined);
      setConvenioDocuments((prev) => {
        const docs = prev[convenioId] ?? [];
        return {
          ...prev,
          [convenioId]: [nuevo, ...docs],
        };
      });
      pushToast('success', 'Documento anadido.');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo subir el documento.';
      pushToast('error', message);
      return false;
    } finally {
      setSavingConvenioDocument(false);
    }
  }, [pushToast]);

  const handleDismissConvenioAlert = useCallback(async (convenioId: number, alertId: number) => {
    setProcessingConvenioActionId(convenioId);
    try {
      const updated = await dismissConvenioAlert(convenioId, alertId);
      setConvenioAlerts((prev) => {
        const alerts = prev[convenioId] ?? [];
        return {
          ...prev,
          [convenioId]: alerts.map((alert) =>
            alert.id === alertId ? { ...alert, active: updated.active } : alert,
          ),
        };
      });
      pushToast('success', 'Alerta marcada como resuelta.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la alerta.';
      pushToast('error', message);
    } finally {
      setProcessingConvenioActionId((current) => (current === convenioId ? null : current));
    }
  }, [pushToast]);

  const refreshSolicitudes = useCallback(
    async (options?: { silent?: boolean }) => {
      setLoadingSolicitudes(true);
      try {
        const data = await fetchEmpresaSolicitudes();
        setEmpresaSolicitudes(data.items.filter((solicitud) => solicitud.estado !== 'aprobada'));
      } catch (err) {
        if (!options?.silent) {
          const message =
            err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes de empresas.';
          pushToast('error', message);
        }
      } finally {
        setLoadingSolicitudes(false);
      }
    },
    [pushToast, me],
  );

  const loadReferenceData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (loadingReferenceData) {
        return;
      }

      setLoadingReferenceData(true);

      try {
        const [tutoresAcademicos, tutoresProfesionales] = await Promise.allSettled([
          fetchTutorAcademicos(),
          fetchTutorProfesionales(),
        ]);

        let academicosItems: TutorAcademicoSummary[] = [];
        let academicosPage = 1;
        let academicosTotal = 0;

        if (tutoresAcademicos.status === 'fulfilled') {
          const normalizedAcademicos = normalizeListResponse(tutoresAcademicos.value);
          academicosItems = normalizedAcademicos.items;
          academicosPage = normalizedAcademicos.page;
          academicosTotal = normalizedAcademicos.total;
          setTutorAcademicosList(normalizedAcademicos.items);
          setTutorAcademicoPage(normalizedAcademicos.page);
          setTutorAcademicoTotal(normalizedAcademicos.total);
        }

        let profesionalesItems: TutorProfesionalSummary[] = [];
        let profesionalesPage = 1;
        let profesionalesTotal = 0;

        if (tutoresProfesionales.status === 'fulfilled') {
          const normalizedProfesionales = normalizeListResponse(tutoresProfesionales.value);
          profesionalesItems = normalizedProfesionales.items;
          profesionalesPage = normalizedProfesionales.page;
          profesionalesTotal = normalizedProfesionales.total;
          setTutorProfesionalesList(normalizedProfesionales.items);
          setTutorProfesionalPage(normalizedProfesionales.page);
          setTutorProfesionalTotal(normalizedProfesionales.total);
        }

        setReferenceData({
          tutoresAcademicos: academicosItems,
          tutoresProfesionales: profesionalesItems,
        });

        if (academicosItems.length > 0 || profesionalesItems.length > 0) {
          skipInitialTutorFilterLoad.current = true;
        }

        if (tutoresAcademicos.status !== 'fulfilled' && tutoresProfesionales.status !== 'fulfilled' && !options?.silent) {
          pushToast('error', 'No se pudieron cargar los datos de referencia de tutores.');
        }

        return {
          academicosPage,
          academicosTotal,
          profesionalesPage,
          profesionalesTotal,
        };
      } finally {
        setLoadingReferenceData(false);
      }
    },
    [loadingReferenceData, pushToast],
  );

  const loadMensajes = useCallback(async (solicitudId: number) => {
    setLoadingMensajesId(solicitudId);
    try {
      const msgs = await fetchEmpresaMensajes(solicitudId);
      setSolicitudMensajes((prev) => ({ ...prev, [solicitudId]: msgs }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los mensajes.';
      pushToast('error', message);
    } finally {
      setLoadingMensajesId(null);
    }
  }, [pushToast]);

  const handleSendMensaje = useCallback(
    async (solicitudId: number) => {
      const draft = mensajeDraft[solicitudId]?.trim();
      if (!draft) {
        return;
      }
      setLoadingMensajesId(solicitudId);
      try {
        const nuevo = await postEmpresaMensaje(solicitudId, 'centro', draft);
        setSolicitudMensajes((prev) => ({
          ...prev,
          [solicitudId]: [...(prev[solicitudId] ?? []), nuevo],
        }));
        setMensajeDraft((prev) => ({ ...prev, [solicitudId]: '' }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo enviar el mensaje.';
        pushToast('error', message);
      } finally {
        setLoadingMensajesId(null);
      }
    },
    [mensajeDraft, pushToast],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchCollections();
      const updatedAt = new Date();
      setCollections(data);
      setLastUpdated(updatedAt);
      persistBootstrapCache(data, updatedAt);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar los datos.');
      }
      setCollections((prev) => prev ?? EMPTY_COLLECTIONS);
      setReferenceData((prev) => prev ?? {
        tutoresAcademicos: [],
        tutoresProfesionales: [],
      });
      setTutorAcademicosList((prev) => prev ?? []);
      setTutorProfesionalesList((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }

    refreshSolicitudes({ silent: true }).catch(() => {
      // Se refresca en segundo plano para no bloquear el arranque del panel.
    });
  }, [refreshSolicitudes]);

  const loadTutorAcademicosList = useCallback(
    async (page: number, estado: 'todos' | 'activos' | 'inactivos') => {
      if (!me) return;
      setLoadingTutorAcademicos(true);
      try {
        const response = await fetchTutorAcademicos({
          page,
          perPage: TUTOR_PAGE_SIZE,
          activo: estado === 'todos' ? undefined : estado === 'activos',
        });
        const normalized = normalizeListResponse(response);
        setTutorAcademicosList(normalized.items);
        setTutorAcademicoPage(normalized.page);
        setTutorAcademicoTotal(normalized.total);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los tutores academicos.';
        pushToast('error', message);
      } finally {
        setLoadingTutorAcademicos(false);
      }
    },
    [me, pushToast],
  );

  const loadTutorProfesionalesList = useCallback(
    async (
      page: number,
      estado: 'todos' | 'activos' | 'inactivos',
      empresaId: string,
    ) => {
      if (!me) return;
      setLoadingTutorProfesionales(true);
      try {
        const response = await fetchTutorProfesionales({
          page,
          perPage: TUTOR_PAGE_SIZE,
          activo: estado === 'todos' ? undefined : estado === 'activos',
          empresaId: empresaId === 'todas' ? undefined : Number(empresaId),
        });
        const normalized = normalizeListResponse(response);
        setTutorProfesionalesList(normalized.items);
        setTutorProfesionalPage(normalized.page);
        setTutorProfesionalTotal(normalized.total);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los tutores profesionales.';
        pushToast('error', message);
      } finally {
        setLoadingTutorProfesionales(false);
      }
    },
    [me, pushToast],
  );

  useEffect(() => {
    if (isDocumentationRoute || authResolved) {
      if (isDocumentationRoute) {
        setLoading(false);
        setAuthError(null);
        setAuthResolved(true);
      }
      return undefined;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const user = await fetchMe();
        if (cancelled) {
          return;
        }

        setMe(user);
        setAuthError(null);
        await loadData();
      } catch (err) {
        if (cancelled) {
          return;
        }

      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesion.';
        if (message.startsWith('Error 401')) {
          setMe(null);
          setAuthError(null);
          setCollections(null);
          setReferenceData(null);
          setLastUpdated(null);
        } else {
          setAuthError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAuthResolved(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authResolved, isDocumentationRoute, loadData]);
  useEffect(() => {
    if (isTutoresRoute && !referenceData && !loadingReferenceData) {
      loadReferenceData({ silent: true }).catch(() => {
        // errores gestionados dentro
      });
      return;
    }

    if (!isTutoresRoute) {
      return;
    }

    if (
      skipInitialTutorFilterLoad.current &&
      tutorAcademicoEstado === 'todos' &&
      tutorProfesionalEstado === 'todos' &&
      tutorProfesionalEmpresa === 'todas'
    ) {
      skipInitialTutorFilterLoad.current = false;
      return;
    }

    setTutorAcademicoPage(1);
    setTutorProfesionalPage(1);
    loadTutorAcademicosList(1, tutorAcademicoEstado);
    loadTutorProfesionalesList(1, tutorProfesionalEstado, tutorProfesionalEmpresa);
  }, [
    isTutoresRoute,
    tutorAcademicoEstado,
    tutorProfesionalEstado,
    tutorProfesionalEmpresa,
    loadReferenceData,
    loadTutorAcademicosList,
    loadTutorProfesionalesList,
    loadingReferenceData,
    referenceData,
  ]);

  useEffect(() => {
    if (!isEmpresasRoute) {
      return;
    }

    if (!collections || collections.empresas.length === 0) {
      return;
    }

    const empresaId = selectedEmpresaId ?? collections.empresas[0].id;
    if (Array.isArray(empresaDocs[empresaId])) {
      return;
    }

    let cancelled = false;

    getEmpresaDetail(empresaId)
      .then((detail) => {
        if (cancelled) {
          return;
        }

        setEmpresaDocs((prev) => (
          Array.isArray(prev[empresaId])
            ? prev
            : { ...prev, [empresaId]: detail.documentos ?? [] }
        ));
      })
      .catch(() => {
        // Carga diferida silenciosa: la ficha puede seguir funcionando sin bloquear el panel.
      });

    return () => {
      cancelled = true;
    };
  }, [collections, empresaDocs, isEmpresasRoute, selectedEmpresaId]);

  useEffect(() => {
    if (collections) {
      if (!selectedEmpresaId && collections.empresas.length > 0) {
        setSelectedEmpresaId(collections.empresas[0].id);
      }
      if (!selectedConvenioId && collections.convenios.length > 0) {
      setSelectedConvenioId(collections.convenios[0].id);
      }
    }
  }, [collections, selectedEmpresaId, selectedConvenioId]);

  useEffect(() => {
    if (!isConveniosRoute) {
      return;
    }

    if (!collections || collections.convenios.length === 0) {
      return;
    }

    const convenioId = selectedConvenioId ?? collections.convenios[0].id;
    const hasCache =
      Boolean(convenioWorkflowState[convenioId]) &&
      Array.isArray(convenioChecklist[convenioId]) &&
      Array.isArray(convenioDocuments[convenioId]) &&
      Array.isArray(convenioAlerts[convenioId]);

    if (hasCache) {
      return;
    }

    loadConvenioExtras(convenioId, { silent: true }).catch(() => {
      // errores gestionados dentro
    });
  }, [
    collections,
    convenioAlerts,
    convenioChecklist,
    convenioDocuments,
    convenioWorkflowState,
    isConveniosRoute,
    loadConvenioExtras,
    selectedConvenioId,
  ]);

  const handleRefreshSolicitudes = useCallback(() => {
    refreshSolicitudes().catch(() => {
      // errores gestionados dentro
    });
  }, [refreshSolicitudes]);

  const handleApproveSolicitud = useCallback(
    async (solicitudId: number) => {
      setProcessingSolicitudId(solicitudId);
      try {
        await approveEmpresaSolicitud(solicitudId);
        pushToast('success', 'Solicitud aprobada y empresa creada.');
        await refreshSolicitudes({ silent: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo aprobar la solicitud seleccionada.';
        pushToast('error', message);
      } finally {
        setProcessingSolicitudId(null);
      }
    },
    [pushToast, refreshSolicitudes],
  );

  const handleRejectSolicitud = useCallback(
    async (solicitudId: number) => {
      const motivo = window.prompt('Cual es el motivo del rechazo?');
      if (!motivo || !motivo.trim()) {
        return;
      }
      setProcessingSolicitudId(solicitudId);
      try {
        await rejectEmpresaSolicitud(solicitudId, motivo.trim());
        pushToast('success', 'Solicitud rechazada.');
        await refreshSolicitudes({ silent: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo rechazar la solicitud seleccionada.';
        pushToast('error', message);
      } finally {
        setProcessingSolicitudId(null);
      }
    },
    [pushToast, refreshSolicitudes],
  );



  const handleEditStudent = useCallback((estudiante: EstudianteSummary) => {
    setStudentFormError(null);
    setStudentModal({
      mode: 'edit',
      entityId: estudiante.id,
      initialValues: mapSummaryToStudentForm(estudiante),
      loadingValues: true,
    });

    getEstudianteDetail(estudiante.id)
      .then((detail) => {
        setStudentModal((current) => {
          if (!current || current.entityId !== estudiante.id) {
            return current;
          }

          return {
            ...current,
            initialValues: mapDetailToStudentForm(detail),
            loadingValues: false,
          };
        });
      })
      .catch((err) => {
        setStudentFormError(
          err instanceof Error ? err.message : 'No se pudieron cargar los datos del estudiante seleccionado.',
        );
        setStudentModal((current) => {
          if (!current || current.entityId !== estudiante.id) {
            return current;
          }

          return {
            ...current,
            loadingValues: false,
          };
        });
      });
  }, []);

  const handleCloseStudentModal = useCallback(() => {
    setStudentModal(null);
    setStudentFormError(null);
    setSavingStudent(false);
  }, []);

  const openCreateEmpresa = useCallback(() => {
    setEmpresaFormError(null);
    setEmpresaModal({
      mode: 'create',
      initialValues: cloneEmpresaForm(EMPTY_EMPRESA_VALUES),
      loadingValues: false,
    });
  }, []);

  const handleEditEmpresa = useCallback((empresa: EmpresaSummary) => {
    setEmpresaFormError(null);
    setEmpresaModal({
      mode: 'edit',
      entityId: empresa.id,
      initialValues: mapEmpresaSummaryToForm(empresa),
      loadingValues: true,
    });

    getEmpresaDetail(empresa.id)
      .then((detail) => {
        setEmpresaModal((current) => {
          if (!current || current.entityId !== empresa.id) {
            return current;
          }

          return {
            ...current,
            initialValues: mapEmpresaDetailToForm(detail),
            loadingValues: false,
          };
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los datos de la empresa.';
        setEmpresaFormError(message);
        pushToast('error', message);
        setEmpresaModal((current) => {
          if (!current || current.entityId !== empresa.id) {
            return current;
          }

          return {
            ...current,
            loadingValues: false,
          };
        });
      });
  }, [pushToast]);

  const handleCloseEmpresaModal = useCallback(() => {
    setEmpresaModal(null);
    setEmpresaFormError(null);
    setSavingEmpresa(false);
  }, []);

  const handleEmpresaSubmit = useCallback(
    async (values: EmpresaFormValues) => {
      if (!empresaModal) {
        return;
      }

      setSavingEmpresa(true);
      setEmpresaFormError(null);

      try {
        const payload = buildEmpresaPayload(values);
        if (empresaModal.mode === 'create') {
          await createEmpresa(payload);
          pushToast('success', 'Empresa registrada correctamente.');
        } else if (empresaModal.entityId) {
          await updateEmpresa(empresaModal.entityId, payload);
          pushToast('success', 'Empresa actualizada correctamente.');
        }

        await loadData();
        handleCloseEmpresaModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo guardar la empresa.';
        setEmpresaFormError(message);
        pushToast('error', message);
      } finally {
        setSavingEmpresa(false);
      }
    },
    [empresaModal, loadData, handleCloseEmpresaModal, pushToast],
  );

  const openCreateConvenio = useCallback((empresaId?: number) => {
    setConvenioFormError(null);
    setConvenioModal({
      mode: 'create',
      initialValues: cloneConvenioForm({
        ...EMPTY_CONVENIO_VALUES,
        empresaId: empresaId ? String(empresaId) : '',
      }),
      loadingValues: false,
    });
  }, []);

  const handleEditConvenio = useCallback((convenio: ConvenioSummary) => {
    setConvenioFormError(null);
    setConvenioModal({
      mode: 'edit',
      entityId: convenio.id,
      initialValues: mapConvenioSummaryToForm(convenio),
      loadingValues: true,
    });

    getConvenioDetail(convenio.id)
      .then((detail) => {
        setConvenioModal((current) => {
          if (!current || current.entityId !== convenio.id) {
            return current;
          }

          return {
            ...current,
            initialValues: mapConvenioDetailToForm(detail),
            loadingValues: false,
          };
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los datos del convenio.';
        setConvenioFormError(message);
        pushToast('error', message);
        setConvenioModal((current) => {
          if (!current || current.entityId !== convenio.id) {
            return current;
          }

          return {
            ...current,
            loadingValues: false,
          };
        });
      });
  }, [pushToast]);

  const handleCloseConvenioModal = useCallback(() => {
    setConvenioModal(null);
    setConvenioFormError(null);
    setSavingConvenio(false);
  }, []);

  const handleConvenioSubmit = useCallback(
    async (values: ConvenioFormValues) => {
      if (!convenioModal) {
        return;
      }

      setSavingConvenio(true);
      setConvenioFormError(null);

      try {
        const payload = buildConvenioPayload(values);
        if (convenioModal.mode === 'create') {
          await createConvenio(payload);
          pushToast('success', 'Convenio registrado correctamente.');
        } else if (convenioModal.entityId) {
          await updateConvenio(convenioModal.entityId, payload);
          pushToast('success', 'Convenio actualizado correctamente.');
        }

        await loadData();
        handleCloseConvenioModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo guardar el convenio.';
        setConvenioFormError(message);
        pushToast('error', message);
      } finally {
        setSavingConvenio(false);
      }
    },
    [convenioModal, loadData, handleCloseConvenioModal, pushToast],
  );

  const openCreateAsignacion = useCallback(async (defaults?: Partial<AsignacionFormValues>) => {
    setAsignacionFormError(null);

    if (!referenceData) {
      setAsignacionModal({
        mode: 'create',
        initialValues: cloneAsignacionForm({
          ...EMPTY_ASIGNACION_VALUES,
          ...defaults,
        }),
        loadingValues: true,
      });

      await loadReferenceData();
    }

    setAsignacionModal({
      mode: 'create',
      initialValues: cloneAsignacionForm({
        ...EMPTY_ASIGNACION_VALUES,
        ...defaults,
      }),
      loadingValues: false,
    });
  }, [loadReferenceData, referenceData]);

  const handleEditAsignacion = useCallback((asignacion: AsignacionSummary) => {
    setAsignacionFormError(null);
    setAsignacionModal({
      mode: 'edit',
      entityId: asignacion.id,
      initialValues: mapAsignacionSummaryToForm(asignacion),
      loadingValues: true,
    });

    if (!referenceData) {
      loadReferenceData({ silent: true }).catch(() => {
        // errores gestionados dentro
      });
    }

    getAsignacionDetail(asignacion.id)
      .then((detail) => {
        setAsignacionModal((current) => {
          if (!current || current.entityId !== asignacion.id) {
            return current;
          }

          return {
            ...current,
            initialValues: mapAsignacionDetailToForm(detail),
            loadingValues: false,
          };
        });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los datos de la asignacion.';
        setAsignacionFormError(message);
        pushToast('error', message);
        setAsignacionModal((current) => {
          if (!current || current.entityId !== asignacion.id) {
            return current;
          }

          return {
            ...current,
            loadingValues: false,
          };
        });
      });
  }, [loadReferenceData, pushToast, referenceData]);

  const handleCloseAsignacionModal = useCallback(() => {
    setAsignacionModal(null);
    setAsignacionFormError(null);
    setSavingAsignacion(false);
  }, []);

  const handleAsignacionSubmit = useCallback(
    async (values: AsignacionFormValues) => {
      if (!asignacionModal) {
        return;
      }

      setSavingAsignacion(true);
      setAsignacionFormError(null);

      try {
        const payload = buildAsignacionPayload(values);
        if (asignacionModal.mode === 'create') {
          await createAsignacion(payload);
          pushToast('success', 'Asignacion creada correctamente.');
        } else if (asignacionModal.entityId) {
          await updateAsignacion(asignacionModal.entityId, payload);
          pushToast('success', 'Asignacion actualizada correctamente.');
        }

        await loadData();
        handleCloseAsignacionModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo guardar la asignacion.';
        setAsignacionFormError(message);
        pushToast('error', message);
      } finally {
        setSavingAsignacion(false);
      }
    },
    [asignacionModal, loadData, handleCloseAsignacionModal, pushToast],
  );

  const handleStudentSubmit = useCallback(
    async (values: EstudianteFormValues) => {
      if (!studentModal) {
        return;
      }

      setSavingStudent(true);
      setStudentFormError(null);

      try {
        const payload = buildEstudiantePayload(values);

        if (studentModal.mode === 'create') {
          await createEstudiante(payload);
          pushToast('success', 'Estudiante registrado correctamente.');
        } else if (studentModal.entityId) {
          await updateEstudiante(studentModal.entityId, payload);
          pushToast('success', 'Estudiante actualizado correctamente.');
        }

        await loadData();
        handleCloseStudentModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo guardar el estudiante.';
        setStudentFormError(message);
        pushToast('error', message);
      } finally {
        setSavingStudent(false);
      }
    },
    [studentModal, loadData, handleCloseStudentModal, pushToast],
  );

  const stats = useMemo(() => {
    if (!collections) {
      return [];
    }

    return buildDashboardStats(collections);
  }, [collections]);

  const dashboardHeroMetrics = useMemo(() => {
    if (!collections) {
      return [];
    }

    const empresasActivas = collections.empresas.filter((empresa) => empresa.estadoColaboracion === 'activa').length;
    const conveniosVigentes = collections.convenios.filter((convenio) =>
      convenio.estado.toLowerCase().includes('vig'),
    ).length;
    const asignacionesEnCurso = collections.asignaciones.filter((asignacion) => asignacion.estado === 'en_curso').length;

    return [
      {
        label: 'Empresas activas',
        value: empresasActivas,
        detail: 'Colaboraciones listas para operar',
      },
      {
        label: 'Solicitudes pendientes',
        value: empresaSolicitudes.length,
        detail: 'Entradas desde el portal externo',
      },
      {
        label: 'Convenios vigentes',
        value: conveniosVigentes,
        detail: 'Cobertura documental operativa',
      },
      {
        label: 'Asignaciones en curso',
        value: asignacionesEnCurso,
        detail: 'Seguimiento abierto esta semana',
      },
    ];
  }, [collections, empresaSolicitudes.length]);

  const dashboardHeroUpdates = useMemo(() => {
    const referenceStatus = loadingReferenceData
      ? 'Cargando catálogo de tutores bajo demanda para no penalizar el arranque.'
      : referenceData
        ? `${referenceData.tutoresAcademicos.length} tutores académicos y ${referenceData.tutoresProfesionales.length} profesionales listos.`
        : 'Los tutores se cargan a demanda cuando entras en el módulo o preparas una asignación.';

    return [
      {
        title: 'Estado del panel',
        detail: lastUpdated
          ? `Datos sincronizados a las ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`
          : 'Esperando la primera sincronización completa.',
      },
      {
        title: 'Revisión externa',
        detail: empresaSolicitudes.length > 0
          ? `${empresaSolicitudes.length} solicitudes requieren revisión desde el equipo interno.`
          : 'No hay solicitudes pendientes de revisar en este momento.',
      },
      {
        title: 'Cobertura docente',
        detail: referenceStatus,
      },
    ];
  }, [empresaSolicitudes.length, lastUpdated, loadingReferenceData, referenceData]);

  const estudianteColumns = useMemo<Array<TableColumn<EstudianteSummary>>>(() => [
    {
      key: 'nombre',
      header: 'Estudiante',
      render: (estudiante) => `${estudiante.nombre} ${estudiante.apellido}`,
    },
    { key: 'dni', header: 'DNI', render: (estudiante) => estudiante.dni },
    { key: 'email', header: 'Email', render: (estudiante) => estudiante.email },
    { key: 'grado', header: 'Grado', render: (estudiante) => estudiante.grado ?? '?"' },
    { key: 'estado', header: 'Estado', render: (estudiante) => estudiante.estado, align: 'center' },
    {
      key: 'asignaciones',
      header: 'Asignaciones (total / en curso)',
      render: (estudiante) => `${estudiante.asignaciones.total} / ${estudiante.asignaciones.enCurso}`,
      align: 'center',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      render: (estudiante) => (
        <button type="button" className="button button--link" onClick={() => handleEditStudent(estudiante)}>
          Editar
        </button>
      ),
    },
  ], [handleEditStudent]);

  const estudianteActions = useMemo(
    () => (
      <button type="button" className="button button--primary button--sm" onClick={openCreateStudent}>
        Nuevo estudiante
      </button>
    ),
    [openCreateStudent],
  );

  const empresaColumns = useMemo<Array<TableColumn<EmpresaSummary>>>(() => [
    ...BASE_EMPRESA_COLUMNS,
    {
      key: 'empresa_acciones',
      header: 'Acciones',
      align: 'right',
      render: (empresa) => (
        <button type="button" className="button button--link" onClick={() => handleEditEmpresa(empresa)}>
          Editar
        </button>
      ),
    },
  ], [handleEditEmpresa]);

  const empresaActions = useMemo(
    () => (
      <button type="button" className="button button--primary button--sm" onClick={openCreateEmpresa}>
        Nueva empresa
      </button>
    ),
    [openCreateEmpresa],
  );

  const convenioColumns = useMemo<Array<TableColumn<ConvenioSummary>>>(() => [
    ...BASE_CONVENIO_COLUMNS,
    {
      key: 'convenio_acciones',
      header: 'Acciones',
      align: 'right',
      render: (convenio) => (
        <button type="button" className="button button--link" onClick={() => handleEditConvenio(convenio)}>
          Editar
        </button>
      ),
    },
  ], [handleEditConvenio]);

  const convenioActions = useMemo(
    () => (
      <button type="button" className="button button--primary button--sm" onClick={() => openCreateConvenio()}>
        Nuevo convenio
      </button>
    ),
    [openCreateConvenio],
  );

  const asignacionColumns = useMemo<Array<TableColumn<AsignacionSummary>>>(() => [
    ...BASE_ASIGNACION_COLUMNS,
    {
      key: 'asignacion_acciones',
      header: 'Acciones',
      align: 'right',
      render: (asignacion) => (
        <div className="table-actions">
          <button type="button" className="button button--link" onClick={() => handleEditAsignacion(asignacion)}>
            Editar
          </button>
          <Link to={`/asignaciones/${asignacion.id}`} className="button button--link">
            Ver detalle
          </Link>
        </div>
      ),
    },
  ], [handleEditAsignacion]);

  const asignacionActions = useMemo(
    () => (
      <button
        type="button"
        className="button button--primary button--sm"
        onClick={() => openCreateAsignacion()}
        disabled={loadingReferenceData}
        title={loadingReferenceData ? 'Cargando datos de referencia...' : undefined}
      >
        Nueva asignacion
      </button>
    ),
    [openCreateAsignacion, referenceData],
  );

  const tutorAcademicos = referenceData?.tutoresAcademicos ?? [];
  const tutorProfesionales = referenceData?.tutoresProfesionales ?? [];

const moduleCards = useMemo(
  () => [
    {
      id: 'empresas',
      label: 'Empresas',
      total: collections?.empresas.length ?? 0,
      description: 'Colaboradoras activas',
      detail: 'Incluye estados de colaboración, contactos y convenios relacionados.',
      accent: 'orchid',
    },
    {
      id: 'convenios',
      label: 'Convenios',
      total: collections?.convenios.length ?? 0,
      description: 'Acuerdos vigentes',
      detail: 'Información completa sobre fechas, estado y asignaciones vinculadas.',
      accent: 'amber',
    },
    {
      id: 'estudiantes',
      label: 'Estudiantes',
      total: collections?.estudiantes.length ?? 0,
      description: 'Participantes registrados',
      detail: 'Fichas con estado académico, asignaciones y datos de contacto.',
      accent: 'cyan',
    },
    {
      id: 'asignaciones',
      label: 'Asignaciones',
      total: collections?.asignaciones.length ?? 0,
      description: 'Prácticas en curso',
      detail: 'Pipeline Kanban con tutorías, fechas y modalidad.',
      accent: 'violet',
    },
    {
      id: 'tutores',
      label: 'Tutores',
      total: (referenceData?.tutoresAcademicos.length ?? 0) + (referenceData?.tutoresProfesionales.length ?? 0),
      description: 'Académicos y profesionales',
      detail: 'Filtra por estado y empresa para contactar rápido.',
      accent: 'cyan',
    },
    {
      id: 'documentacion',
      label: 'Documentación',
      total: 3,
      description: 'Guías y recursos listos',
      detail: 'Enlaza a backend, frontend y desglose de flujos CRUD.',
      accent: 'orchid',
    },
  ],
  [collections],
);

  const moduleQuickLinks = useMemo(
    () => [
      {
        id: 'empresas',
        label: 'Empresas',
        total: collections?.empresas.length ?? 0,
        description: 'Control de colaboraciones y convenios asociados.',
        path: '/empresas',
      },
      {
        id: 'convenios',
        label: 'Convenios',
        total: collections?.convenios.length ?? 0,
        description: 'Estado, fechas y documentación adjunta.',
        path: '/convenios',
      },
      {
        id: 'estudiantes',
        label: 'Estudiantes',
        total: collections?.estudiantes.length ?? 0,
        description: 'Ficha academica y seguimiento en curso.',
        path: '/estudiantes',
      },
      {
        id: 'asignaciones',
        label: 'Asignaciones',
        total: collections?.asignaciones.length ?? 0,
        description: 'Pipeline completo, tutores y horas planificadas.',
        path: '/asignaciones',
      },
      {
        id: 'tutores',
        label: 'Tutores',
        total: (referenceData?.tutoresAcademicos.length ?? 0) + (referenceData?.tutoresProfesionales.length ?? 0),
        description: 'Equipos académicos y de empresa con filtros.',
        path: '/tutores',
      },
    ],
    [collections, referenceData],
  );

  const studentPreview = useMemo(() => {
    return (collections?.estudiantes ?? []).slice(0, 3);
  }, [collections]);

  const studentEstados = useMemo(() => {
    if (!collections) {
      return [];
    }
    const estados = new Set<string>();
    collections.estudiantes.forEach((estudiante) => estados.add(estudiante.estado));
    return Array.from(estados);
  }, [collections]);

  const asignacionEstados = useMemo(() => {
    if (!collections) {
      return [];
    }
    const estados = new Set<string>();
    collections.asignaciones.forEach((asignacion) => estados.add(asignacion.estado));
    return Array.from(estados);
  }, [collections]);

  const asignacionModalidades = useMemo(() => {
    if (!collections) {
      return [];
    }
    const modalidades = new Set<string>();
    collections.asignaciones.forEach((asignacion) => modalidades.add(asignacion.modalidad));
    return Array.from(modalidades);
  }, [collections]);

  const filteredStudents = useMemo(() => {
    if (!collections) {
      return [];
    }
    if (studentEstadoFilter === 'todos') {
      return collections.estudiantes;
    }
    return collections.estudiantes.filter((estudiante) => estudiante.estado === studentEstadoFilter);
  }, [collections, studentEstadoFilter]);

  const filteredAsignaciones = useMemo(() => {
    if (!collections) {
      return [];
    }
    return collections.asignaciones.filter((asignacion) => {
      const matchEstado = asignacionEstadoFilter === 'todos' || asignacion.estado === asignacionEstadoFilter;
      const matchModalidad =
        asignacionModalidadFilter === 'todas' || asignacion.modalidad === asignacionModalidadFilter;
      return matchEstado && matchModalidad;
    });
  }, [collections, asignacionEstadoFilter, asignacionModalidadFilter]);

  useEffect(() => {
    if (!collections) {
      return;
    }
    setSelectedStudent((current) => {
      if (filteredStudents.length === 0) {
        return null;
      }
      if (current && filteredStudents.some((student) => student.id === current.id)) {
        return current;
      }
      return filteredStudents[0];
    });
  }, [collections, filteredStudents]);

  useEffect(() => {
    if (!collections) {
      return;
    }
    setSelectedAsignacion((current) => {
      if (filteredAsignaciones.length === 0) {
        return null;
      }
      if (current && filteredAsignaciones.some((item) => item.id === current.id)) {
        return current;
      }
      return filteredAsignaciones[0];
    });
  }, [collections, filteredAsignaciones]);

  const empresaSectors = useMemo(() => {
    if (!collections) {
      return [];
    }
    const sectors = new Set<string>();
    collections.empresas.forEach((empresa) => {
      if (empresa.sector) {
        sectors.add(empresa.sector);
      }
    });
    return Array.from(sectors);
  }, [collections]);

  const filteredEmpresas = useMemo(() => {
    if (!collections) {
      return [];
    }
    if (empresaSectorFilter === 'todos') {
      return collections.empresas;
    }
    return collections.empresas.filter((empresa) => empresa.sector === empresaSectorFilter);
  }, [collections, empresaSectorFilter]);

const selectedEmpresa = useMemo(() => {
  if (!collections || filteredEmpresas.length === 0) {
    return null;
  }
  const idToFind = selectedEmpresaId ?? filteredEmpresas[0].id;
  return filteredEmpresas.find((empresa) => empresa.id === idToFind) ?? filteredEmpresas[0];
}, [collections, filteredEmpresas, selectedEmpresaId]);

const selectedEmpresaDetail = useMemo(() => {
  if (!collections) {
    return null;
  }
  const empresaController = collections.empresas.find((empresa) => empresa.id === selectedEmpresa?.id);
  if (!empresaController) {
    return null;
  }

  const convenios = collections.convenios.filter((convenio) => convenio.empresa.id === empresaController.id);
  const asignaciones = collections.asignaciones.filter((asignacion) => asignacion.empresa.id === empresaController.id);

  return {
    empresa: empresaController,
    convenios,
    asignaciones,
  };
}, [collections, selectedEmpresa]);

const convenioEstados = useMemo(() => {
  if (!collections) {
    return [];
  }
  const estados = new Set<string>();
  collections.convenios.forEach((convenio) => {
    if (convenio.estado) {
      estados.add(convenio.estado);
    }
  });
  return Array.from(estados);
}, [collections]);

const filteredConvenios = useMemo(() => {
  if (!collections) {
    return [];
  }

  return collections.convenios.filter((convenio) => {
    const effectiveState = convenioWorkflowState[convenio.id] ?? convenio.estado;
    const stateMatches = convenioEstadoFilter === 'todos' || effectiveState === convenioEstadoFilter;
    const companyMatches = convenioEmpresaFilter === 'todos' || convenio.empresa.id === Number(convenioEmpresaFilter);
    return stateMatches && companyMatches;
  });
}, [collections, convenioEstadoFilter, convenioEmpresaFilter, convenioWorkflowState]);

const selectedConvenio = useMemo(() => {
  if (!collections || filteredConvenios.length === 0) {
    return null;
  }
    const idToFind = selectedConvenioId ?? filteredConvenios[0].id;
    return filteredConvenios.find((convenio) => convenio.id === idToFind) ?? filteredConvenios[0];
  }, [collections, filteredConvenios, selectedConvenioId]);

  const asignacionesPorEstado = useMemo(() => {
    if (!collections) {
      return {};
    }

    return collections.asignaciones.reduce<Record<string, AsignacionSummary[]>>((acc, asignacion) => {
      const estado = asignacion.estado || 'Otros';
      acc[estado] = acc[estado] ?? [];
      acc[estado].push(asignacion);
      return acc;
    }, {});
  }, [collections]);

  useEffect(() => {
    if (filteredEmpresas.length > 0) {
      const exists = filteredEmpresas.some((empresa) => empresa.id === selectedEmpresaId);
      if (!exists) {
        setSelectedEmpresaId(filteredEmpresas[0].id);
      }
    }
  }, [filteredEmpresas, selectedEmpresaId]);

  useEffect(() => {
    if (filteredConvenios.length > 0) {
      const exists = filteredConvenios.some((convenio) => convenio.id === selectedConvenioId);
      if (!exists) {
        setSelectedConvenioId(filteredConvenios[0].id);
      }
    }
  }, [filteredConvenios, selectedConvenioId]);

  useEffect(() => {
    if (selectedStudent) {
      setStudentDetailTab('academico');
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (!collections) {
      return;
    }
    setEmpresaNotes((prev) => {
      let updated = prev;
      collections.empresas.forEach((empresa) => {
        if (!prev[empresa.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          updated[empresa.id] = [
            {
              id: Number(`${empresa.id}001`),
              author: 'Sistema',
              content: `Registro inicial de ${empresa.nombre}.`,
              timestamp: new Date().toISOString(),
            },
            {
              id: Number(`${empresa.id}002`),
              author: 'Coordinacion',
              content: 'Contacto principal validado. Pendiente revisar convenio y plan de acogida.',
              timestamp: new Date().toISOString(),
            },
          ];
        }
      });
      return updated;
    });

    setEmpresaLabels((prev) => {
      let updated = prev;
      collections.empresas.forEach((empresa) => {
        if (!prev[empresa.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          const baseLabel = empresa.sector ? empresa.sector : 'General';
          const labels = [baseLabel, 'FP Dual'];
          if (empresa.estadoColaboracion === 'pendiente_revision') {
            labels.push('Pendiente revision');
          }
          if (empresa.conveniosActivos === 0) {
            labels.push('Sin convenio activo');
          }
          updated[empresa.id] = labels;
        }
      });
      return updated;
    });

    setEmpresaDocs((prev) => {
      let updated = prev;
      collections.empresas.forEach((empresa) => {
        if (!prev[empresa.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          updated[empresa.id] = [
            {
              id: Number(`${empresa.id}100`),
              name: 'Convenio firmado',
              type: 'PDF',
              url: null,
              uploadedAt: new Date().toISOString(),
            },
            {
              id: Number(`${empresa.id}101`),
              name: 'Ficha de empresa',
              type: 'PDF',
              url: null,
              uploadedAt: new Date().toISOString(),
            },
            {
              id: Number(`${empresa.id}102`),
              name: 'Plan de acogida',
              type: 'DOCX',
              url: null,
              uploadedAt: new Date().toISOString(),
            },
          ];
        }
      });
      return updated;
    });

    if (false) {
    setConvenioWorkflowState((prev) => {
      let updated = prev;
      collections!.convenios.forEach((convenio) => {
        if (!prev[convenio.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          updated[convenio.id] = convenio.estado;
        }
      });
      return updated;
    });

    setConvenioChecklist((prev) => {
      let updated = prev;
      collections!.convenios.forEach((convenio) => {
        if (!prev[convenio.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          updated[convenio.id] = [
            { id: Number(`${convenio.id}01`), label: 'Documento firmado', completed: false },
            { id: Number(`${convenio.id}02`), label: 'Seguro actualizado', completed: false },
            { id: Number(`${convenio.id}03`), label: 'Aprobacion tutor academico', completed: false },
            { id: Number(`${convenio.id}04`), label: 'Plan formativo validado', completed: false },
          ];
        }
      });
      return updated;
    });

    setConvenioDocuments((prev) => {
      let updated = prev;
      collections!.convenios.forEach((convenio) => {
        if (!prev[convenio.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          updated[convenio.id] = [
            {
              id: Number(`${convenio.id}500`),
              name: 'Borrador inicial',
              type: 'PDF',
              url: null,
              uploadedAt: new Date().toISOString(),
            },
            {
              id: Number(`${convenio.id}501`),
              name: 'Anexo de practicas',
              type: 'PDF',
              url: null,
              uploadedAt: new Date().toISOString(),
            },
          ];
        }
      });
      return updated;
    });

    setConvenioAlerts((prev) => {
      let updated = prev;
      collections!.convenios.forEach((convenio) => {
        if (!prev[convenio.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          updated[convenio.id] = [
            {
              id: Number(`${convenio.id}900`),
              message: 'Pendiente de checklist documental.',
              level: 'warning',
              active: true,
            },
            {
              id: Number(`${convenio.id}901`),
              message: 'Revisar fechas de fin y renovacion.',
              level: 'info',
              active: true,
            },
          ];
        }
      });
      return updated;
    });
    }
  }, [collections]);

  const analyticData = useMemo(() => {
    if (!collections) {
      return [];
    }

    return buildDashboardAnalytics(collections);
  }, [collections]);
  const analyticMax = analyticData.reduce((max, entry) => Math.max(max, entry.value), 0) || 1;
  const dashboardBaseRecordCount = useMemo(() => {
    if (!collections) {
      return 0;
    }

    return getDashboardBaseRecordCount(collections);
  }, [collections]);

  const handleExportDashboard = useCallback(() => {
    const rows: CsvRow[] = [
      ...stats.map((stat) => ({
        seccion: 'kpi',
        indicador: stat.label,
        valor: stat.value,
      })),
      ...analyticData.map((entry) => ({
        seccion: 'analitica',
        indicador: entry.label,
        valor: entry.value,
      })),
    ];

    exportCsv('dashboard', rows, 'No hay metricas disponibles para exportar.');
  }, [analyticData, exportCsv, stats]);

  const handleExportEmpresas = useCallback(() => {
    void exportApiCsv(
      'empresas',
      (collections?.empresas.length ?? 0) > 0,
      'No hay empresas disponibles para exportar.',
    );
  }, [collections?.empresas.length, exportApiCsv]);

  const handleExportConvenios = useCallback(() => {
    void exportApiCsv(
      'convenios',
      (collections?.convenios.length ?? 0) > 0,
      'No hay convenios disponibles para exportar.',
    );
  }, [collections?.convenios.length, exportApiCsv]);

  const handleExportEstudiantes = useCallback(() => {
    void exportApiCsv(
      'estudiantes',
      (collections?.estudiantes.length ?? 0) > 0,
      'No hay estudiantes disponibles para exportar.',
    );
  }, [collections?.estudiantes.length, exportApiCsv]);

  const handleExportAsignaciones = useCallback(() => {
    void exportApiCsv(
      'asignaciones',
      (collections?.asignaciones.length ?? 0) > 0,
      'No hay asignaciones disponibles para exportar.',
    );
  }, [collections?.asignaciones.length, exportApiCsv]);

  const handleExportTutorAcademicos = useCallback(() => {
    const activo = tutorAcademicoEstado === 'todos'
      ? undefined
      : tutorAcademicoEstado === 'activos';

    void exportApiCsv(
      'tutores-academicos',
      tutorAcademicoTotal > 0,
      'No hay tutores academicos disponibles para exportar.',
      activo === undefined ? undefined : { activo },
    );
  }, [exportApiCsv, tutorAcademicoEstado, tutorAcademicoTotal]);

  const handleExportTutorProfesionales = useCallback(() => {
    const activo = tutorProfesionalEstado === 'todos'
      ? undefined
      : tutorProfesionalEstado === 'activos';
    const empresaId = tutorProfesionalEmpresa !== 'todas' ? tutorProfesionalEmpresa : undefined;

    void exportApiCsv(
      'tutores-profesionales',
      tutorProfesionalTotal > 0,
      'No hay tutores profesionales disponibles para exportar.',
      {
        activo,
        empresaId,
      },
    );
  }, [exportApiCsv, tutorProfesionalEmpresa, tutorProfesionalEstado, tutorProfesionalTotal]);

  const handleExportSolicitudes = useCallback(() => {
    void exportApiCsv(
      'solicitudes-empresa',
      empresaSolicitudes.length > 0,
      'No hay solicitudes disponibles para exportar.',
    );
  }, [empresaSolicitudes.length, exportApiCsv]);


  const selectedStudentAssignments = useMemo(() => {
    if (!collections || !selectedStudent) {
      return [];
    }

    return collections.asignaciones.filter(
      (asignacion) => asignacion.estudiante.id === selectedStudent.id,
    );
  }, [collections, selectedStudent]);

  const studentTimeline = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    if (selectedStudentAssignments.length > 0) {
      return selectedStudentAssignments.map((asignacion) => ({
        id: `asignacion-${asignacion.id}`,
        title: asignacion.empresa.nombre,
        status: asignacion.estado,
        date: `${formatDate(asignacion.fechaInicio)}  ${formatDate(asignacion.fechaFin)}`,
        modalidad: asignacion.modalidad,
      }));
    }

    return [
      {
        id: 'estado-general',
        title: 'Sin asignaciones activas',
        status: selectedStudent.estado,
        date: 'A la espera de nueva asignacion',
        modalidad: 'Seguimiento coordinador',
      },
    ];
  }, [selectedStudent, selectedStudentAssignments]);


  const EmpresaManagementPage = () => {
    const { empresaId } = useParams();
    const navigate = useNavigate();

    if (!empresaId) {
      return (
        <div className="empresa-page">
          <div className="empresa-page__panel">
            <p>No se ha indicado ninguna empresa para gestionar.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    if (!collections) {
      return (
        <div className="empresa-page">
          <div className="empresa-page__panel">
            <p>No hay datos cargados. Regresa al dashboard y sincroniza con el backend.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al dashboard
            </button>
          </div>
        </div>
      );
    }

    const numericId = Number(empresaId);
    const empresa = collections.empresas.find((item) => item.id === numericId) ?? null;

    if (!empresa) {
      return (
        <div className="empresa-page">
          <div className="empresa-page__panel">
            <p>No encontramos una empresa con el identificador solicitado.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al dashboard
            </button>
          </div>
        </div>
      );
    }

    const conveniosEmpresa = collections.convenios.filter((convenio) => convenio.empresa.id === empresa.id);
    const asignacionesEmpresa = collections.asignaciones.filter((asignacion) => asignacion.empresa.id === empresa.id);
    const activityLog = asignacionesEmpresa.slice(0, 5);
    const documents = empresaDocs[empresa.id] ?? [];
    const [empresaDocName, setEmpresaDocName] = useState('');
    const [empresaDocType, setEmpresaDocType] = useState('');
    const [empresaDocFile, setEmpresaDocFile] = useState<File | null>(null);

    const highlights = [
      { label: 'Convenios activos', value: conveniosEmpresa.length },
      { label: 'Asignaciones totales', value: empresa.asignaciones.total },
      { label: 'En curso', value: empresa.asignaciones.enCurso },
      { label: 'Tutores profesionales', value: empresa.tutoresProfesionales },
    ];

    return (
      <div className="empresa-page">
        <header className="empresa-page__header">
          <div>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate(-1)}>
              Volver
            </button>
            <p className="module-page__eyebrow">Espacio privado  Empresas</p>
            <h2>{empresa.nombre}</h2>
            <p className="empresa-page__subtitle">
              {empresa.ciudad ?? 'Sin ciudad'}  {empresa.sector ?? 'Sin sector definido'}
            </p>
          </div>
          <div className="empresa-actions">
            <button type="button" className="button button--ghost button--sm" onClick={() => handleEditEmpresa(empresa)}>
              Editar perfil
            </button>
            <button type="button" className="button button--ghost button--sm" onClick={() => openCreateConvenio(empresa.id)}>
              Nuevo convenio
            </button>
            <button
              type="button"
              className="button button--primary button--sm"
              onClick={() => openCreateAsignacion({ empresaId: String(empresa.id) })}
              disabled={loadingReferenceData}
              title={loadingReferenceData ? 'Cargando datos de referencia...' : undefined}
            >
              Planificar asignacion
            </button>
          </div>
        </header>

        <div className="empresa-summary">
          <div>
            <span>Estado</span>
            <strong>{empresa.estadoColaboracion}</strong>
          </div>
          <div>
            <span>Convenios activos</span>
            <strong>{empresa.conveniosActivos}</strong>
          </div>
          <div>
            <span>Contactos</span>
            <strong>{empresa.contactos}</strong>
          </div>
          <div>
            <span>Asignaciones</span>
            <strong>{empresa.asignaciones.enCurso} en curso / {empresa.asignaciones.total} totales</strong>
          </div>
        </div>

        <div className="empresa-metrics">
          {highlights.map((item) => (
            <article key={item.label} className="empresa-metric-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>

        <div className="empresa-panels">
          <article className="empresa-panel">
            <header>
              <h3>Convenios asociados</h3>
              <span className="chip chip--ghost">{conveniosEmpresa.length} registros</span>
            </header>
            {conveniosEmpresa.length === 0 ? (
              <p className="empresa-panel__placeholder">Todavia no se han generado convenios para esta empresa.</p>
            ) : (
              <ul>
                {conveniosEmpresa.map((convenio) => (
                  <li key={convenio.id}>
                    <strong>{convenio.titulo}</strong>
                    <p>{convenio.tipo}  {convenio.estado}</p>
                    <small>{formatDate(convenio.fechaInicio)}  {formatDate(convenio.fechaFin)}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="empresa-panel">
            <header>
              <h3>Asignaciones en seguimiento</h3>
              <span className="chip chip--ghost">{asignacionesEmpresa.length} registros</span>
            </header>
            {asignacionesEmpresa.length === 0 ? (
              <p className="empresa-panel__placeholder">Aun no hay estudiantes asignados.</p>
            ) : (
              <ul>
                {asignacionesEmpresa.map((asignacion) => (
                  <li key={asignacion.id}>
                    <strong>{asignacion.estudiante.nombre} {asignacion.estudiante.apellido}</strong>
                    <p>{asignacion.estado}  {asignacion.modalidad}</p>
                    <small>{formatDate(asignacion.fechaInicio)}  {formatDate(asignacion.fechaFin)}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="empresa-panel">
            <header>
              <h3>Documentos de la empresa</h3>
              <span className="chip chip--ghost">{(empresaDocs[empresa.id]?.length ?? 0)} adjuntos</span>
            </header>
            <div className="empresa-documents">
              {(empresaDocs[empresa.id] ?? []).length > 0 ? (
                (empresaDocs[empresa.id] ?? []).map((doc) => (
                  <div key={doc.id} className="empresa-document">
                    <div>
                      <strong>{doc.name}</strong>
                      <small>{doc.type ?? 'Documento'} - {formatDate(doc.uploadedAt)}</small>
                    </div>
                    {doc.url ? (
                      <div className="document-actions">
                        {canPreviewDocument(doc, API_BASE_URL) && (
                          <button
                            type="button"
                            className="button button--ghost button--sm"
                            onClick={() => openDocumentPreview(doc.name, doc.url)}
                          >
                            Vista previa PDF
                          </button>
                        )}
                        <a
                          className="button button--link"
                          href={resolveDocumentUrl(doc.url, API_BASE_URL) ?? undefined}
                          target="_blank"
                          rel="noopener"
                        >
                          Abrir
                        </a>
                      </div>
                    ) : (
                      <span className="chip chip--ghost">Archivo local</span>
                    )}
                          </div>
                        ))
                      ) : (
                        <p className="empresa-panel__placeholder">Todavia no hay adjuntos.</p>
                      )}
            </div>
            <form
              className="empresa-document-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const saved = await handleAddEmpresaDocument(
                  empresa.id,
                  empresaDocName,
                  empresaDocType,
                  empresaDocFile ?? undefined,
                );
                if (saved) {
                  setEmpresaDocName('');
                  setEmpresaDocType('');
                  setEmpresaDocFile(null);
                }
              }}
            >
              <label>
                <span>Nombre</span>
                <input
                  value={empresaDocName}
                  onChange={(e) => setEmpresaDocName(e.target.value)}
                  placeholder="Ficha de riesgos"
                  required
                />
              </label>
              <label>
                <span>Tipo</span>
                <input
                  value={empresaDocType}
                  onChange={(e) => setEmpresaDocType(e.target.value)}
                  placeholder="PDF"
                />
              </label>
              <label>
                <span>Archivo local</span>
                <input
                  type="file"
                  onChange={(e) => setEmpresaDocFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="submit"
                className="button button--primary button--sm"
                disabled={savingConvenioDocument || !empresaDocFile}
              >
                {savingConvenioDocument ? 'Guardando...' : 'Anadir documento'}
              </button>
            </form>
          </article>
        </div>

        <section className="empresa-log">
          <header>
            <div>
              <p className="module-page__eyebrow">Actividad reciente</p>
              <h3>Ultimos movimientos</h3>
            </div>
            <Link to="/documentacion" className="link">Abrir documentacion</Link>
          </header>
          {activityLog.length === 0 ? (
            <p className="empresa-panel__placeholder">No hay actividad registrada aun.</p>
          ) : (
            <ul>
              {activityLog.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.estudiante.nombre} {item.estudiante.apellido}</strong>
                    <p>{item.estado}  {item.modalidad}</p>
                  </div>
                  <span>{formatDate(item.fechaInicio)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  };

  const ConvenioManagementPage = () => {
    const { convenioId } = useParams();
    const navigate = useNavigate();
    const numericId = convenioId ? Number(convenioId) : Number.NaN;
    const [detail, setDetail] = useState<ConvenioDetail | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [tab, setTab] = useState<'resumen' | 'documentacion'>('resumen');

    useEffect(() => {
      setTab('resumen');
    }, [convenioId]);

    const convenioSummary = useMemo(() => {
      if (!collections || Number.isNaN(numericId)) {
        return null;
      }
      return collections.convenios.find((item) => item.id === numericId) ?? null;
    }, [collections, numericId]);

    useEffect(() => {
      if (!convenioId || Number.isNaN(numericId)) {
        setDetail(null);
        return;
      }

      setDetailLoading(true);
      getConvenioDetail(numericId)
        .then((data) => {
          setDetail(data);
          setDetailError(null);
          applyConvenioExtras(data.id, data);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'No se pudo cargar el detalle del convenio.';
          setDetailError(message);
        })
        .finally(() => setDetailLoading(false));
    }, [applyConvenioExtras, convenioId, numericId]);

    if (!convenioId) {
      return (
        <div className="convenio-page">
          <div className="convenio-page__panel">
            <p>No se ha indicado ningn convenio para gestionar.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    if (!collections) {
      return (
        <div className="convenio-page">
          <div className="convenio-page__panel">
            <p>No hay datos sincronizados. Regresa al dashboard para cargar la informacion.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al dashboard
            </button>
          </div>
        </div>
      );
    }

    if (!convenioSummary) {
      return (
        <div className="convenio-page">
          <div className="convenio-page__panel">
            <p>No encontramos el convenio solicitado.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al dashboard
            </button>
          </div>
        </div>
      );
    }

    const highlightCards = [
      { label: 'Estado', value: convenioSummary.estado },
      { label: 'Tipo', value: convenioSummary.tipo },
      { label: 'Empresa', value: convenioSummary.empresa.nombre },
      { label: 'Asignaciones asociadas', value: convenioSummary.asignacionesAsociadas },
      { label: 'Inicio', value: formatDate(convenioSummary.fechaInicio) },
      { label: 'Fin', value: formatDate(convenioSummary.fechaFin) },
    ];

    return (
      <div className="convenio-page">
        <header className="convenio-page__header">
          <div>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate(-1)}>
              Volver
            </button>
            <p className="module-page__eyebrow">Detalle de convenio</p>
            <h2>{convenioSummary.titulo}</h2>
            <p className="convenio-page__subtitle">{convenioSummary.empresa.nombre}</p>
          </div>
          <div className="convenio-actions">
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => handleEditConvenio(convenioSummary)}
            >
              Editar convenio
            </button>
            <button
              type="button"
              className="button button--primary button--sm"
              onClick={() => openCreateAsignacion({
                convenioId: String(convenioSummary.id),
                empresaId: String(convenioSummary.empresa.id),
              })}
              disabled={loadingReferenceData}
              title={loadingReferenceData ? 'Cargando datos de referencia...' : undefined}
            >
              Planificar asignacion
            </button>
          </div>
        </header>

        {detailError && <div className="app__alert app__alert--error">{detailError}</div>}
        {detailLoading && <div className="app__alert app__alert--info">Cargando datos del convenio...</div>}

        <div className="convenio-summary">
          {highlightCards.map((card) => (
            <article key={card.label} className="convenio-summary__card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>

        <section className="convenio-panel">
          <div className="convenio-tabs">
            <button type="button" className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>
              Resumen
            </button>
            <button type="button" className={tab === 'documentacion' ? 'active' : ''} onClick={() => setTab('documentacion')}>
              Documentacion
            </button>
          </div>

          {tab === 'resumen' ? (
            <div className="convenio-overview">
              <div>
                <span className="student-detail__label">Descripcion</span>
                <p>{detail?.descripcion ?? 'Sin descripcion registrada.'}</p>
              </div>
              <div>
                <span className="student-detail__label">Observaciones</span>
                <p>{detail?.observaciones ?? 'Anade notas de seguimiento para mantener el contexto.'}</p>
              </div>
              <div>
                <span className="student-detail__label">Documentacion firmada</span>
                {detail?.documentoUrl ? (
                  <a className="link" href={detail.documentoUrl} target="_blank" rel="noreferrer">
                    Abrir documento
                  </a>
                ) : (
                  <p>No hay documentos adjuntos todavia.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="convenio-docs">
              <article>
                <h4>Guias recomendadas</h4>
                <ul>
                  <li>
                    <Link to="/documentacion" className="link">Documentacion general del proyecto</Link>
                  </li>
                  <li>
                    <a
                      className="link"
                      href="https://github.com/lmendez861/TFG-Agora/blob/main/README.md"
                      target="_blank"
                      rel="noreferrer"
                    >
                      README raz
                    </a>
                  </li>
                  <li>
                    <a
                      className="link"
                      href="https://github.com/lmendez861/TFG-Agora/blob/main/frontend/README.md"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Gua del frontend
                    </a>
                  </li>
                </ul>
              </article>
              <article>
                <h4>Checklist de convenio</h4>
                <ol>
                  <li>Validar el estado (borrador, vigente, finalizado) antes de compartirlo.</li>
                  <li>Confirmar fechas de inicio y fin con la empresa colaboradora.</li>
                  <li>Adjuntar documentacion firmada o enlazar al repositorio correspondiente.</li>
                </ol>
              </article>
            </div>
          )}
        </section>
      </div>
    );
  };

  const AsignacionManagementPage = () => {
    const { asignacionId } = useParams();
    const navigate = useNavigate();
    const numericId = asignacionId ? Number(asignacionId) : Number.NaN;
    const [detail, setDetail] = useState<AsignacionDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const asignacionSummary = useMemo(() => {
      if (!collections || Number.isNaN(numericId)) {
        return null;
      }
      return collections.asignaciones.find((item) => item.id === numericId) ?? null;
    }, [collections, numericId]);

    useEffect(() => {
      if (!asignacionId || Number.isNaN(numericId)) {
        setDetail(null);
        return;
      }

      setDetailLoading(true);
      getAsignacionDetail(numericId)
        .then((data) => {
          setDetail(data);
          setDetailError(null);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'No se pudo obtener el detalle de la asignacion.';
          setDetailError(message);
        })
        .finally(() => setDetailLoading(false));
    }, [asignacionId, numericId]);

    if (!asignacionId) {
      return (
        <div className="asignacion-page">
          <div className="asignacion-page__panel">
            <p>No se ha indicado ninguna asignacion.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    if (!collections) {
      return (
        <div className="asignacion-page">
          <div className="asignacion-page__panel">
            <p>No hay datos sincronizados todavia. Regresa al dashboard y sincroniza con el backend.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al dashboard
            </button>
          </div>
        </div>
      );
    }

    if (!asignacionSummary) {
      return (
        <div className="asignacion-page">
          <div className="asignacion-page__panel">
            <p>No encontramos la asignacion solicitada.</p>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>
              Volver al dashboard
            </button>
          </div>
        </div>
      );
    }

    const studentName = `${asignacionSummary.estudiante.nombre} ${asignacionSummary.estudiante.apellido}`;
    const detailCards = [
      { label: 'Estado', value: asignacionSummary.estado },
      { label: 'Modalidad', value: asignacionSummary.modalidad },
      { label: 'Horas totales', value: asignacionSummary.horasTotales ?? 'Por confirmar' },
      { label: 'Empresa', value: asignacionSummary.empresa.nombre },
      { label: 'Estudiante', value: studentName },
    ];

    const timelineEvents = useMemo(() => {
      const events: Array<{ title: string; date: string; note?: string }> = [];
      events.push({
        title: 'Inicio planificado',
        date: formatDate(asignacionSummary.fechaInicio),
        note: 'Aprobado por coordinacion',
      });
      if (asignacionSummary.fechaFin) {
        events.push({
          title: 'Fin estimado',
          date: formatDate(asignacionSummary.fechaFin),
          note: 'Actualiza si hay prorroga',
        });
      }
      if (detail) {
        events.push({
          title: 'Tutor academico asignado',
          date: new Date().toLocaleDateString('es-ES'),
          note: `${detail.tutorAcademico.nombre} ${detail.tutorAcademico.apellido}`,
        });
        if (detail.tutorProfesional) {
          events.push({
            title: 'Tutor profesional confirmado',
            date: new Date().toLocaleDateString('es-ES'),
            note: detail.tutorProfesional.nombre,
          });
        }
      }
      return events;
    }, [asignacionSummary, detail]);

    const contactActions = [
      detail?.estudiante.email && {
        label: 'Contactar estudiante',
        href: `mailto:${detail.estudiante.email}`,
      },
      detail?.tutorAcademico.email && {
        label: 'Tutor academico',
        href: `mailto:${detail.tutorAcademico.email}`,
      },
      detail?.tutorProfesional?.email && {
        label: 'Tutor profesional',
        href: `mailto:${detail.tutorProfesional.email}`,
      },
    ].filter(Boolean) as Array<{ label: string; href: string }>;

    return (
      <div className="asignacion-page">
        <header className="asignacion-page__header">
          <div>
            <button type="button" className="button button--ghost button--sm" onClick={() => navigate(-1)}>
              Volver
            </button>
            <p className="module-page__eyebrow">Detalle de asignacion</p>
            <h2>{studentName}  {asignacionSummary.empresa.nombre}</h2>
            <p className="asignacion-page__subtitle">Convenio: {detail?.convenio.titulo ?? 'Sin convenio detallado'}</p>
          </div>
          <div className="asignacion-actions">
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => handleEditAsignacion(asignacionSummary)}
            >
              Reprogramar / editar
            </button>
            <button
              type="button"
              className="button button--primary button--sm"
              onClick={() => openCreateAsignacion({
                empresaId: String(asignacionSummary.empresa.id),
                estudianteId: String(asignacionSummary.estudiante.id),
                convenioId: detail ? String(detail.convenio.id) : '',
              })}
              disabled={loadingReferenceData}
              title={loadingReferenceData ? 'Cargando datos de referencia...' : undefined}
            >
              Duplicar asignacion
            </button>
          </div>
        </header>

        {detailError && <div className="app__alert app__alert--error">{detailError}</div>}
        {detailLoading && <div className="app__alert app__alert--info">Cargando detalle actualizado...</div>}

        <div className="asignacion-summary">
          {detailCards.map((card) => (
            <article key={card.label} className="asignacion-summary__card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>

        <div className="asignacion-grid">
          <article className="asignacion-card">
            <h3>Fechas y alcance</h3>
            <div className="asignacion-info-grid">
              <div>
                <span>Inicio</span>
                <strong>{formatDate(asignacionSummary.fechaInicio)}</strong>
              </div>
              <div>
                <span>Fin</span>
                <strong>{formatDate(asignacionSummary.fechaFin)}</strong>
              </div>
              <div>
                <span>Modalidad</span>
                <strong>{asignacionSummary.modalidad}</strong>
              </div>
              <div>
                <span>Horas</span>
                <strong>{asignacionSummary.horasTotales ?? 'Por definir'}</strong>
              </div>
            </div>
          </article>

          <article className="asignacion-card">
            <h3>Tutores asignados</h3>
            <div className="asignacion-info-grid">
              <div>
                <span>Tutor academico</span>
                <strong>
                  {detail ? `${detail.tutorAcademico.nombre} ${detail.tutorAcademico.apellido}` : 'Cargando...'}
                </strong>
              </div>
              <div>
                <span>Tutor profesional</span>
                <strong>{detail?.tutorProfesional?.nombre ?? 'Sin asignar'}</strong>
              </div>
              <div>
                <span>Convenio</span>
                <strong>{detail?.convenio.titulo ?? 'No disponible'}</strong>
              </div>
              <div>
                <span>Empresa</span>
                <strong>{asignacionSummary.empresa.nombre}</strong>
              </div>
            </div>
          </article>

          <article className="asignacion-card asignacion-card--contacts">
            <h3>Acciones rapidas</h3>
            {contactActions.length === 0 ? (
              <p>No hay contactos directos disponibles.</p>
            ) : (
              <div className="asignacion-actions__links">
                {contactActions.map((action) => (
                  <a key={action.href} className="button button--ghost button--sm" href={action.href}>
                    {action.label}
                  </a>
                ))}
              </div>
            )}
          </article>
        </div>

        <section className="asignacion-timeline">
          <header>
            <div>
              <p className="module-page__eyebrow">Seguimiento</p>
              <h3>Timeline de hitos</h3>
            </div>
          </header>
          <div className="asignacion-timeline__list">
            {timelineEvents.map((event, index) => (
              <article key={`${event.title}-${index}`} className="asignacion-timeline__item">
                <div className="asignacion-timeline__bullet">
                  <span>{index + 1}</span>
                </div>
                <div>
                  <h4>{event.title}</h4>
                  <p>{event.date}</p>
                  {event.note && <small>{event.note}</small>}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="asignacion-docs">
          <article>
            <h4>Informes y anexos</h4>
            <p>Enlaza actas semanales, evaluaciones y rubricas firmadas.</p>
            <Link to="/documentacion" className="link">Abrir documentacion</Link>
          </article>
          <article>
            <h4>Checklist interno</h4>
            <ul>
              <li>Confirmar asistencia semanal del estudiante.</li>
              <li>Registrar feedback de ambos tutores.</li>
              <li>Adjuntar informe final antes de cerrar la asignacion.</li>
            </ul>
          </article>
        </section>
      </div>
    );
  };

  const ModulePageFallback = ({ title }: { title: string }) => (
    <section className="module-page">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">{title}</p>
          <h2>Sin datos disponibles</h2>
          <p>Sincroniza desde el dashboard principal para cargar la informacion.</p>
        </div>
        <Link className="button button--ghost button--sm" to="/">
          Volver al dashboard
        </Link>
      </header>
    </section>
  );

  const EmpresasOverviewPage = () => {
    if (!collections) {
      return <ModulePageFallback title="Empresas" />;
    }

    const navigate = useNavigate();
    const [empresaLookupId, setEmpresaLookupId] = useState<string>('');
    const notes = selectedEmpresa ? empresaNotes[selectedEmpresa.id] ?? [] : [];
    const labels = selectedEmpresa ? empresaLabels[selectedEmpresa.id] ?? [] : [];
    const documents = selectedEmpresa ? empresaDocs[selectedEmpresa.id] ?? [] : [];
    const conveniosPreview = selectedEmpresaDetail ? selectedEmpresaDetail.convenios.slice(0, 3) : [];
    const asignacionesPreview = selectedEmpresaDetail ? selectedEmpresaDetail.asignaciones.slice(0, 4) : [];

    return (
      <section className="module-page module-page--wide">
        <header className="module-page__header">
          <div>
            <p className="module-page__eyebrow">Modulo empresas</p>
            <h2>Empresas colaboradoras</h2>
            <p>Repasa el estado de colaboracion, contactos y convenios activos.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/">
            Volver al dashboard
          </Link>
        </header>
        <form
          className="module-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (empresaLookupId) {
              navigate(`/empresas/${empresaLookupId}`);
            }
          }}
        >
          <label>
            <span>Gestionar empresa</span>
            <select value={empresaLookupId} onChange={(event) => setEmpresaLookupId(event.target.value)}>
              <option value="">Selecciona una empresa</option>
              {collections.empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="button button--primary button--sm" disabled={!empresaLookupId}>
            Ir a gestion
          </button>
        </form>
        <DataTable
          caption="Empresas"
          data={collections.empresas}
          columns={empresaColumns}
          actions={(
            <>
              {empresaActions}
              <button type="button" className="button button--ghost button--sm" onClick={handleExportEmpresas}>
                Exportar CSV
              </button>
            </>
          )}
        />

        <div className="detail-grid">
          <div className="detail-grid__list">
            <div className="detail-grid__header">
              <h3>Empresas por sector</h3>
              <div className="filter-chips">
                <button
                  type="button"
                  className={`chip ${empresaSectorFilter === 'todos' ? 'active' : ''}`}
                  onClick={() => setEmpresaSectorFilter('todos')}
                >
                  Todos
                </button>
                {empresaSectors.map((sector) => (
                  <button
                    key={sector}
                    type="button"
                    className={`chip ${empresaSectorFilter === sector ? 'active' : ''}`}
                    onClick={() => setEmpresaSectorFilter(sector)}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>
            <div className="detail-list">
              {filteredEmpresas.map((empresa) => (
                <button
                  type="button"
                  key={empresa.id}
                  className={`detail-item ${selectedEmpresa?.id === empresa.id ? 'active' : ''}`}
                  onClick={() => setSelectedEmpresaId(empresa.id)}
                >
                  <div>
                    <strong>{empresa.nombre}</strong>
                    <p>{empresa.ciudad ?? 'Sin ciudad'}</p>
                  </div>
                  <span className="chip chip--ghost">{empresa.estadoColaboracion}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="detail-grid__panel">
            <h3>Resumen ejecutivo</h3>
            {selectedEmpresa ? (
              <>
                <div className="empresa-summary-mini">
                  <article>
                    <span>Sector</span>
                    <strong>{selectedEmpresa.sector ?? 'No definido'}</strong>
                  </article>
                  <article>
                    <span>Ciudad</span>
                    <strong>{selectedEmpresa.ciudad ?? 'No definida'}</strong>
                  </article>
                  <article>
                    <span>Estado colaboracion</span>
                    <strong>{selectedEmpresa.estadoColaboracion}</strong>
                  </article>
                  <article>
                    <span>Tutores profesionales</span>
                    <strong>{selectedEmpresa.tutoresProfesionales}</strong>
                  </article>
                </div>
                <div className="empresa-360">
                  <article className="empresa-360__card">
                    <div>
                      <p className="module-page__eyebrow">Situacin actual</p>
                      <h4>{selectedEmpresa.nombre}</h4>
                    </div>
                    <div className="empresa-360__info">
                      <div>
                        <span>Convenios activos</span>
                        <strong>{selectedEmpresa.conveniosActivos}</strong>
                      </div>
                      <div>
                        <span>Asignaciones en curso</span>
                        <strong>{selectedEmpresa.asignaciones.enCurso}</strong>
                      </div>
                      <div>
                        <span>Total asignaciones</span>
                        <strong>{selectedEmpresa.asignaciones.total}</strong>
                      </div>
                      <div>
                        <span>Etiquetas registradas</span>
                        <strong>{labels.length}</strong>
                      </div>
                      <div>
                        <span>Notas internas</span>
                        <strong>{notes.length}</strong>
                      </div>
                      <div>
                        <span>Documentos compartidos</span>
                        <strong>{documents.length}</strong>
                      </div>
                    </div>
                    <div className="empresa-360__actions">
                      <button type="button" className="button button--ghost button--sm" onClick={() => handleEditEmpresa(selectedEmpresa)}>
                        Editar ficha
                      </button>
                      <button type="button" className="button button--primary button--sm" onClick={() => navigate(`/empresas/${selectedEmpresa.id}`)}>
                        Abrir ficha 360
                      </button>
                    </div>
                  </article>
                </div>
                {selectedEmpresaDetail ? (
                  <div className="empresa-panels">
                    <article className="empresa-panel">
                      <header>
                        <div>
                          <p className="module-page__eyebrow">Convenios</p>
                          <h4>Flujo contractual</h4>
                        </div>
                        <button type="button" className="button button--ghost button--sm" onClick={() => navigate(`/empresas/${selectedEmpresa.id}`)}>
                          Ver todos
                        </button>
                      </header>
                      {conveniosPreview.length > 0 ? (
                        <ul>
                          {conveniosPreview.map((convenio) => (
                            <li key={convenio.id}>
                              <strong>{convenio.titulo}</strong>
                              <p>{formatDate(convenio.fechaInicio)} - {formatDate(convenio.fechaFin)}</p>
                              <span className="chip chip--ghost">{convenio.estado}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="empresa-panel__placeholder">Sin convenios asociados.</p>
                      )}
                    </article>
                    <article className="empresa-panel">
                      <header>
                        <div>
                          <p className="module-page__eyebrow">Asignaciones</p>
                          <h4>Talento vinculado</h4>el
                        </div>
                        <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/asignaciones')}>
                          Abrir pipeline
                        </button>
                      </header>
                      {asignacionesPreview.length > 0 ? (
                        <ul>
                          {asignacionesPreview.map((asignacion) => (
                            <li key={asignacion.id}>
                              <strong>{asignacion.estudiante.nombre} {asignacion.estudiante.apellido}</strong>
                              <p>{formatDate(asignacion.fechaInicio)} - {formatDate(asignacion.fechaFin)}</p>
                              <span className="chip chip--ghost">{asignacion.estado}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="empresa-panel__placeholder">Aun no hay asignaciones registradas.</p>
                      )}
                    </article>
                    <article className="empresa-panel">
                      <header>
                        <div>
                          <p className="module-page__eyebrow">Contexto adicional</p>
                          <h4>Sintesis rapida</h4>
                        </div>
                      </header>
                      <ul>
                        <li>
                          <strong>Etiquetas activas</strong>
                          <p>{labels.length > 0 ? labels.join(', ') : 'Sin etiquetas registradas.'}</p>
                        </li>
                        <li>
                          <strong>Notas colaborativas</strong>
                          <p>{notes.length > 0 ? `${notes.length} notas internas` : 'Aun no hay notas guardadas.'}</p>
                        </li>
                        <li>
                          <strong>Documentos compartidos</strong>
                          <p>{documents.length > 0 ? `${documents.length} archivos disponibles` : 'Todavia no hay adjuntos.'}</p>
                        </li>
                      </ul>
                    </article>
                  </div>
                ) : (
                  <p className="detail-placeholder">Sin convenios ni asignaciones para mostrar.</p>
                )}
              </>
            ) : (
              <p className="detail-placeholder">Selecciona una empresa para ver el resumen.</p>
            )}
          </div>
        </div>


      </section>
    );
  };

  const ConveniosOverviewPage = () => {
    const [documentName, setDocumentName] = useState('');
    const [documentType, setDocumentType] = useState('');

    if (!collections) {
      return <ModulePageFallback title="Convenios" />;
    }

    const totalConvenios = collections.convenios.length;
    const conveniosVigentes = collections.convenios.filter(
      (convenio) => convenio.estado?.toLowerCase().includes('vig'),
    ).length;
    const conveniosPendientes = collections.convenios.filter(
      (convenio) => convenio.estado?.toLowerCase().includes('pend'),
    ).length;
    const proximosRenovacion = collections.convenios.filter((convenio) => {
      if (!convenio.fechaFin) {
        return false;
      }
      const fin = new Date(convenio.fechaFin).getTime();
      if (Number.isNaN(fin)) {
        return false;
      }
      const now = Date.now();
      const windowMs = 1000 * 60 * 60 * 24 * 60;
      return fin > now && fin - now <= windowMs;
    }).length;
    const totalAlertasActivas = Object.values(convenioAlerts).reduce((acc, alertList) => {
      const activos = alertList.filter((alert) => alert.active).length;
      return acc + activos;
    }, 0);

    const workflowState = selectedConvenio
      ? convenioWorkflowState[selectedConvenio.id] ?? selectedConvenio.estado
      : null;
    const checklistItems = selectedConvenio ? convenioChecklist[selectedConvenio.id] ?? [] : [];
    const completedChecklist = checklistItems.filter((item) => item.completed).length;
    const documents = selectedConvenio ? convenioDocuments[selectedConvenio.id] ?? [] : [];
    const alerts = selectedConvenio ? convenioAlerts[selectedConvenio.id] ?? [] : [];
    const activeAlerts = alerts.filter((alert) => alert.active);
    const workflowIndex = workflowState ? CONVENIO_STEP_FLOW.indexOf(workflowState) : -1;
    const workflowPosition = workflowIndex >= 0 ? workflowIndex + 1 : 0;

    const handleDocumentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedConvenio) {
        return;
      }

      const saved = await handleAddConvenioDocument(selectedConvenio.id, documentName, documentType);
      if (saved) {
        setDocumentName('');
        setDocumentType('');
      }
    };

    return (
      <section className="module-page module-page--wide">
        <header className="module-page__header">
          <div>
            <p className="module-page__eyebrow">Modulo convenios</p>
            <h2>Convenios y acuerdos</h2>
            <p>Controla el workflow, checklist documental y recordatorios criticos.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/">
            Volver al dashboard
          </Link>
        </header>
        <DataTable
          caption="Convenios"
          data={collections.convenios}
          columns={convenioColumns}
          actions={(
            <>
              {convenioActions}
              <button type="button" className="button button--ghost button--sm" onClick={handleExportConvenios}>
                Exportar CSV
              </button>
            </>
          )}
        />

        <section className="convenio-insights">
          <article>
            <span>Total convenios</span>
            <strong>{totalConvenios}</strong>
          </article>
          <article>
            <span>Vigentes</span>
            <strong>{conveniosVigentes}</strong>
          </article>
          <article>
            <span>Por renovar (60 dias)</span>
            <strong>{proximosRenovacion}</strong>
          </article>
          <article>
            <span>En borrador / pendientes</span>
            <strong>{conveniosPendientes}</strong>
          </article>
          <article>
            <span>Alertas activas</span>
            <strong>{totalAlertasActivas}</strong>
          </article>
        </section>

        <section className="convenio-layout">
          <aside className="convenio-sidebar">
            <div>
              <p className="module-page__eyebrow">Filtros rapidos</p>
              <h3>Lista de convenios</h3>
              <p>Acota por estado o empresa y selecciona el convenio que quieras revisar.</p>
            </div>
            <div className="convenio-sidebar__filters">
              <div>
                <span>Estado</span>
                <div className="filter-chips">
                  <button
                    type="button"
                    className={`chip ${convenioEstadoFilter === 'todos' ? 'active' : ''}`}
                    onClick={() => setConvenioEstadoFilter('todos')}
                  >
                    Todos
                  </button>
                  {convenioEstados.map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      className={`chip ${convenioEstadoFilter === estado ? 'active' : ''}`}
                      onClick={() => setConvenioEstadoFilter(estado)}
                    >
                      {estado}
                    </button>
                  ))}
                </div>
              </div>
              <label className="convenio-sidebar__select">
                <span>Empresa</span>
                <select value={convenioEmpresaFilter} onChange={(event) => setConvenioEmpresaFilter(event.target.value)}>
                  <option value="todos">Todas las empresas</option>
                  {collections.empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="convenio-sidebar__list">
              {filteredConvenios.length === 0 ? (
                <p className="detail-placeholder">No hay convenios que coincidan con el filtro.</p>
              ) : (
                filteredConvenios.map((convenio) => {
                  const isActive = selectedConvenio?.id === convenio.id;
                  return (
                    <button
                      type="button"
                      key={convenio.id}
                      className={`convenio-list__item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedConvenioId(convenio.id)}
                    >
                      <div>
                        <strong>{convenio.titulo}</strong>
                        <small>{convenio.empresa.nombre}</small>
                      </div>
                      <span className="chip chip--ghost">
                        {convenioWorkflowState[convenio.id] ?? convenio.estado}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="convenio-panel">
            {selectedConvenio ? (
              <>
                <div className="convenio-panel__header">
                  <div>
                    <p className="convenio-detail__eyebrow">Convenio #{selectedConvenio.id}</p>
                    <h3>{selectedConvenio.titulo}</h3>
                    <p className="convenio-detail__company">{selectedConvenio.empresa.nombre}</p>
                  </div>
                  <div className="convenio-panel__actions">
                    <span className="chip chip--ghost">{workflowState}</span>
                    <button
                      type="button"
                      className="button button--ghost button--sm"
                      onClick={() => handleAdvanceConvenioState(selectedConvenio.id)}
                    >
                      Avanzar estado
                    </button>
                    <Link className="button button--primary button--sm" to={`/convenios/${selectedConvenio.id}`}>
                      Abrir ficha
                    </Link>
                  </div>
                </div>
                <div className="convenio-panel__meta">
                  <article>
                    <span>Tipo</span>
                    <strong>{selectedConvenio.tipo}</strong>
                  </article>
                  <article>
                    <span>Inicio</span>
                    <strong>{formatDate(selectedConvenio.fechaInicio)}</strong>
                  </article>
                  <article>
                    <span>Fin</span>
                    <strong>{formatDate(selectedConvenio.fechaFin)}</strong>
                  </article>
                  <article>
                    <span>Asignaciones asociadas</span>
                    <strong>{selectedConvenio.asignacionesAsociadas}</strong>
                  </article>
                </div>

                <div className="convenio-workflow">
                  <div className="convenio-workflow__header">
                    <div>
                      <p className="convenio-detail__eyebrow">Workflow</p>
                      <h4>Estados del acuerdo</h4>
                    </div>
                    <p>
                      Paso {workflowPosition} de {CONVENIO_STEP_FLOW.length}
                    </p>
                  </div>
                  <div className="workflow-steps">
                    {CONVENIO_STEP_FLOW.map((step, index) => {
                      const isCompleted = workflowIndex > index;
                      const isCurrent = workflowIndex === index;
                      return (
                        <div
                          key={step}
                          className={`workflow-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                        >
                          <span>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="convenio-extras">
                  <article className="convenio-card">
                    <header>
                      <div>
                        <p className="convenio-detail__eyebrow">Checklist documental</p>
                        <h4>{completedChecklist}/{checklistItems.length} completados</h4>
                      </div>
                    </header>
                    {checklistItems.length > 0 ? (
                      <ul className="convenio-checklist">
                        {checklistItems.map((item) => (
                          <li key={item.id}>
                            <label className={`convenio-checklist__item ${item.completed ? 'completed' : ''}`}>
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleToggleChecklistItem(selectedConvenio.id, item.id)}
                              />
                              <span>{item.label}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="detail-placeholder">Aun no se ha definido el checklist.</p>
                    )}
                  </article>

                  <article className="convenio-card">
                    <header>
                      <div>
                        <p className="convenio-detail__eyebrow">Documentos recientes</p>
                        <h4>{documents.length} ficheros</h4>
                      </div>
                    </header>
                    <div className="convenio-documents">
                      {documents.length > 0 ? (
                        documents.map((doc) => (
                          <div key={doc.id} className="convenio-document">
                            <div>
                              <strong>{doc.name}</strong>
                              <small>{doc.type} - {formatDate(doc.uploadedAt)}</small>
                            </div>
                            {doc.url ? (
                              <div className="document-actions">
                                {canPreviewDocument(doc, API_BASE_URL) && (
                                  <button
                                    type="button"
                                    className="button button--ghost button--sm"
                                    onClick={() => openDocumentPreview(doc.name, doc.url)}
                                  >
                                    Vista previa PDF
                                  </button>
                                )}
                                <a
                                  className="button button--link"
                                  href={resolveDocumentUrl(doc.url, API_BASE_URL) ?? undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Descargar
                                </a>
                              </div>
                            ) : (
                              <span className="chip chip--ghost">Sin enlace</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="detail-placeholder">Sin documentos adjuntos todavia.</p>
                      )}
                    </div>
                    <form className="convenio-document-form" onSubmit={handleDocumentSubmit}>
                      <label>
                        <span>Nombre</span>
                        <input
                          value={documentName}
                          onChange={(event) => setDocumentName(event.target.value)}
                          placeholder="Acta renovacin"
                          required
                        />
                      </label>
                      <label>
                        <span>Tipo</span>
                        <input
                          value={documentType}
                          onChange={(event) => setDocumentType(event.target.value)}
                          placeholder="PDF"
                        />
                      </label>
                      <button type="submit" className="button button--primary button--sm" disabled={savingConvenioDocument}>
                        {savingConvenioDocument ? 'Guardando...' : 'Anadir documento'}
                      </button>
                    </form>
                  </article>

                  <article className="convenio-card convenio-card--alerts">
                    <header>
                      <div>
                        <p className="convenio-detail__eyebrow">Alertas</p>
                        <h4>{activeAlerts.length} activas</h4>
                      </div>
                    </header>
                    <div className="convenio-alerts">
                      {alerts.length > 0 ? (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={`convenio-alert convenio-alert--${alert.level} ${alert.active ? '' : 'convenio-alert--inactive'}`}
                          >
                            <p>{alert.message}</p>
                            {alert.active ? (
                              <button
                                type="button"
                                className="button button--ghost button--sm"
                                onClick={() => handleDismissConvenioAlert(selectedConvenio.id, alert.id)}
                              >
                                Marcar como resuelta
                              </button>
                            ) : (
                              <small>Resuelta</small>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="detail-placeholder">Sin alertas configuradas.</p>
                      )}
                    </div>
                  </article>
                </div>
              </>
            ) : (
              <p className="detail-placeholder">Selecciona un convenio para ver KPIs.</p>
            )}
          </div>
        </section>

      </section>
    );
  };

  const EstudiantesOverviewPage = () => {
    const navigate = useNavigate();

    if (!collections) {
      return <ModulePageFallback title="Estudiantes" />;
    }

    const estadoOptions = ['todos', ...studentEstados];

    return (
      <section className="module-page module-page--wide">
        <header className="module-page__header">
          <div>
            <p className="module-page__eyebrow">Modulo estudiantes</p>
            <h2>Listado completo de estudiantes</h2>
            <p>Consulta informacion academica, asignaciones y contacto.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/">
            Volver al dashboard
          </Link>
        </header>
        <DataTable
          caption="Estudiantes"
          data={collections.estudiantes}
          columns={estudianteColumns}
          actions={(
            <>
              {estudianteActions}
              <button type="button" className="button button--ghost button--sm" onClick={handleExportEstudiantes}>
                Exportar CSV
              </button>
            </>
          )}
        />

        <section className="student-layout">
          <aside className="student-layout__sidebar">
            <div>
              <p className="module-page__eyebrow">Perfiles 360</p>
              <h3>Filtros inteligentes</h3>
              <p>Selecciona un estado y profundiza en el perfil seleccionado.</p>
            </div>
            <div className="student-layout__filters">
              <span>Estado</span>
              <div className="filter-chips">
                {estadoOptions.map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    className={`chip ${studentEstadoFilter === estado ? 'active' : ''}`}
                    onClick={() => setStudentEstadoFilter(estado)}
                  >
                    {estado === 'todos' ? 'Todos' : estado}
                  </button>
                ))}
              </div>
            </div>
            <div className="student-layout__list">
              {filteredStudents.length === 0 ? (
                <p className="detail-placeholder">No hay estudiantes con ese estado.</p>
              ) : (
                filteredStudents.map((estudiante) => {
                  const isActive = selectedStudent?.id === estudiante.id;
                  return (
                    <button
                      type="button"
                      key={estudiante.id}
                      className={`student-list-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedStudent((current) => (current?.id === estudiante.id ? null : estudiante))}
                    >
                      <div>
                        <strong>{estudiante.nombre} {estudiante.apellido}</strong>
                        <small>{estudiante.grado ?? 'Grado no indicado'}</small>
                      </div>
                      <div className="student-card__chips">
                        <span className="chip chip--ghost">{estudiante.estado}</span>
                        <span className="chip chip--ghost">
                          {estudiante.asignaciones.enCurso}/{estudiante.asignaciones.total}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
          <div className="student-layout__panel">
            {selectedStudent ? (
              <article className="student-profile">
                <div className="student-profile__header">
                  <div>
                    <p className="module-page__eyebrow">Ficha del estudiante</p>
                    <h3>{selectedStudent.nombre} {selectedStudent.apellido}</h3>
                    <p className="student-profile__email">{selectedStudent.email}</p>
                  </div>
                  <div className="student-profile__actions">
                    <span className="chip chip--ghost">{selectedStudent.estado}</span>
                    <div className="student-profile__actions-buttons">
                      <button type="button" className="button button--ghost button--sm" onClick={() => handleEditStudent(selectedStudent)}>
                        Editar ficha
                      </button>
                      <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/asignaciones')}>
                        Planificar asignacion
                      </button>
                      <a className="button button--link button--sm" href={`mailto:${selectedStudent.email}`}>
                        Enviar correo
                      </a>
                    </div>
                  </div>
                </div>

                <div className="student-profile__metrics">
                  <article>
                    <span>Asignaciones activas</span>
                    <strong>{selectedStudent.asignaciones.enCurso}</strong>
                  </article>
                  <article>
                    <span>Total asignaciones</span>
                    <strong>{selectedStudent.asignaciones.total}</strong>
                  </article>
                  <article>
                    <span>Curso actual</span>
                    <strong>{selectedStudent.curso ?? 'No indicado'}</strong>
                  </article>
                </div>

                <div className="student-profile__section">
                  <div className="student-profile__section-header">
                    <h4>Ficha academica</h4>
                    <button type="button" className="button button--ghost button--sm" onClick={() => handleEditStudent(selectedStudent)}>
                      Actualizar datos
                    </button>
                  </div>
                  <div className="student-detail__grid">
                    <div>
                      <span className="student-detail__label">DNI</span>
                      <strong>{selectedStudent.dni}</strong>
                    </div>
                    <div>
                      <span className="student-detail__label">Grado</span>
                      <strong>{selectedStudent.grado ?? 'No especificado'}</strong>
                    </div>
                    <div>
                      <span className="student-detail__label">Curso</span>
                      <strong>{selectedStudent.curso ?? 'No indicado'}</strong>
                    </div>
                    <div>
                      <span className="student-detail__label">Email</span>
                      <strong>{selectedStudent.email}</strong>
                    </div>
                  </div>
                </div>

                <div className="student-profile__section">
                  <div className="student-profile__section-header">
                    <h4>Asignaciones</h4>
                    <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/asignaciones')}>
                      Ver modulo
                    </button>
                  </div>
                  {selectedStudentAssignments.length > 0 ? (
                    <div className="student-profile__assignments">
                      {selectedStudentAssignments.map((asignacion) => (
                        <article className="student-assignment" key={asignacion.id}>
                          <div>
                            <strong>{asignacion.empresa.nombre}</strong>
                            <p>{formatDate(asignacion.fechaInicio)} - {formatDate(asignacion.fechaFin)}</p>
                          </div>
                          <div className="student-assignment__tags">
                            <span className="chip chip--ghost">{asignacion.estado}</span>
                            <span className="chip chip--ghost">{asignacion.modalidad}</span>
                          </div>
                          <Link className="link" to={`/empresas/${asignacion.empresa.id}`}>
                            Abrir empresa
                          </Link>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="student-detail__placeholder">Todavia no tiene asignaciones registradas.</p>
                  )}
                </div>

                <div className="student-profile__section">
                  <div className="student-profile__section-header">
                    <h4>Seguimiento</h4>
                    <button type="button" className="button button--ghost button--sm" onClick={() => navigate('/')}>Volver al dashboard</button>
                  </div>
                  <div className="student-timeline">
                    {studentTimeline.map((milestone, index) => (
                      <article key={milestone.id} className="student-timeline__item">
                        <div className="student-timeline__bullet">
                          <span>{index + 1}</span>
                        </div>
                        <div>
                          <h5>{milestone.title}</h5>
                          <p>{milestone.date}</p>
                          <div className="student-card__chips">
                            <span className="chip chip--ghost">{milestone.status}</span>
                            <span className="chip chip--ghost">{milestone.modalidad}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </article>
            ) : (
              <p className="detail-placeholder">Selecciona un estudiante para revisar su ficha.</p>
            )}
          </div>
        </section>
      </section>
    );
  };

  const AsignacionesOverviewPage = () => {
    const navigate = useNavigate();

    if (!collections) {
      return <ModulePageFallback title="Asignaciones" />;
    }

    const estadoOptions = ['todos', ...asignacionEstados];
    const modalidadOptions = ['todas', ...asignacionModalidades];
    const totalAsignaciones = collections.asignaciones.length;
    const enCursoCount = collections.asignaciones.filter((asignacion) => asignacion.estado === 'en_curso').length;
    const planificadasCount = collections.asignaciones.filter((asignacion) => asignacion.estado === 'planificada').length;
    const finalizadasCount = collections.asignaciones.filter((asignacion) => asignacion.estado === 'finalizada').length;
    const totalHorasPlanificadas = collections.asignaciones.reduce(
      (acc, asignacion) => acc + (asignacion.horasTotales ?? 0),
      0,
    );

    return (
      <section className="module-page module-page--wide">
        <header className="module-page__header">
          <div>
            <p className="module-page__eyebrow">Modulo asignaciones</p>
            <h2>Pipeline completo de asignaciones</h2>
            <p>Repasa cada practica, tutores asignados y estado actual.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/">
            Volver al dashboard
          </Link>
        </header>
        <DataTable
          caption="Asignaciones"
          data={collections.asignaciones}
          columns={asignacionColumns}
          actions={(
            <>
              {asignacionActions}
              <button type="button" className="button button--ghost button--sm" onClick={handleExportAsignaciones}>
                Exportar CSV
              </button>
            </>
          )}
        />

        <section className="asignacion-insights">
          <article>
            <span>Total asignaciones</span>
            <strong>{totalAsignaciones}</strong>
          </article>
          <article>
            <span>En curso</span>
            <strong>{enCursoCount}</strong>
          </article>
          <article>
            <span>Planificadas</span>
            <strong>{planificadasCount}</strong>
          </article>
          <article>
            <span>Finalizadas</span>
            <strong>{finalizadasCount}</strong>
          </article>
          <article>
            <span>Horas planificadas</span>
            <strong>{totalHorasPlanificadas}</strong>
          </article>
        </section>

        <section className="asignacion-layout">
          <aside className="asignacion-sidebar">
            <div>
              <p className="module-page__eyebrow">Filtros rapidos</p>
              <h3>Lista de asignaciones</h3>
              <p>Aplica filtros por estado o modalidad y abre cada ficha en un clic.</p>
            </div>
            <div className="asignacion-sidebar__filters">
              <div>
                <span>Estado</span>
                <div className="filter-chips">
                  {estadoOptions.map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      className={`chip ${asignacionEstadoFilter === estado ? 'active' : ''}`}
                      onClick={() => setAsignacionEstadoFilter(estado)}
                    >
                      {estado === 'todos' ? 'Todos' : estado}
                    </button>
                  ))}
                </div>
              </div>
              <label className="asignacion-sidebar__select">
                <span>Modalidad</span>
                <select
                  value={asignacionModalidadFilter}
                  onChange={(event) => setAsignacionModalidadFilter(event.target.value)}
                >
                  {modalidadOptions.map((modalidad) => (
                    <option key={modalidad} value={modalidad}>
                      {modalidad === 'todas' ? 'Todas las modalidades' : modalidad}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="asignacion-sidebar__list">
              {filteredAsignaciones.length === 0 ? (
                <p className="detail-placeholder">No hay asignaciones con esos filtros.</p>
              ) : (
                filteredAsignaciones.map((asignacion) => {
                  const isActive = selectedAsignacion?.id === asignacion.id;
                  return (
                    <button
                      type="button"
                      key={asignacion.id}
                      className={`asignacion-list__item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedAsignacion(asignacion)}
                    >
                      <div>
                        <strong>{asignacion.estudiante.nombre} {asignacion.estudiante.apellido}</strong>
                        <small>{asignacion.empresa.nombre}</small>
                      </div>
                      <div className="asignacion-list__meta">
                        <span>{asignacion.modalidad}</span>
                        <span>{formatDate(asignacion.fechaInicio)} {'->'} {formatDate(asignacion.fechaFin)}</span>
                      </div>
                      <span className="chip chip--ghost">{asignacion.estado}</span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="asignacion-panel">
            {selectedAsignacion ? (
              <>
                <div className="asignacion-panel__header">
                  <div>
                    <p className="module-page__eyebrow">Asignacion #{selectedAsignacion.id}</p>
                    <h3>{selectedAsignacion.estudiante.nombre} {selectedAsignacion.estudiante.apellido}</h3>
                    <p className="asignacion-panel__company">{selectedAsignacion.empresa.nombre}</p>
                  </div>
                  <div className="asignacion-panel__actions">
                    <span className="chip chip--ghost">{selectedAsignacion.estado}</span>
                    <button
                      type="button"
                      className="button button--ghost button--sm"
                      onClick={() => handleEditAsignacion(selectedAsignacion)}
                    >
                      Editar
                    </button>
                    <Link className="button button--primary button--sm" to={`/asignaciones/${selectedAsignacion.id}`}>
                      Abrir ficha
                    </Link>
                  </div>
                </div>

                <div className="asignacion-panel__grid">
                  <article>
                    <span>Modalidad</span>
                    <strong>{selectedAsignacion.modalidad}</strong>
                  </article>
                  <article>
                    <span>Horas planificadas</span>
                    <strong>{selectedAsignacion.horasTotales ?? '-'}</strong>
                  </article>
                  <article>
                    <span>Inicio</span>
                    <strong>{formatDate(selectedAsignacion.fechaInicio)}</strong>
                  </article>
                  <article>
                    <span>Fin estimado</span>
                    <strong>{formatDate(selectedAsignacion.fechaFin)}</strong>
                  </article>
                </div>

                <div className="asignacion-panel__links">
                  <button
                    type="button"
                    className="button button--ghost button--sm"
                    onClick={() => navigate(`/empresas/${selectedAsignacion.empresa.id}`)}
                  >
                    Ver empresa
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--sm"
                    onClick={() => navigate('/estudiantes')}
                  >
                    Buscar estudiante
                  </button>
                </div>

                <p className="asignacion-panel__hint">
                  Consulta la ficha completa para visualizar tutores asignados, timeline de hitos y documentacion adjunta.
                </p>
              </>
            ) : (
              <p className="detail-placeholder">Selecciona una asignacion para revisar su detalle.</p>
            )}
          </div>
        </section>

        <section className="kanban">
          <header className="kanban__header">
            <h3>Pipeline visual</h3>
            <p>Visualiza el pipeline completo y accede rapido a cada tutor o empresa.</p>
          </header>
          <div className="kanban__columns">
            {Object.entries(asignacionesPorEstado).map(([estado, items]) => (
              <div key={estado} className="kanban__column">
                <h4>{estado}</h4>
                {(items as AsignacionSummary[]).map((asignacion) => (
                  <article className="kanban-card" key={asignacion.id}>
                    <h5>{asignacion.empresa.nombre}</h5>
                    <p>{asignacion.estudiante.nombre} {asignacion.estudiante.apellido}</p>
                    <small>{formatDate(asignacion.fechaInicio)} - {formatDate(asignacion.fechaFin)}</small>
                    <div className="kanban-card__tags">
                      <span className="chip chip--ghost">{asignacion.modalidad}</span>
                      {asignacion.horasTotales && (
                        <span className="chip chip--ghost">{asignacion.horasTotales} h</span>
                      )}
                    </div>
                    <Link to={`/asignaciones/${asignacion.id}`} className="link link--muted">
                      Revisar detalle
                    </Link>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>
      </section>
    );
  };
  const dashboardElement = null;

  const tutorAcademicoColumns: Array<TableColumn<TutorAcademicoSummary>> = [
    { key: 'nombre', header: 'Nombre', render: (tutor) => `${tutor.nombre} ${tutor.apellido}` },
    { key: 'departamento', header: 'Departamento', render: (tutor) => tutor.departamento ?? 'No indicado' },
    { key: 'especialidad', header: 'Especialidad', render: (tutor) => tutor.especialidad ?? 'No indicado' },
    { key: 'email', header: 'Email', render: (tutor) => tutor.email },
    {
      key: 'estado',
      header: 'Estado',
      render: (tutor) => (
        <span className={`chip chip--ghost ${tutor.activo ? 'chip--success' : ''}`}>
          {tutor.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
      align: 'center',
    },
  ];

  const tutorProfesionalColumns: Array<TableColumn<TutorProfesionalSummary>> = [
    { key: 'nombre', header: 'Nombre', render: (tutor) => tutor.nombre },
    { key: 'empresa', header: 'Empresa', render: (tutor) => tutor.empresa.nombre },
    { key: 'cargo', header: 'Cargo', render: (tutor) => tutor.cargo ?? 'No indicado' },
    { key: 'email', header: 'Email', render: (tutor) => tutor.email ?? 'Sin email' },
    {
      key: 'estado',
      header: 'Estado',
      render: (tutor) => (
        <span className={`chip chip--ghost ${tutor.activo ? 'chip--success' : ''}`}>
          {tutor.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
      align: 'center',
    },
  ];

  const tutorAcademicoTotalPages = Math.max(1, Math.ceil(tutorAcademicoTotal / TUTOR_PAGE_SIZE));
  const tutorProfesionalTotalPages = Math.max(1, Math.ceil(tutorProfesionalTotal / TUTOR_PAGE_SIZE));

  const tutoresElement = (
    <section className="module-page module-page--wide">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">Equipo de tutores</p>
          <h2>Tutores academicos y profesionales</h2>
          <p>Filtra por estado y empresa, revisa contacto y asignaciones asociadas.</p>
        </div>
        <div className="module-page__actions">
          <span className="chip chip--ghost">
            {tutorAcademicoTotal + tutorProfesionalTotal} registros
          </span>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={() => {
              loadTutorAcademicosList(tutorAcademicoPage, tutorAcademicoEstado);
              loadTutorProfesionalesList(tutorProfesionalPage, tutorProfesionalEstado, tutorProfesionalEmpresa);
            }}
            disabled={loadingTutorAcademicos || loadingTutorProfesionales}
          >
            {(loadingTutorAcademicos || loadingTutorProfesionales) ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      <div className="module-page__split">
        <div className="module-page__panel">
          <DataTable
            caption="Tutores academicos"
            columns={tutorAcademicoColumns}
            data={tutorAcademicosList}
            actions={(
              <button type="button" className="button button--ghost button--sm" onClick={handleExportTutorAcademicos}>
                Exportar CSV
              </button>
            )}
            emptyMessage="No hay tutores academicos registrados."
          />
          <div className="table-pagination">
            <button
              type="button"
              className="button button--ghost button--sm"
              disabled={loadingTutorAcademicos || tutorAcademicoPage <= 1}
              onClick={() => loadTutorAcademicosList(tutorAcademicoPage - 1, tutorAcademicoEstado)}
            >
              Anterior
            </button>
            <span>
              Pag. {tutorAcademicoPage} de {tutorAcademicoTotalPages}
            </span>
            <button
              type="button"
              className="button button--ghost button--sm"
              disabled={
                loadingTutorAcademicos || tutorAcademicoPage >= tutorAcademicoTotalPages
              }
              onClick={() => loadTutorAcademicosList(tutorAcademicoPage + 1, tutorAcademicoEstado)}
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="module-page__panel">
          <DataTable
            caption="Tutores profesionales"
            columns={tutorProfesionalColumns}
            data={tutorProfesionalesList}
            actions={(
              <button type="button" className="button button--ghost button--sm" onClick={handleExportTutorProfesionales}>
                Exportar CSV
              </button>
            )}
            emptyMessage="No hay tutores profesionales registrados."
          />
          <div className="table-pagination">
            <button
              type="button"
              className="button button--ghost button--sm"
              disabled={loadingTutorProfesionales || tutorProfesionalPage <= 1}
              onClick={() => loadTutorProfesionalesList(
                tutorProfesionalPage - 1,
                tutorProfesionalEstado,
                tutorProfesionalEmpresa,
              )}
            >
              Anterior
            </button>
            <span>
              Pag. {tutorProfesionalPage} de {tutorProfesionalTotalPages}
            </span>
            <button
              type="button"
              className="button button--ghost button--sm"
              disabled={
                loadingTutorProfesionales || tutorProfesionalPage >= tutorProfesionalTotalPages
              }
              onClick={() => loadTutorProfesionalesList(
                tutorProfesionalPage + 1,
                tutorProfesionalEstado,
                tutorProfesionalEmpresa,
              )}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  const solicitudesElement = (
    <section className="module-page">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">Empresas interesadas</p>
          <h2>Solicitudes de registro</h2>
          <p>Revisa las solicitudes enviadas desde el portal externo y aprueba solo las verificadas.</p>
        </div>
        <div className="module-page__actions">
          <span className="chip chip--ghost">{empresaSolicitudes.length} pendientes</span>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={handleExportSolicitudes}
            disabled={empresaSolicitudes.length === 0}
          >
            Exportar CSV
          </button>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={handleRefreshSolicitudes}
            disabled={loadingSolicitudes}
          >
            {loadingSolicitudes ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </header>

      {loadingSolicitudes ? (
        <p className="detail-placeholder">Cargando solicitudes...</p>
      ) : empresaSolicitudes.length === 0 ? (
        <p className="detail-placeholder">
          No hay solicitudes pendientes. Comparte el formulario publico para invitar nuevas empresas.
        </p>
      ) : (
        <div className="solicitudes-panel__list solicitudes-panel__list--page">
          {empresaSolicitudes.map((solicitud) => {
            const canApprove = solicitud.estado === 'email_verificado' || solicitud.estado === 'pendiente';
            const isProcessing = processingSolicitudId === solicitud.id;
            const estadoLabel = SOLICITUD_ESTADO_LABELS[solicitud.estado] ?? solicitud.estado;

            return (
              <article key={solicitud.id} className="solicitud-card">
                <div className="solicitud-card__header">
                  <div>
                    <h3>{solicitud.nombreEmpresa}</h3>
                    <p className="solicitud-card__meta">
                      <span className={`badge badge--${solicitud.estado}`}>{estadoLabel}</span>
                      <span>Registrada: {formatDate(solicitud.creadaEn)}</span>
                    </p>
                  </div>
                  {solicitud.web && (
                    <a href={solicitud.web} target="_blank" rel="noreferrer" className="link link--muted">
                      Web
                    </a>
                  )}
                </div>
                <p className="solicitud-card__description">
                  {solicitud.sector ?? 'Sector no indicado'}  {solicitud.ciudad ?? 'Ciudad no indicada'}
                </p>
                <div className="solicitud-card__contact">
                  <strong>{solicitud.contacto.nombre}</strong>
                  <span>{solicitud.contacto.email}</span>
                  {solicitud.contacto.telefono && <span>{solicitud.contacto.telefono}</span>}
                </div>
              <div className="solicitud-card__actions">
                <button
                  type="button"
                  className="button button--primary button--sm"
                  onClick={() => handleApproveSolicitud(solicitud.id)}
                    disabled={!canApprove || isProcessing}
                    title={!canApprove ? 'La empresa debe verificar su correo antes de aprobar.' : undefined}
                  >
                    {isProcessing ? 'Procesando...' : 'Aprobar'}
                  </button>
                <button
                  type="button"
                  className="button button--ghost button--sm"
                  onClick={() => handleRejectSolicitud(solicitud.id)}
                  disabled={isProcessing}
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  className="button button--ghost button--sm"
                  onClick={() => loadMensajes(solicitud.id)}
                  disabled={loadingMensajesId === solicitud.id}
                >
                  {loadingMensajesId === solicitud.id ? 'Cargando...' : 'Ver mensajes'}
                </button>
              </div>
              {solicitudMensajes[solicitud.id] && (
                <div className="solicitud-card__messages">
                  {solicitudMensajes[solicitud.id].length === 0 ? (
                    <p className="detail-placeholder">Sin mensajes todavia.</p>
                  ) : (
                    solicitudMensajes[solicitud.id].map((msg) => (
                      <div key={msg.id} className={`mensaje mensaje--${msg.autor}`}>
                        <p>{msg.texto}</p>
                        <small>{msg.autor} - {formatDate(msg.createdAt)}</small>
                      </div>
                    ))
                  )}
                  <div className="mensaje-form">
                    <input
                      type="text"
                      placeholder="Escribe un mensaje al contacto..."
                      value={mensajeDraft[solicitud.id] ?? ''}
                      onChange={(e) => setMensajeDraft((prev) => ({ ...prev, [solicitud.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="button button--primary button--sm"
                      onClick={() => handleSendMensaje(solicitud.id)}
                      disabled={loadingMensajesId === solicitud.id}
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        </div>
      )}
    </section>
  );

  const handleSyncPanel = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const handleLoginSuccess = useCallback(async (user: MeResponse) => {
    setMe(user);
    setAuthError(null);
    setAuthResolved(true);
    await loadData();
  }, [loadData]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Se fuerza la salida local aunque falle el endpoint.
    } finally {
      setMe(null);
      setCollections(null);
      setReferenceData(null);
      setAuthResolved(true);
      setEmpresaSolicitudes([]);
      setLastUpdated(null);
      setNotificationsOpen(false);
      navigate('/login');
    }
  }, [navigate]);

  const monitorElement = (
    <MonitorPage
      collections={collections}
      pendingSolicitudes={empresaSolicitudes.length}
      currentUser={me}
      lastUpdated={lastUpdated}
      syncInProgress={loading}
      onSync={handleSyncPanel}
      apiBaseUrl={API_BASE_URL}
    />
  );

  const profileElement = (
    <section className="module-page">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">Perfil</p>
          <h2>Administrador</h2>
          <p>Panel de cuenta interna con informacion de acceso, preferencias operativas y accesos directos.</p>
        </div>
      </header>
      <div className="profile-grid">
        <article className="profile-card profile-card--main">
          <h3>Datos de la cuenta</h3>
          <dl className="profile-fields">
            <div>
              <dt>Nombre</dt>
              <dd>{me?.username ?? 'Administrador'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>coordinacion@centro.edu</dd>
            </div>
            <div>
              <dt>Rol</dt>
              <dd>Administrador</dd>
            </div>
            <div>
              <dt>Autenticacion</dt>
              <dd>Sesion autenticada</dd>
            </div>
          </dl>
          <p className="profile-hint">
            Para cambios de seguridad, renovacion de acceso o gestion de permisos, utiliza los procedimientos internos del centro.
          </p>
        </article>

        <article className="profile-card">
          <h3>Preferencias</h3>
          <ul className="profile-list">
            <li>Notificaciones de solicitudes: activas (campana)</li>
            <li>Idioma: es-ES</li>
            <li>Zona horaria: Europe/Madrid</li>
          </ul>
        </article>

        <article className="profile-card">
          <h3>Accesos rapidos</h3>
          <ul className="profile-list">
            <li><Link to="/solicitudes">Revisar solicitudes de empresas</Link></li>
            <li><Link to="/empresas">Ver empresas activas</Link></li>
            <li><Link to="/asignaciones">Asignaciones en curso</Link></li>
            <li><a href="/monitor">Monitor privado</a></li>
            <li><a href="/documentacion">Documentacion</a></li>
          </ul>
        </article>
      </div>
    </section>
  );

  if (isDocumentationRoute) {
    return (
      <div className="app app--dark app--docs">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <DocumentationGuidePage />
      </div>
    );
  }

  if (!me && !authResolved) {
    return (
      <div className="app app--dark app--auth">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        {authError && <div className="app__alert app__alert--error">{authError}</div>}
        {loading && <div className="app__alert app__alert--info">Validando acceso...</div>}
      </div>
    );
  }

  if (!me) {
    return (
      <div className="app app--dark app--auth">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        {authError && <div className="app__alert app__alert--error">{authError}</div>}
        <LoginPage onLogin={handleLoginSuccess} />
      </div>
    );
  }

  if (isMonitorRoute) {
    return (
      <div className="monitor-app">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        {monitorElement}
      </div>
    );
  }

  return (
    <div className="app app--dark">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <header className="topbar">
        <div>
          <Link to="/" className="topbar__logo">Agora</Link>
          <span className="topbar__badge">Panel de practicas</span>
        </div>
        <div className="topbar__actions">
          <span className="app__meta">API: <code>{API_BASE_URL}</code></span>
          {lastUpdated && <span className="app__meta">Sync {lastUpdated.toLocaleTimeString('es-ES')}</span>}
          <button type="button" onClick={loadData} disabled={loading}>
            {loading ? 'Actualizando...' : 'Sincronizar'}
          </button>
          <div className="topbar__notifications">
            <button
              type="button"
              className="notification-bell"
              onClick={toggleNotifications}
              aria-expanded={notificationsOpen}
              aria-label="Solicitudes pendientes"
            >
              <span className="notification-bell__icon">&#128276;</span>
              {empresaSolicitudes.length > 0 && (
                <span className="notification-bell__badge">{empresaSolicitudes.length}</span>
              )}
            </button>
            {notificationsOpen && (
              <div className="notification-dropdown">
                <div className="notification-dropdown__header">
                  <span>Solicitudes pendientes</span>
                  <button
                    type="button"
                    className="link link--muted"
                    onClick={handleRefreshSolicitudes}
                    disabled={loadingSolicitudes}
                  >
                    {loadingSolicitudes ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>
                <div className="notification-dropdown__list">
                  {loadingSolicitudes ? (
                    <p className="detail-placeholder">Cargando solicitudes...</p>
                  ) : empresaSolicitudes.length === 0 ? (
                    <p className="detail-placeholder">Sin nuevas solicitudes.</p>
                  ) : (
                    empresaSolicitudes.slice(0, 3).map((solicitud) => (
                      <Link
                        to="/solicitudes"
                        key={solicitud.id}
                        className="notification-item"
                        onClick={closeNotifications}
                      >
                        <span className="notification-item__title">{solicitud.nombreEmpresa}</span>
                        <span className="notification-item__meta">
                          {SOLICITUD_ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                <div className="notification-dropdown__footer">
                  <button type="button" className="button button--ghost button--sm" onClick={openSolicitudesPage}>
                    Ver todas
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="topbar__auth">
            <span className="app__meta">Sesion: {me?.username ?? 'admin'}</span>
            <Link to="/perfil" className="topbar__profile" onClick={closeNotifications}>
              <span className="topbar__profile-icon">&#128100;</span>
              <span className="topbar__profile-label">Perfil</span>
            </Link>
            <button type="button" className="button button--ghost button--sm" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </div>
      </header>

      {error && <div className="app__alert app__alert--error">{error}</div>}
      {loading && <div className="app__alert app__alert--info">Cargando datos...</div>}

      <Routes>
        <Route
          path="/"
          element={(
            <DashboardHomePage
              authError={authError}
              heroMetrics={dashboardHeroMetrics}
              heroUpdates={[
                {
                  title: 'Estado del panel',
                  detail: lastUpdated
                    ? `Datos sincronizados a las ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`
                    : 'Esperando la primera sincronizacion completa.',
                },
                {
                  title: 'Revision externa',
                  detail: empresaSolicitudes.length > 0
                    ? `${empresaSolicitudes.length} solicitudes requieren revision desde el equipo interno.`
                    : 'No hay solicitudes pendientes de revisar en este momento.',
                },
                {
                  title: 'Cobertura docente',
                  detail: loadingReferenceData
                    ? 'Cargando catalogo de tutores bajo demanda para no penalizar el arranque.'
                    : referenceData
                      ? `${referenceData.tutoresAcademicos.length} tutores academicos y ${referenceData.tutoresProfesionales.length} profesionales listos.`
                      : 'Los tutores se cargan a demanda cuando entras en el modulo o preparas una asignacion.',
                },
              ]}
              moduleCards={[
                {
                  id: 'empresas',
                  label: 'Empresas',
                  total: collections?.empresas.length ?? 0,
                  description: 'Colaboradoras activas',
                  detail: 'Incluye estados de colaboracion, contactos y convenios relacionados.',
                  accent: 'orchid',
                },
                {
                  id: 'convenios',
                  label: 'Convenios',
                  total: collections?.convenios.length ?? 0,
                  description: 'Acuerdos vigentes',
                  detail: 'Informacion completa sobre fechas, estado y asignaciones vinculadas.',
                  accent: 'amber',
                },
                {
                  id: 'estudiantes',
                  label: 'Estudiantes',
                  total: collections?.estudiantes.length ?? 0,
                  description: 'Participantes registrados',
                  detail: 'Fichas con estado academico, asignaciones y datos de contacto.',
                  accent: 'cyan',
                },
                {
                  id: 'asignaciones',
                  label: 'Asignaciones',
                  total: collections?.asignaciones.length ?? 0,
                  description: 'Practicas en curso',
                  detail: 'Pipeline Kanban con tutores, fechas y modalidad.',
                  accent: 'violet',
                },
                {
                  id: 'tutores',
                  label: 'Tutores',
                  total: (referenceData?.tutoresAcademicos.length ?? 0) + (referenceData?.tutoresProfesionales.length ?? 0),
                  description: 'Academicos y profesionales',
                  detail: 'Filtra por estado y empresa para contactar rapido.',
                  accent: 'cyan',
                },
                {
                  id: 'documentacion',
                  label: 'Documentacion',
                  total: 3,
                  description: 'Guias y recursos listos',
                  detail: 'Enlaza a backend, frontend y desglose de flujos CRUD.',
                  accent: 'orchid',
                },
              ]}
              stats={stats}
              analytics={analyticData}
              analyticsMax={analyticMax}
              dashboardBaseRecordCount={dashboardBaseRecordCount}
              moduleQuickLinks={[
                {
                  id: 'empresas',
                  label: 'Empresas',
                  total: collections?.empresas.length ?? 0,
                  description: 'Control de colaboraciones y convenios asociados.',
                  path: '/empresas',
                },
                {
                  id: 'convenios',
                  label: 'Convenios',
                  total: collections?.convenios.length ?? 0,
                  description: 'Estado, fechas y documentacion adjunta.',
                  path: '/convenios',
                },
                {
                  id: 'estudiantes',
                  label: 'Estudiantes',
                  total: collections?.estudiantes.length ?? 0,
                  description: 'Ficha academica y seguimiento en curso.',
                  path: '/estudiantes',
                },
                {
                  id: 'asignaciones',
                  label: 'Asignaciones',
                  total: collections?.asignaciones.length ?? 0,
                  description: 'Pipeline completo, tutores y horas planificadas.',
                  path: '/asignaciones',
                },
                {
                  id: 'tutores',
                  label: 'Tutores',
                  total: (referenceData?.tutoresAcademicos.length ?? 0) + (referenceData?.tutoresProfesionales.length ?? 0),
                  description: 'Equipos academicos y de empresa con filtros.',
                  path: '/tutores',
                },
              ]}
              studentPreview={studentPreview}
              selectedStudent={selectedStudent}
              selectedStudentAssignments={selectedStudentAssignments}
              lastUpdated={lastUpdated}
              loadingReferenceData={loadingReferenceData}
              onCreateAsignacion={() => void openCreateAsignacion()}
              onExportDashboard={handleExportDashboard}
              onToggleStudent={(student) => setSelectedStudent((current) => (current?.id === student.id ? null : student))}
              onEditStudent={handleEditStudent}
            />
          )}
        />
        <Route path="/empresas" element={<EmpresasOverviewPage />} />
        <Route path="/empresas/:empresaId" element={<EmpresaManagementPage />} />
        <Route path="/convenios" element={<ConveniosOverviewPage />} />
        <Route path="/convenios/:convenioId" element={<ConvenioManagementPage />} />
        <Route path="/estudiantes" element={<EstudiantesOverviewPage />} />
        <Route path="/asignaciones" element={<AsignacionesOverviewPage />} />
        <Route path="/asignaciones/:asignacionId" element={<AsignacionManagementPage />} />
        <Route path="/documentacion" element={<DocumentationGuidePage />} />
        <Route path="/tutores" element={tutoresElement} />
        <Route
          path="/login"
          element={<Navigate to="/" replace />}
        />
        <Route path="/solicitudes" element={solicitudesElement} />
        <Route path="/perfil" element={profileElement} />
        <Route path="/control" element={<Navigate to="/monitor" replace />} />
        <Route path="/monitor" element={<Navigate to="/" replace />} />
      </Routes>

      {studentModal && (
        <Modal
          title={studentModal.mode === 'create' ? 'Registrar estudiante' : 'Editar estudiante'}
          onClose={handleCloseStudentModal}
        >
          <EstudianteForm
            mode={studentModal.mode}
            initialValues={studentModal.initialValues}
            onSubmit={handleStudentSubmit}
            onCancel={handleCloseStudentModal}
            submitting={savingStudent}
            errorMessage={studentFormError}
            loadingValues={studentModal.loadingValues}
          />
        </Modal>
      )}
      {empresaModal && (
        <Modal title={empresaModal.mode === 'create' ? 'Registrar empresa' : 'Editar empresa'} onClose={handleCloseEmpresaModal}>
          <EmpresaForm
            mode={empresaModal.mode}
            initialValues={empresaModal.initialValues}
            onSubmit={handleEmpresaSubmit}
            onCancel={handleCloseEmpresaModal}
            submitting={savingEmpresa}
            errorMessage={empresaFormError}
            loadingValues={empresaModal.loadingValues}
          />
        </Modal>
      )}
      {convenioModal && (
        <Modal title={convenioModal.mode === 'create' ? 'Registrar convenio' : 'Editar convenio'} onClose={handleCloseConvenioModal}>
          <ConvenioForm
            mode={convenioModal.mode}
            initialValues={convenioModal.initialValues}
            empresas={collections?.empresas ?? []}
            onSubmit={handleConvenioSubmit}
            onCancel={handleCloseConvenioModal}
            submitting={savingConvenio}
            errorMessage={convenioFormError}
            loadingValues={convenioModal.loadingValues}
          />
        </Modal>
      )}
      {asignacionModal && (
        <Modal
          title={asignacionModal.mode === 'create' ? 'Crear asignacion' : 'Editar asignacion'}
          onClose={handleCloseAsignacionModal}
        >
          <AsignacionForm
            mode={asignacionModal.mode}
            initialValues={asignacionModal.initialValues}
            estudiantes={collections?.estudiantes ?? []}
            empresas={collections?.empresas ?? []}
            convenios={collections?.convenios ?? []}
            tutoresAcademicos={tutorAcademicos}
            tutoresProfesionales={tutorProfesionales}
            onSubmit={handleAsignacionSubmit}
            onCancel={handleCloseAsignacionModal}
            submitting={savingAsignacion}
            errorMessage={asignacionFormError}
            loadingValues={asignacionModal.loadingValues || !referenceData}
          />
        </Modal>
      )}
    </div>
  );
}





















