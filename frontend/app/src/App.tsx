import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { DataTable, type TableColumn } from './components/DataTable';
import { EstudianteForm, type EstudianteFormValues } from './components/EstudianteForm';
import { EmpresaForm, type EmpresaFormValues } from './components/EmpresaForm';
import { ConvenioForm, type ConvenioFormValues } from './components/ConvenioForm';
import { AsignacionForm, type AsignacionFormValues } from './components/AsignacionForm';
import { Modal } from './components/Modal';
import { ToastStack, type ToastMessage } from './components/ToastStack';
import {
  createAsignacion,
  createConvenio,
  createEmpresa,
  createEstudiante,
  fetchCollections,
  fetchTutorAcademicos,
  fetchTutorProfesionales,
  getApiBaseUrl,
  getAsignacionDetail,
  getConvenioDetail,
  getEmpresaDetail,
  getEstudianteDetail,
  updateAsignacion,
  updateConvenio,
  updateEmpresa,
  updateEstudiante,
} from './services/api';
import type {
  ApiCollections,
  AsignacionDetail,
  AsignacionPayload,
  AsignacionSummary,
  ConvenioDetail,
  ConvenioPayload,
  ConvenioSummary,
  EmpresaDetail,
  EmpresaPayload,
  EmpresaSummary,
  EstudianteDetail,
  EstudiantePayload,
  EstudianteSummary,
  TutorAcademicoSummary,
  TutorProfesionalSummary,
} from './types';
import './App.css';

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });

const FALLBACK_COLLECTIONS: ApiCollections = {
  empresas: [
    {
      id: 1,
      nombre: 'Innovar Formación',
      sector: 'Tecnología educativa',
      ciudad: 'Madrid',
      estadoColaboracion: 'activa',
      conveniosActivos: 1,
      tutoresProfesionales: 1,
      contactos: 1,
      asignaciones: { total: 1, enCurso: 1 },
    },
    {
      id: 2,
      nombre: 'Salud Conectada S.L.',
      sector: 'Salud digital',
      ciudad: 'Valencia',
      estadoColaboracion: 'pendiente_revision',
      conveniosActivos: 1,
      tutoresProfesionales: 1,
      contactos: 1,
      asignaciones: { total: 1, enCurso: 0 },
    },
  ],
  estudiantes: [
    {
      id: 1,
      nombre: 'Ana',
      apellido: 'Martínez',
      dni: '12345678A',
      email: 'ana.martinez@alumnos.es',
      grado: 'Ingeniería Informática',
      curso: '4º',
      estado: 'en_practicas',
      asignaciones: { total: 1, enCurso: 1 },
    },
    {
      id: 2,
      nombre: 'Luis',
      apellido: 'Campos',
      dni: '87654321B',
      email: 'luis.campos@alumnos.es',
      grado: 'Ingeniería Biomédica',
      curso: '3º',
      estado: 'disponible',
      asignaciones: { total: 1, enCurso: 0 },
    },
  ],
  convenios: [
    {
      id: 1,
      titulo: 'Convenio IA Educativa 2024/2025',
      empresa: { id: 1, nombre: 'Innovar Formación' },
      tipo: 'curricular',
      estado: 'vigente',
      fechaInicio: '2024-09-01',
      fechaFin: '2025-02-28',
      asignacionesAsociadas: 1,
    },
    {
      id: 2,
      titulo: 'Convenio Integraciones Clínicas 2024',
      empresa: { id: 2, nombre: 'Salud Conectada S.L.' },
      tipo: 'extracurricular',
      estado: 'borrador',
      fechaInicio: '2024-11-01',
      fechaFin: null,
      asignacionesAsociadas: 1,
    },
  ],
  asignaciones: [
    {
      id: 1,
      estado: 'en_curso',
      modalidad: 'hibrida',
      horasTotales: 320,
      fechaInicio: '2024-10-01',
      fechaFin: '2025-01-31',
      empresa: { id: 1, nombre: 'Innovar Formación' },
      estudiante: { id: 1, nombre: 'Ana', apellido: 'Martínez' },
    },
    {
      id: 2,
      estado: 'planificada',
      modalidad: 'presencial',
      horasTotales: 240,
      fechaInicio: '2025-02-01',
      fechaFin: null,
      empresa: { id: 2, nombre: 'Salud Conectada S.L.' },
      estudiante: { id: 2, nombre: 'Luis', apellido: 'Campos' },
    },
  ],
};

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

const BASE_EMPRESA_COLUMNS: Array<TableColumn<EmpresaSummary>> = [
  { key: 'nombre', header: 'Empresa', render: (empresa) => empresa.nombre },
  { key: 'sector', header: 'Sector', render: (empresa) => empresa.sector ?? '—' },
  { key: 'ciudad', header: 'Ciudad', render: (empresa) => empresa.ciudad ?? '—' },
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
    render: (asignacion) => asignacion.horasTotales ?? '—',
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

interface CompanyRegistrationFormValues extends EmpresaFormValues {
  password: string;
  confirmPassword: string;
}

const EMPTY_REGISTRATION_VALUES: CompanyRegistrationFormValues = {
  ...EMPTY_EMPRESA_VALUES,
  password: '',
  confirmPassword: '',
};

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

interface CompanyRegistrationPageProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function DocumentationPage() {
  return (
    <section className="module-page">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">Recursos</p>
          <h2>Documentación del proyecto</h2>
          <p>Guías rápidas para desplegar backend y frontend, y descripción de los flujos CRUD.</p>
        </div>
      </header>
      <div className="docs-grid">
        <article className="docs-card">
          <h3>Backend Symfony</h3>
          <p>Arranque del servidor, ejecución de tests y pautas de autenticación.</p>
          <a href="../README.md" target="_blank" rel="noreferrer">Abrir README general</a>
        </article>
        <article className="docs-card">
          <h3>Frontend Vite/React</h3>
          <p>Variables `.env`, scripts disponibles y consejos de estilo.</p>
          <a href="./README.md" target="_blank" rel="noreferrer">Abrir README frontend</a>
        </article>
        <article className="docs-card">
          <h3>Flujos CRUD</h3>
          <p>Resumen de endpoints para empresas, convenios, estudiantes y asignaciones. Consulta también los tests en `backend/tests`.</p>
        </article>
      </div>
    </section>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('La autenticación basada en usuarios llegará próximamente. De momento utiliza la autenticación básica configurada en Symfony.');
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="auth-card__eyebrow">Bienvenido de nuevo</p>
        <h2>Iniciar sesión</h2>
        <p className="auth-card__description">
          El login real llegará tras migrar usuarios a base de datos. Mientras tanto puedes usar autenticación básica desde el backend.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form__field">
            <span>Email institucional</span>
            <input type="email" placeholder="coordinacion@centro.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="form__field">
            <span>Contraseña</span>
            <input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" className="button button--primary button--lg">
            Entrar (demo)
          </button>
          {status && <p className="form__error">{status}</p>}
          <p className="auth-card__hint">Continúa utilizando las credenciales básicas `admin/admin123` en el backend.</p>
        </form>
      </div>
    </section>
  );
}

function CompanyRegistrationPage({ onSuccess, onError }: CompanyRegistrationPageProps) {
  const [values, setValues] = useState<CompanyRegistrationFormValues>({ ...EMPTY_REGISTRATION_VALUES });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);

    if (values.password !== values.confirmPassword) {
      setStatusMessage('Las contraseñas no coinciden.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = buildEmpresaPayload(values);
      const observacionesExtra = `Registro web - email pendiente de verificación.\nContacto: ${values.email}`;
      payload.observaciones = payload.observaciones
        ? `${payload.observaciones}\n${observacionesExtra}`
        : observacionesExtra;
      await createEmpresa(payload);
      setStatusMessage('Registro completado. Revisa tu correo para verificar la cuenta.');
      onSuccess('Empresa registrada correctamente. Revisa tu email.');
      setValues({ ...EMPTY_REGISTRATION_VALUES });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar la empresa.';
      setStatusMessage(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="auth-card__eyebrow">Unirse al ecosistema</p>
        <h2>Registro de empresa colaboradora</h2>
        <p className="auth-card__description">
          Completa el formulario para solicitar acceso. Tras verificar el correo, podremos activar tu cuenta.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form__field">
            <span>Nombre de la empresa*</span>
            <input name="nombre" value={values.nombre} onChange={handleChange} required />
          </label>
          <label className="form__field">
            <span>Email de contacto*</span>
            <input name="email" type="email" value={values.email} onChange={handleChange} required />
          </label>
          <label className="form__field">
            <span>Teléfono</span>
            <input name="telefono" value={values.telefono} onChange={handleChange} />
          </label>
          <label className="form__field">
            <span>Ciudad</span>
            <input name="ciudad" value={values.ciudad} onChange={handleChange} />
          </label>
          <label className="form__field">
            <span>Sector</span>
            <input name="sector" value={values.sector} onChange={handleChange} />
          </label>
          <label className="form__field">
            <span>Observaciones</span>
            <textarea name="observaciones" rows={3} value={values.observaciones} onChange={handleChange} />
          </label>
          <label className="form__field">
            <span>Contraseña*</span>
            <input name="password" type="password" value={values.password} onChange={handleChange} required />
          </label>
          <label className="form__field">
            <span>Confirmar contraseña*</span>
            <input
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              onChange={handleChange}
              required
            />
          </label>
          {statusMessage && <p className="form__error">{statusMessage}</p>}
          <button type="submit" className="button button--primary button--lg" disabled={submitting}>
            {submitting ? 'Registrando…' : 'Enviar solicitud'}
          </button>
          <p className="auth-card__hint">
            Tras el registro, enviaremos un correo de verificación. Una vez aprobado, podrás iniciar sesión desde el backend.
          </p>
        </form>
      </div>
    </section>
  );
}

const API_BASE_URL = getApiBaseUrl();

export default function App() {
  const [collections, setCollections] = useState<ApiCollections | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [empresaSectorFilter, setEmpresaSectorFilter] = useState<string>('todos');
  const [selectedConvenioId, setSelectedConvenioId] = useState<number | null>(null);
  const [convenioEstadoFilter, setConvenioEstadoFilter] = useState<string>('todos');

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

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [data, tutoresAcademicos, tutoresProfesionales] = await Promise.all([
        fetchCollections(),
        fetchTutorAcademicos(),
        fetchTutorProfesionales(),
      ]);
      setCollections(data);
      setReferenceData({ tutoresAcademicos, tutoresProfesionales });
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar los datos.');
      }
      setCollections((prev) => prev ?? FALLBACK_COLLECTIONS);
      setReferenceData((prev) => prev ?? {
        tutoresAcademicos: [],
        tutoresProfesionales: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {
      // El error ya se captura en loadData, evitamos advertencias de promesas sin tratar.
    });
  }, [loadData]);

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

  const openCreateAsignacion = useCallback((defaults?: Partial<AsignacionFormValues>) => {
    setAsignacionFormError(null);
    setAsignacionModal({
      mode: 'create',
      initialValues: cloneAsignacionForm({
        ...EMPTY_ASIGNACION_VALUES,
        ...defaults,
      }),
      loadingValues: false,
    });
  }, []);

  const handleEditAsignacion = useCallback((asignacion: AsignacionSummary) => {
    setAsignacionFormError(null);
    setAsignacionModal({
      mode: 'edit',
      entityId: asignacion.id,
      initialValues: mapAsignacionSummaryToForm(asignacion),
      loadingValues: true,
    });

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
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los datos de la asignación.';
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
  }, [pushToast]);

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
          pushToast('success', 'Asignación creada correctamente.');
        } else if (asignacionModal.entityId) {
          await updateAsignacion(asignacionModal.entityId, payload);
          pushToast('success', 'Asignación actualizada correctamente.');
        }

        await loadData();
        handleCloseAsignacionModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo guardar la asignación.';
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

    const conveniosVigentes = collections.convenios.filter((convenio) =>
      convenio.estado.toLowerCase().includes('vig'),
    ).length;
    const asignacionesEnCurso = collections.asignaciones.filter((asignacion) =>
      asignacion.estado.toLowerCase() === 'en_curso',
    ).length;
    const horasPlanificadas = collections.asignaciones.reduce((total, asignacion) => {
      return total + (asignacion.horasTotales ?? 0);
    }, 0);

    return [
      { label: 'Empresas registradas', value: collections.empresas.length },
      { label: 'Estudiantes registrados', value: collections.estudiantes.length },
      { label: 'Convenios vigentes', value: conveniosVigentes },
      { label: 'Asignaciones en curso', value: asignacionesEnCurso },
      { label: 'Horas totales planificadas', value: horasPlanificadas.toLocaleString('es-ES') },
    ];
  }, [collections]);

  const estudianteColumns = useMemo<Array<TableColumn<EstudianteSummary>>>(() => [
    {
      key: 'nombre',
      header: 'Estudiante',
      render: (estudiante) => `${estudiante.nombre} ${estudiante.apellido}`,
    },
    { key: 'dni', header: 'DNI', render: (estudiante) => estudiante.dni },
    { key: 'email', header: 'Email', render: (estudiante) => estudiante.email },
    { key: 'grado', header: 'Grado', render: (estudiante) => estudiante.grado ?? '�?"' },
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
        <button type="button" className="button button--link" onClick={() => handleEditAsignacion(asignacion)}>
          Editar
        </button>
      ),
    },
  ], [handleEditAsignacion]);

  const asignacionActions = useMemo(
    () => (
      <button
        type="button"
        className="button button--primary button--sm"
        onClick={() => openCreateAsignacion()}
        disabled={!referenceData}
        title={!referenceData ? 'Cargando datos de referencia...' : undefined}
      >
        Nueva asignación
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

const [convenioEmpresaFilter, setConvenioEmpresaFilter] = useState<string>('todos');

const filteredConvenios = useMemo(() => {
  if (!collections) {
    return [];
  }

  return collections.convenios.filter((convenio) => {
    const stateMatches = convenioEstadoFilter === 'todos' || convenio.estado === convenioEstadoFilter;
    const companyMatches = convenioEmpresaFilter === 'todos' || convenio.empresa.id === Number(convenioEmpresaFilter);
    return stateMatches && companyMatches;
  });
}, [collections, convenioEstadoFilter, convenioEmpresaFilter]);

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
  const [selectedStudent, setSelectedStudent] = useState<EstudianteSummary | null>(null);
  const [studentDetailTab, setStudentDetailTab] = useState<StudentDetailTab>('academico');

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

const analyticData = useMemo(() => {
    if (!collections) {
      return [];
    }

    const entries = Object.entries(asignacionesPorEstado).map(([estado, items]) => ({
      label: estado,
      value: items.length,
    }));

    const conveniosVigentes = collections.convenios.filter((c) => c.estado?.toLowerCase().includes('vig')).length;
    const empresasActivas = collections.empresas.filter((e) => e.estadoColaboracion === 'activa').length;

    entries.push({ label: 'Convenios vigentes', value: conveniosVigentes });
    entries.push({ label: 'Empresas activas', value: empresasActivas });

    return entries;
  }, [collections, asignacionesPorEstado]);
  const analyticMax = analyticData.reduce((max, entry) => Math.max(max, entry.value), 0) || 1;

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
        date: `${formatDate(asignacion.fechaInicio)} · ${formatDate(asignacion.fechaFin)}`,
        modalidad: asignacion.modalidad,
      }));
    }

    return [
      {
        id: 'estado-general',
        title: 'Sin asignaciones activas',
        status: selectedStudent.estado,
        date: 'A la espera de nueva asignación',
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
            <p className="module-page__eyebrow">Espacio privado · Empresas</p>
            <h2>{empresa.nombre}</h2>
            <p className="empresa-page__subtitle">
              {empresa.ciudad ?? 'Sin ciudad'} · {empresa.sector ?? 'Sin sector definido'}
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
              disabled={!referenceData}
              title={!referenceData ? 'Cargando datos de referencia...' : undefined}
            >
              Planificar asignación
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
              <p className="empresa-panel__placeholder">Todavía no se han generado convenios para esta empresa.</p>
            ) : (
              <ul>
                {conveniosEmpresa.map((convenio) => (
                  <li key={convenio.id}>
                    <strong>{convenio.titulo}</strong>
                    <p>{convenio.tipo} · {convenio.estado}</p>
                    <small>{formatDate(convenio.fechaInicio)} · {formatDate(convenio.fechaFin)}</small>
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
              <p className="empresa-panel__placeholder">Aún no hay estudiantes asignados.</p>
            ) : (
              <ul>
                {asignacionesEmpresa.map((asignacion) => (
                  <li key={asignacion.id}>
                    <strong>{asignacion.estudiante.nombre} {asignacion.estudiante.apellido}</strong>
                    <p>{asignacion.estado} · {asignacion.modalidad}</p>
                    <small>{formatDate(asignacion.fechaInicio)} · {formatDate(asignacion.fechaFin)}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <section className="empresa-log">
          <header>
            <div>
              <p className="module-page__eyebrow">Actividad reciente</p>
              <h3>Últimos movimientos</h3>
            </div>
            <Link to="/documentacion" className="link">Abrir documentación</Link>
          </header>
          {activityLog.length === 0 ? (
            <p className="empresa-panel__placeholder">No hay actividad registrada aún.</p>
          ) : (
            <ul>
              {activityLog.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.estudiante.nombre} {item.estudiante.apellido}</strong>
                    <p>{item.estado} · {item.modalidad}</p>
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

  const dashboardElement = collections ? (
    <>
      <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">Todo tu programa en una sola plataforma</p>
          <h1>
            Gestión integral de prácticas
            <span className="hero__highlight hero__highlight--amber"> sencilla </span>
            y
            <span className="hero__highlight hero__highlight--cyan"> eficiente</span>.
          </h1>
          <p className="hero__description">
            Coordina empresas, convenios y estudiantes desde un panel oscuro inspirado en Odoo.
            Sigue cada asignación con trazabilidad y planifica nuevas experiencias en segundos.
          </p>
          <div className="hero__actions">
            <button
              type="button"
              className="button button--primary button--lg"
              onClick={() => openCreateAsignacion()}
              disabled={!referenceData}
            >
              Planificar nueva asignación
            </button>
            <Link className="button button--ghost button--lg hero__link" to="/documentacion">
              Explorar documentación
            </Link>
          </div>
        </div>
        <div className="hero__scribble hero__scribble--violet" />
      </section>

      <section className="modules-grid">
      {moduleCards.map((module) => (
        <article key={module.id} className={`module-card module-card--${module.accent}`}>
          <div className="module-card__inner">
            <div className="module-card__front">
              <div className="module-card__meta">
                <span className="module-card__label">{module.label}</span>
                <strong className="module-card__total">{module.total}</strong>
              </div>
              <p className="module-card__description">{module.description}</p>
            </div>
            <div className="module-card__back">
              <p>{module.detail}</p>
            </div>
          </div>
        </article>
      ))}
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span className="stat-card__label">{stat.label}</span>
            <strong className="stat-card__value">{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="analytics-card">
        <header className="analytics-card__header">
          <div>
            <p className="module-page__eyebrow">Dashboard analítico</p>
            <h3>Distribución de asignaciones y actividad</h3>
          </div>
          <span className="chip chip--ghost">Total registros: {analyticData.reduce((sum, item) => sum + item.value, 0)}</span>
        </header>
        <div className="analytics-bars analytics-bars--vertical">
          {analyticData.map((item, index) => {
            const height = Math.max((item.value / analyticMax) * 100, 5);
            return (
              <div key={item.label} className="analytics-column">
                <div
                  className="analytics-column__fill"
                  style={{ height: `${height}%`, animationDelay: `${index * 0.1}s` }}
                >
                  <span className="analytics-column__value">{item.value}</span>
                </div>
                <span className="analytics-column__label">{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="tables-grid">
        <DataTable
          caption="Empresas colaboradoras"
          data={collections.empresas}
          columns={empresaColumns}
          actions={empresaActions}
        />
        <DataTable
          caption="Convenios"
          data={collections.convenios}
          columns={convenioColumns}
          actions={convenioActions}
        />
        <DataTable
          caption="Estudiantes"
          data={collections.estudiantes}
          columns={estudianteColumns}
          actions={estudianteActions}
        />
        <DataTable
          caption="Asignaciones"
          data={collections.asignaciones}
          columns={asignacionColumns}
          actions={asignacionActions}
        />
      </section>

      <section className="detail-grid">
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
          <h3>Detalle de empresa</h3>
          {selectedEmpresa ? (
            <>
              <div className="detail-panel">
                <p><strong>Sector:</strong> {selectedEmpresa.sector ?? 'No definido'}</p>
                <p><strong>Ciudad:</strong> {selectedEmpresa.ciudad ?? 'No definida'}</p>
                <p><strong>Estado colaboración:</strong> {selectedEmpresa.estadoColaboracion}</p>
                <p><strong>Asignaciones activas:</strong> {selectedEmpresa.asignaciones.enCurso}</p>
                <p><strong>Asignaciones totales:</strong> {selectedEmpresa.asignaciones.total}</p>
                <p><strong>Convenios activos:</strong> {selectedEmpresa.conveniosActivos}</p>
                <p><strong>Tutores profesionales:</strong> {selectedEmpresa.tutoresProfesionales}</p>
              </div>

              {selectedEmpresaDetail && (
                <>
                  <div className="detail-panel detail-panel--secondary">
                    <h4>Convenios vinculados</h4>
                    {selectedEmpresaDetail.convenios.length === 0 ? (
                      <p>No hay convenios asociados.</p>
                    ) : (
                      selectedEmpresaDetail.convenios.map((convenio) => (
                        <div key={convenio.id} className="detail-subitem">
                          <strong>{convenio.titulo}</strong>
                          <small>{formatDate(convenio.fechaInicio)} → {formatDate(convenio.fechaFin)}</small>
                          <span className="chip chip--ghost">{convenio.estado}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="detail-panel detail-panel--secondary">
                    <h4>Asignaciones de la empresa</h4>
                    {selectedEmpresaDetail.asignaciones.length === 0 ? (
                      <p>Aún no se han planificado prácticas con esta empresa.</p>
                    ) : (
                      selectedEmpresaDetail.asignaciones.map((asignacion) => (
                        <div key={asignacion.id} className="detail-subitem">
                          <strong>{asignacion.estudiante.nombre} {asignacion.estudiante.apellido}</strong>
                          <small>{formatDate(asignacion.fechaInicio)} → {formatDate(asignacion.fechaFin)}</small>
                          <span className="chip chip--ghost">{asignacion.estado}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="detail-panel detail-panel--secondary">
                    <h4>Contactos y tutores</h4>
                    <p><strong>Contactos registrados:</strong> {selectedEmpresa.contactos}</p>
                    <p><strong>Tutores profesionales:</strong> {selectedEmpresa.tutoresProfesionales}</p>
                    <p><em>Para ver la lista completa, abre el módulo Empresas en detalle.</em></p>
                  </div>
                </>
              )}
              <div className="detail-panel__actions">
                <Link to={`/empresas/${selectedEmpresa.id}`} className="button button--ghost button--sm">
                  Abrir espacio privado
                </Link>
              </div>
            </>
          ) : (
            <p className="detail-placeholder">Selecciona una empresa para ver el detalle.</p>
          )}
        </div>
      </section>

      <section className="detail-grid">
        <div className="detail-grid__list">
          <div className="detail-grid__header">
            <h3>Convenios por estado</h3>
            <p>Filtra por estado y empresa para encontrar la información relevante.</p>
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
            <div className="filter-chips">
              <button
                type="button"
                className={`chip ${convenioEmpresaFilter === 'todos' ? 'active' : ''}`}
                onClick={() => setConvenioEmpresaFilter('todos')}
              >
                Todas las empresas
              </button>
              {collections.empresas.map((empresa) => (
                <button
                  key={empresa.id}
                  type="button"
                  className={`chip ${convenioEmpresaFilter === String(empresa.id) ? 'active' : ''}`}
                  onClick={() => setConvenioEmpresaFilter(String(empresa.id))}
                >
                  {empresa.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="detail-list">
            {filteredConvenios.map((convenio) => (
              <button
                type="button"
                key={convenio.id}
                className={`detail-item ${selectedConvenio?.id === convenio.id ? 'active' : ''}`}
                onClick={() => setSelectedConvenioId(convenio.id)}
              >
                <div>
                  <strong>{convenio.titulo}</strong>
                  <p>{convenio.empresa.nombre}</p>
                </div>
                <span className="chip chip--ghost">{convenio.estado}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="detail-grid__panel">
          <h3>Detalle de convenio</h3>
          {selectedConvenio ? (
            <>
              <div className="detail-panel">
                <p><strong>Estado:</strong> {selectedConvenio.estado}</p>
                <p><strong>Tipo:</strong> {selectedConvenio.tipo}</p>
                <p><strong>Empresa:</strong> {selectedConvenio.empresa.nombre}</p>
                <p><strong>Inicio:</strong> {formatDate(selectedConvenio.fechaInicio)}</p>
                <p><strong>Fin:</strong> {formatDate(selectedConvenio.fechaFin)}</p>
                <p><strong>Asignaciones asociadas:</strong> {selectedConvenio.asignacionesAsociadas}</p>
              </div>
              <div className="detail-panel detail-panel--secondary">
                <h4>Documentación</h4>
                <p>Sube los contratos firmados y actas de seguimiento en el módulo Convenios.</p>
                <p>Mientras tanto, puedes consultar la <Link to="/documentacion">documentación general del proyecto</Link>.</p>
              </div>
            </>
          ) : (
            <p className="detail-placeholder">Selecciona un convenio para ver KPIs.</p>
          )}
        </div>
      </section>

      <section className="student-cards">
        <header className="student-cards__header">
          <h3>Perfiles de estudiantes</h3>
          <p>Visión rápida del estado académico y asignaciones.</p>
        </header>
        <div className="student-cards__grid">
          {collections.estudiantes.map((estudiante) => {
            const isActive = selectedStudent?.id === estudiante.id;
            return (
              <button
                type="button"
                key={estudiante.id}
                className={`student-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedStudent((current) => (current?.id === estudiante.id ? null : estudiante))}
                aria-pressed={isActive}
              >
                <div className="student-card__avatar">
                  {estudiante.nombre.charAt(0)}
                  {estudiante.apellido.charAt(0)}
                </div>
                <div className="student-card__body">
                  <h4>{estudiante.nombre} {estudiante.apellido}</h4>
                  <p>{estudiante.grado ?? 'Grado no especificado'}</p>
                  <div className="student-card__chips">
                    <span className="chip chip--ghost">{estudiante.estado}</span>
                    <span className="chip chip--ghost">
                      {estudiante.asignaciones.enCurso} en curso / {estudiante.asignaciones.total} total
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {selectedStudent && (
          <div className="student-detail">
            <div className="student-detail__header">
              <div>
                <p className="module-page__eyebrow">Detalle de estudiante</p>
                <h4>{selectedStudent.nombre} {selectedStudent.apellido}</h4>
                <p className="student-detail__subtitle">{selectedStudent.email}</p>
              </div>
              <div className="student-detail__header-actions">
                <span className="chip chip--ghost">{selectedStudent.estado}</span>
                <div className="student-detail__header-buttons">
                  <button type="button" className="button button--ghost button--sm" onClick={() => handleEditStudent(selectedStudent)}>
                    Editar ficha
                  </button>
                  <button type="button" className="button button--link button--sm" onClick={() => setSelectedStudent(null)}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
            <div className="student-detail__tabs">
              <button
                type="button"
                className={studentDetailTab === 'academico' ? 'active' : ''}
                onClick={() => setStudentDetailTab('academico')}
              >
                Información académica
              </button>
              <button
                type="button"
                className={studentDetailTab === 'asignaciones' ? 'active' : ''}
                onClick={() => setStudentDetailTab('asignaciones')}
              >
                Asignaciones
              </button>
              <button
                type="button"
                className={studentDetailTab === 'seguimiento' ? 'active' : ''}
                onClick={() => setStudentDetailTab('seguimiento')}
              >
                Seguimiento
              </button>
            </div>
            <div className="student-detail__content">
              {studentDetailTab === 'academico' && (
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
              )}
              {studentDetailTab === 'asignaciones' && (
                selectedStudentAssignments.length > 0 ? (
                  <div className="student-detail__list">
                    {selectedStudentAssignments.map((asignacion) => (
                      <article className="student-detail__card" key={asignacion.id}>
                        <header>
                          <h5>{asignacion.empresa.nombre}</h5>
                          <span className="chip chip--ghost">{asignacion.estado}</span>
                        </header>
                        <p>{formatDate(asignacion.fechaInicio)} · {formatDate(asignacion.fechaFin)}</p>
                        <div className="student-detail__links">
                          <Link to={`/empresas/${asignacion.empresa.id}`} className="link">
                            Gestionar empresa
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="student-detail__placeholder">Todavía no tiene asignaciones registradas.</p>
                )
              )}
              {studentDetailTab === 'seguimiento' && (
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
              )}
            </div>
          </div>
        )}
      </section>

      <section className="kanban">
        <header className="kanban__header">
          <h3>Estado de asignaciones</h3>
          <p>Visualiza el pipeline completo y accede rápido a cada tutor o empresa.</p>
        </header>
        <div className="kanban__columns">
          {Object.entries(asignacionesPorEstado).map(([estado, items]) => (
            <div key={estado} className="kanban__column">
              <h4>{estado}</h4>
              {(items as AsignacionSummary[]).map((asignacion) => (
                <article className="kanban-card" key={asignacion.id}>
                  <h5>{asignacion.empresa.nombre}</h5>
                  <p>{asignacion.estudiante.nombre} {asignacion.estudiante.apellido}</p>
                  <small>{formatDate(asignacion.fechaInicio)} → {formatDate(asignacion.fechaFin)}</small>
                  <div className="kanban-card__tags">
                    <span className="chip chip--ghost">{asignacion.modalidad}</span>
                    {asignacion.horasTotales && (
                      <span className="chip chip--ghost">{asignacion.horasTotales} h</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  ) : (
    <div className="app__alert app__alert--info">Cargando datos del backend…</div>
  );

  return (
    <div className="app app--dark">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <header className="topbar">
        <div>
          <Link to="/" className="topbar__logo">Agora</Link>
          <span className="topbar__badge">Panel de prácticas</span>
        </div>
        <div className="topbar__actions">
          <span className="app__meta">API: <code>{API_BASE_URL}</code></span>
          {lastUpdated && <span className="app__meta">Sync {lastUpdated.toLocaleTimeString('es-ES')}</span>}
          <button type="button" onClick={loadData} disabled={loading}>
            {loading ? 'Actualizando…' : 'Sincronizar'}
          </button>
          <div className="topbar__auth">
            <Link to="/login" className="button button--ghost button--sm">Iniciar sesión</Link>
            <Link to="/registro" className="button button--primary button--sm">Registrar empresa</Link>
          </div>
        </div>
      </header>

      {error && <div className="app__alert app__alert--error">{error}</div>}
      {loading && <div className="app__alert app__alert--info">Cargando datos…</div>}

      <Routes>
        <Route path="/" element={dashboardElement} />
        <Route path="/empresas/:empresaId" element={<EmpresaManagementPage />} />
        <Route path="/documentacion" element={<DocumentationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/registro"
          element={(
            <CompanyRegistrationPage
              onSuccess={(msg) => pushToast('success', msg)}
              onError={(msg) => pushToast('error', msg)}
            />
          )}
        />
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
          title={asignacionModal.mode === 'create' ? 'Crear asignación' : 'Editar asignación'}
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



