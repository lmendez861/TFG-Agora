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
  approveEmpresaSolicitud,
  createAsignacion,
  createConvenio,
  createEmpresa,
  createEstudiante,
  fetchCollections,
  fetchEmpresaSolicitudes,
  fetchTutorAcademicos,
  fetchTutorProfesionales,
  getApiBaseUrl,
  getAsignacionDetail,
  getConvenioDetail,
  getEmpresaDetail,
  getEstudianteDetail,
  updateAsignacion,
  updateConvenio,
  rejectEmpresaSolicitud,
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
  EmpresaSolicitudSummary,
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
      nombre: 'Innovar Formacion',
      sector: 'Tecnologia educativa',
      ciudad: 'Madrid',
      estadoColaboracion: 'activa',
      conveniosActivos: 2,
      tutoresProfesionales: 2,
      contactos: 2,
      asignaciones: { total: 2, enCurso: 1 },
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
    {
      id: 3,
      nombre: 'LogiMovil Partners',
      sector: 'Logistica inteligente',
      ciudad: 'Sevilla',
      estadoColaboracion: 'activa',
      conveniosActivos: 1,
      tutoresProfesionales: 2,
      contactos: 2,
      asignaciones: { total: 1, enCurso: 1 },
    },
    {
      id: 4,
      nombre: 'Energia Circular Coop.',
      sector: 'Energia renovable',
      ciudad: 'Bilbao',
      estadoColaboracion: 'activa',
      conveniosActivos: 1,
      tutoresProfesionales: 1,
      contactos: 2,
      asignaciones: { total: 1, enCurso: 0 },
    },
  ],
  estudiantes: [
    {
      id: 1,
      nombre: 'Ana',
      apellido: 'Martinez',
      dni: '12345678A',
      email: 'ana.martinez@alumnos.es',
      grado: 'Ingenieria Informatica',
      curso: '4o',
      estado: 'en_practicas',
      asignaciones: { total: 1, enCurso: 1 },
    },
    {
      id: 2,
      nombre: 'Luis',
      apellido: 'Campos',
      dni: '87654321B',
      email: 'luis.campos@alumnos.es',
      grado: 'Ingenieria Biomedica',
      curso: '3o',
      estado: 'disponible',
      asignaciones: { total: 1, enCurso: 0 },
    },
    {
      id: 3,
      nombre: 'Marina',
      apellido: 'Vega',
      dni: '44556677C',
      email: 'marina.vega@alumnos.es',
      grado: 'Ingenieria Industrial',
      curso: '5o',
      estado: 'en_practicas',
      asignaciones: { total: 1, enCurso: 1 },
    },
    {
      id: 4,
      nombre: 'Carlos',
      apellido: 'Ibanez',
      dni: '99887766D',
      email: 'carlos.ibanez@alumnos.es',
      grado: 'Telecomunicaciones',
      curso: '4o',
      estado: 'planificado',
      asignaciones: { total: 1, enCurso: 0 },
    },
    {
      id: 5,
      nombre: 'Sofia',
      apellido: 'Herrera',
      dni: '11223344E',
      email: 'sofia.herrera@alumnos.es',
      grado: 'Administracion y Direccion',
      curso: '4o',
      estado: 'finalizado',
      asignaciones: { total: 1, enCurso: 0 },
    },
  ],
  convenios: [
    {
      id: 1,
      titulo: 'Convenio IA Educativa 2024/2025',
      empresa: { id: 1, nombre: 'Innovar Formacion' },
      tipo: 'curricular',
      estado: 'vigente',
      fechaInicio: '2024-09-01',
      fechaFin: '2025-02-28',
      asignacionesAsociadas: 1,
    },
    {
      id: 2,
      titulo: 'Convenio Integraciones Clinicas 2024',
      empresa: { id: 2, nombre: 'Salud Conectada S.L.' },
      tipo: 'extracurricular',
      estado: 'borrador',
      fechaInicio: '2024-11-01',
      fechaFin: null,
      asignacionesAsociadas: 1,
    },
    {
      id: 3,
      titulo: 'Plataforma de Logistica Inteligente 2024',
      empresa: { id: 3, nombre: 'LogiMovil Partners' },
      tipo: 'curricular',
      estado: 'vigente',
      fechaInicio: '2024-08-15',
      fechaFin: '2025-01-31',
      asignacionesAsociadas: 1,
    },
    {
      id: 4,
      titulo: 'Programa Transicion Energetica 2024/25',
      empresa: { id: 4, nombre: 'Energia Circular Coop.' },
      tipo: 'extracurricular',
      estado: 'renovacion',
      fechaInicio: '2024-05-01',
      fechaFin: '2025-05-01',
      asignacionesAsociadas: 1,
    },
    {
      id: 5,
      titulo: 'Convenio DataOps 2025',
      empresa: { id: 1, nombre: 'Innovar Formacion' },
      tipo: 'curricular',
      estado: 'planificado',
      fechaInicio: '2025-03-01',
      fechaFin: '2025-09-30',
      asignacionesAsociadas: 0,
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
      empresa: { id: 1, nombre: 'Innovar Formacion' },
      estudiante: { id: 1, nombre: 'Ana', apellido: 'Martinez' },
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
    {
      id: 3,
      estado: 'finalizada',
      modalidad: 'remota',
      horasTotales: 180,
      fechaInicio: '2024-03-01',
      fechaFin: '2024-06-30',
      empresa: { id: 1, nombre: 'Innovar Formacion' },
      estudiante: { id: 5, nombre: 'Sofia', apellido: 'Herrera' },
    },
    {
      id: 4,
      estado: 'en_curso',
      modalidad: 'presencial',
      horasTotales: 300,
      fechaInicio: '2024-09-10',
      fechaFin: '2025-02-15',
      empresa: { id: 3, nombre: 'LogiMovil Partners' },
      estudiante: { id: 3, nombre: 'Marina', apellido: 'Vega' },
    },
    {
      id: 5,
      estado: 'planificada',
      modalidad: 'hibrida',
      horasTotales: 260,
      fechaInicio: '2025-01-15',
      fechaFin: '2025-05-30',
      empresa: { id: 4, nombre: 'Energia Circular Coop.' },
      estudiante: { id: 4, nombre: 'Carlos', apellido: 'Ibanez' },
    },
  ],
};

const SOLICITUD_ESTADO_LABELS: Record<EmpresaSolicitudSummary['estado'], string> = {
  pendiente: 'Pendiente',
  email_verificado: 'Correo verificado',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

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

interface StaffRegistrationFormValues {
  nombre: string;
  email: string;
  departamento: string;
  comentarios: string;
}

const EMPTY_STAFF_REGISTRATION_VALUES: StaffRegistrationFormValues = {
  nombre: '',
  email: '',
  departamento: '',
  comentarios: '',
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
type EmpresaNote = {
  id: number;
  author: string;
  content: string;
  timestamp: string;
};

type EmpresaDocument = {
  id: number;
  name: string;
  type: string;
  uploadedAt: string;
};

type ConvenioChecklistItem = {
  id: number;
  label: string;
  completed: boolean;
};

type ConvenioDocumentRecord = {
  id: number;
  name: string;
  type: string;
  uploadedAt: string;
};

type ConvenioAlert = {
  id: number;
  message: string;
  level: 'info' | 'warning';
  active: boolean;
};

const CONVENIO_STEP_FLOW = ['borrador', 'revisado', 'firmado', 'vigente', 'renovacion', 'finalizado'];

interface StaffRegistrationPageProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function DocumentationPage() {
  return (
    <section className="module-page">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">Recursos</p>
          <h2>Documentacion del proyecto</h2>
          <p>Guias rapidas para desplegar backend y frontend, checklist operativos y enlaces internos.</p>
        </div>
      </header>
      <div className="docs-grid">
        <article className="docs-card">
          <h3>Backend Symfony</h3>
          <p>Arranque del servidor, ejecucion de tests y pautas de autenticacion.</p>
          <a href="../README.md" target="_blank" rel="noreferrer">Abrir README general</a>
        </article>
        <article className="docs-card">
          <h3>Frontend Vite/React</h3>
          <p>Variables de entorno, scripts disponibles y consejos de estilo.</p>
          <a href="./README.md" target="_blank" rel="noreferrer">Abrir README frontend</a>
        </article>
        <article className="docs-card">
          <h3>Flujos CRUD</h3>
          <p>Resumen de endpoints para empresas, convenios, estudiantes y asignaciones. Consulta tambien los tests en backend/tests.</p>
        </article>
        <article className="docs-card">
          <h3>Pruebas automatizadas</h3>
          <p>Ejecuta php bin/phpunit para validar controladores y repositorios clave del dominio.</p>
        </article>
      </div>

      <div className="docs-panels">
        <article className="docs-panel">
          <h3>Checklist de despliegue</h3>
          <ul>
            <li>Backend: composer install, configurar .env.local y ejecutar migraciones.</li>
            <li>Frontend: npm install, definir VITE_API_BASE_URL y lanzar npm run dev.</li>
            <li>Datos demo: php bin/console doctrine:fixtures:load para poblar empresas y asignaciones.</li>
            <li>Validar /api/empresas antes de compartir acceso con coordinadores.</li>
          </ul>
        </article>
        <article className="docs-panel docs-panel--links">
          <h3>Enlaces rapidos</h3>
          <div className="docs-links">
            <Link className="link" to="/asignaciones/1">Ejemplo de seguimiento</Link>
            <Link className="link" to="/empresas/1">Espacio privado de empresa</Link>
            <a className="link" href="https://github.com/lmendez861/TFG-gora" target="_blank" rel="noreferrer">
              Repositorio en GitHub
            </a>
            <Link className="link" to="/">Volver al dashboard</Link>
          </div>
          <p>Utiliza estos accesos para demo o onboarding de coordinadores.</p>
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
    setStatus('La autenticacion basada en usuarios llegara proximamente. De momento utiliza la autenticacion basica configurada en Symfony.');
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="auth-card__eyebrow">Bienvenido de nuevo</p>
        <h2>Iniciar sesion</h2>
        <p className="auth-card__description">
          El login real llegara tras migrar usuarios a base de datos. Mientras tanto puedes usar autenticacion basica desde el backend.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form__field">
            <span>Email institucional</span>
            <input type="email" placeholder="coordinacion@centro.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="form__field">
            <span>Contrasena</span>
            <input type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" className="button button--primary button--lg">
            Entrar (demo)
          </button>
          {status && <p className="form__error">{status}</p>}
          <p className="auth-card__hint">Continua utilizando las credenciales basicas dmin/admin123 en el backend.</p>
        </form>
      </div>
    </section>
  );
}

function StaffRegistrationPage({ onSuccess, onError }: StaffRegistrationPageProps) {
  const [values, setValues] = useState<StaffRegistrationFormValues>({ ...EMPTY_STAFF_REGISTRATION_VALUES });
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

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const message = 'Solicitud registrada. El equipo de TI validara la informacion y activara tu usuario.';
      setStatusMessage(message);
      onSuccess(message);
      setValues({ ...EMPTY_STAFF_REGISTRATION_VALUES });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar la solicitud.';
      setStatusMessage(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="auth-card__eyebrow">Acceso restringido</p>
        <h2>Solicitar cuenta interna</h2>
        <p className="auth-card__description">
          Este formulario esta pensado para el personal del centro educativo. Tras revisar tus datos, activaremos tu acceso al panel.
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form__field">
            <span>Nombre completo*</span>
            <input name="nombre" value={values.nombre} onChange={handleChange} required />
          </label>
          <label className="form__field">
            <span>Email institucional*</span>
            <input name="email" type="email" value={values.email} onChange={handleChange} required />
          </label>
          <label className="form__field">
            <span>Departamento</span>
            <input name="departamento" value={values.departamento} onChange={handleChange} />
          </label>
          <label className="form__field">
            <span>Comentarios adicionales</span>
            <textarea
              name="comentarios"
              rows={3}
              placeholder="Indica si gestionaras empresas, convenios, etc."
              value={values.comentarios}
              onChange={handleChange}
            />
          </label>
          {statusMessage && <p className="form__success">{statusMessage}</p>}
          <button type="submit" className="button button--primary button--lg" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar solicitud'}
          </button>
          <p className="auth-card__hint">
            Si representas a una empresa colaboradora, utiliza el portal especifico de registros externos.
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
  const navigate = useNavigate();
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
  const [empresaSolicitudes, setEmpresaSolicitudes] = useState<EmpresaSolicitudSummary[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [processingSolicitudId, setProcessingSolicitudId] = useState<number | null>(null);

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
        author: 'Coordinacin',
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

  const handleAddEmpresaDocument = useCallback((empresaId: number, name: string, type: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return false;
    }
    setEmpresaDocs((prev) => {
      const docs = prev[empresaId] ?? [];
      const newDoc: EmpresaDocument = {
        id: Date.now(),
        name: trimmedName,
        type: type.trim() || 'Documento',
        uploadedAt: new Date().toISOString(),
      };
    return { ...prev, [empresaId]: [newDoc, ...docs] };
  });
  return true;
}, []);

  const handleToggleChecklistItem = useCallback((convenioId: number, itemId: number) => {
    setConvenioChecklist((prev) => {
      const items = prev[convenioId] ?? [];
      return {
        ...prev,
        [convenioId]: items.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item,
        ),
      };
    });
  }, []);

  const handleAdvanceConvenioState = useCallback((convenioId: number) => {
    setConvenioWorkflowState((prev) => {
      const current = prev[convenioId] ?? 'borrador';
      const index = CONVENIO_STEP_FLOW.findIndex((step) => step === current);
      const next = CONVENIO_STEP_FLOW[(index + 1) % CONVENIO_STEP_FLOW.length];
      pushToast('success', `Convenio ${convenioId} cambia a ${next}.`);
      return { ...prev, [convenioId]: next };
    });
  }, [pushToast]);

  const handleAddConvenioDocument = useCallback((convenioId: number, name: string, type: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return false;
    }
    setConvenioDocuments((prev) => {
      const docs = prev[convenioId] ?? [];
      return {
        ...prev,
        [convenioId]: [
          {
            id: Date.now(),
            name: trimmedName,
            type: type.trim() || 'PDF',
            uploadedAt: new Date().toISOString(),
          },
          ...docs,
        ],
      };
    });
    return true;
  }, []);

  const handleDismissConvenioAlert = useCallback((convenioId: number, alertId: number) => {
    setConvenioAlerts((prev) => {
      const alerts = prev[convenioId] ?? [];
      return {
        ...prev,
        [convenioId]: alerts.map((alert) =>
          alert.id === alertId ? { ...alert, active: false } : alert,
        ),
      };
    });
  }, []);

  const refreshSolicitudes = useCallback(
    async (options?: { silent?: boolean }) => {
      setLoadingSolicitudes(true);
      try {
        const data = await fetchEmpresaSolicitudes();
        setEmpresaSolicitudes(data.filter((solicitud) => solicitud.estado !== 'aprobada'));
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
    [pushToast],
  );

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
    await refreshSolicitudes({ silent: true });
  }, [refreshSolicitudes]);

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
      const motivo = window.prompt('Cul es el motivo del rechazo?');
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
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los datos de la asignacin.';
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
          pushToast('success', 'Asignacin creada correctamente.');
        } else if (asignacionModal.entityId) {
          await updateAsignacion(asignacionModal.entityId, payload);
          pushToast('success', 'Asignacin actualizada correctamente.');
        }

        await loadData();
        handleCloseAsignacionModal();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo guardar la asignacin.';
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
        disabled={!referenceData}
        title={!referenceData ? 'Cargando datos de referencia...' : undefined}
      >
        Nueva asignacin
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
      detail: 'Incluye estados de colaboracin, contactos y convenios relacionados.',
      accent: 'orchid',
    },
    {
      id: 'convenios',
      label: 'Convenios',
      total: collections?.convenios.length ?? 0,
      description: 'Acuerdos vigentes',
      detail: 'Informacin completa sobre fechas, estado y asignaciones vinculadas.',
      accent: 'amber',
    },
    {
      id: 'estudiantes',
      label: 'Estudiantes',
      total: collections?.estudiantes.length ?? 0,
      description: 'Participantes registrados',
      detail: 'Fichas con estado acadmico, asignaciones y datos de contacto.',
      accent: 'cyan',
    },
    {
      id: 'asignaciones',
      label: 'Asignaciones',
      total: collections?.asignaciones.length ?? 0,
      description: 'Prcticas en curso',
      detail: 'Pipeline Kanban con tutoras, fechas y modalidad.',
      accent: 'violet',
    },
    {
      id: 'documentacion',
      label: 'Documentacin',
      total: 3,
      description: 'Guas y recursos listos',
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
        description: 'Estado, fechas y documentacin adjunta.',
        path: '/convenios',
      },
      {
        id: 'estudiantes',
        label: 'Estudiantes',
        total: collections?.estudiantes.length ?? 0,
        description: 'Ficha acadmica y seguimiento en curso.',
        path: '/estudiantes',
      },
      {
        id: 'asignaciones',
        label: 'Asignaciones',
        total: collections?.asignaciones.length ?? 0,
        description: 'Pipeline completo, tutores y horas planificadas.',
        path: '/asignaciones',
      },
    ],
    [collections],
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
          updated[empresa.id] = [baseLabel];
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
              uploadedAt: new Date().toISOString(),
            },
          ];
        }
      });
      return updated;
    });

    setConvenioWorkflowState((prev) => {
      let updated = prev;
      collections.convenios.forEach((convenio) => {
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
      collections.convenios.forEach((convenio) => {
        if (!prev[convenio.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          updated[convenio.id] = [
            { id: Number(`${convenio.id}01`), label: 'Documento firmado', completed: false },
            { id: Number(`${convenio.id}02`), label: 'Seguro actualizado', completed: false },
            { id: Number(`${convenio.id}03`), label: 'Aprobacin tutor acadmico', completed: false },
          ];
        }
      });
      return updated;
    });

    setConvenioDocuments((prev) => {
      let updated = prev;
      collections.convenios.forEach((convenio) => {
        if (!prev[convenio.id]) {
          if (updated === prev) {
            updated = { ...prev };
          }
          updated[convenio.id] = [
            {
              id: Number(`${convenio.id}500`),
              name: 'Borrador inicial',
              type: 'PDF',
              uploadedAt: new Date().toISOString(),
            },
          ];
        }
      });
      return updated;
    });

    setConvenioAlerts((prev) => {
      let updated = prev;
      collections.convenios.forEach((convenio) => {
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
          ];
        }
      });
      return updated;
    });
  }, [collections]);

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
        date: `${formatDate(asignacion.fechaInicio)}  ${formatDate(asignacion.fechaFin)}`,
        modalidad: asignacion.modalidad,
      }));
    }

    return [
      {
        id: 'estado-general',
        title: 'Sin asignaciones activas',
        status: selectedStudent.estado,
        date: 'A la espera de nueva asignacin',
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
              disabled={!referenceData}
              title={!referenceData ? 'Cargando datos de referencia...' : undefined}
            >
              Planificar asignacin
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
              <p className="empresa-panel__placeholder">Todava no se han generado convenios para esta empresa.</p>
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
              <p className="empresa-panel__placeholder">An no hay estudiantes asignados.</p>
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
        </div>

        <section className="empresa-log">
          <header>
            <div>
              <p className="module-page__eyebrow">Actividad reciente</p>
              <h3>ltimos movimientos</h3>
            </div>
            <Link to="/documentacion" className="link">Abrir documentacin</Link>
          </header>
          {activityLog.length === 0 ? (
            <p className="empresa-panel__placeholder">No hay actividad registrada an.</p>
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
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'No se pudo cargar el detalle del convenio.';
          setDetailError(message);
        })
        .finally(() => setDetailLoading(false));
    }, [convenioId, numericId]);

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
            <p>No hay datos sincronizados. Regresa al dashboard para cargar la informacin.</p>
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
              disabled={!referenceData}
              title={!referenceData ? 'Cargando datos de referencia...' : undefined}
            >
              Planificar asignacin
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
              Documentacin
            </button>
          </div>

          {tab === 'resumen' ? (
            <div className="convenio-overview">
              <div>
                <span className="student-detail__label">Descripcin</span>
                <p>{detail?.descripcion ?? 'Sin descripcin registrada.'}</p>
              </div>
              <div>
                <span className="student-detail__label">Observaciones</span>
                <p>{detail?.observaciones ?? 'Aade notas de seguimiento para mantener el contexto.'}</p>
              </div>
              <div>
                <span className="student-detail__label">Documentacin firmada</span>
                {detail?.documentoUrl ? (
                  <a className="link" href={detail.documentoUrl} target="_blank" rel="noreferrer">
                    Abrir documento
                  </a>
                ) : (
                  <p>No hay documentos adjuntos todava.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="convenio-docs">
              <article>
                <h4>Guas recomendadas</h4>
                <ul>
                  <li>
                    <Link to="/documentacion" className="link">Documentacin general del proyecto</Link>
                  </li>
                  <li>
                    <a
                      className="link"
                      href="https://github.com/lmendez861/TFG-gora/blob/main/README.md"
                      target="_blank"
                      rel="noreferrer"
                    >
                      README raz
                    </a>
                  </li>
                  <li>
                    <a
                      className="link"
                      href="https://github.com/lmendez861/TFG-gora/blob/main/frontend/README.md"
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
                  <li>Adjuntar documentacin firmada o enlazar al repositorio correspondiente.</li>
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
          const message = err instanceof Error ? err.message : 'No se pudo obtener el detalle de la asignacin.';
          setDetailError(message);
        })
        .finally(() => setDetailLoading(false));
    }, [asignacionId, numericId]);

    if (!asignacionId) {
      return (
        <div className="asignacion-page">
          <div className="asignacion-page__panel">
            <p>No se ha indicado ninguna asignacin.</p>
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
            <p>No hay datos sincronizados todava. Regresa al dashboard y sincroniza con el backend.</p>
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
            <p>No encontramos la asignacin solicitada.</p>
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
        note: 'Aprobado por coordinacin',
      });
      if (asignacionSummary.fechaFin) {
        events.push({
          title: 'Fin estimado',
          date: formatDate(asignacionSummary.fechaFin),
          note: 'Actualiza si hay prrroga',
        });
      }
      if (detail) {
        events.push({
          title: 'Tutor acadmico asignado',
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
        label: 'Tutor acadmico',
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
            <p className="module-page__eyebrow">Detalle de asignacin</p>
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
              disabled={!referenceData}
              title={!referenceData ? 'Cargando datos de referencia...' : undefined}
            >
              Duplicar asignacin
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
                <span>Tutor acadmico</span>
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
            <h3>Acciones rpidas</h3>
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
            <p>Enlaza actas semanales, evaluaciones y rbricas firmadas.</p>
            <Link to="/documentacion" className="link">Abrir documentacin general</Link>
          </article>
          <article>
            <h4>Checklist interno</h4>
            <ul>
              <li>Confirmar asistencia semanal del estudiante.</li>
              <li>Registrar feedback de ambos tutores.</li>
              <li>Adjuntar informe final antes de cerrar la asignacin.</li>
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
          <p>Sincroniza desde el dashboard principal para cargar la informacin.</p>
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
            <p className="module-page__eyebrow">Mdulo empresas</p>
            <h2>Empresas colaboradoras</h2>
            <p>Repasa el estado de colaboracin, contactos y convenios activos.</p>
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
            Ir a gestin
          </button>
        </form>
        <DataTable
          caption="Empresas"
          data={collections.empresas}
          columns={empresaColumns}
          actions={empresaActions}
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
                    <span>Estado colaboracin</span>
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
                          <h4>Talento vinculado</h4>
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
                        <p className="empresa-panel__placeholder">An no hay asignaciones registradas.</p>
                      )}
                    </article>
                    <article className="empresa-panel">
                      <header>
                        <div>
                          <p className="module-page__eyebrow">Contexto adicional</p>
                          <h4>Sntesis rpida</h4>
                        </div>
                      </header>
                      <ul>
                        <li>
                          <strong>Etiquetas activas</strong>
                          <p>{labels.length > 0 ? labels.join(', ') : 'Sin etiquetas registradas.'}</p>
                        </li>
                        <li>
                          <strong>Notas colaborativas</strong>
                          <p>{notes.length > 0 ? `${notes.length} notas internas` : 'An no hay notas guardadas.'}</p>
                        </li>
                        <li>
                          <strong>Documentos compartidos</strong>
                          <p>{documents.length > 0 ? `${documents.length} archivos disponibles` : 'Todava no hay adjuntos.'}</p>
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

    const handleDocumentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedConvenio) {
        return;
      }

      const saved = handleAddConvenioDocument(selectedConvenio.id, documentName, documentType);
      if (saved) {
        setDocumentName('');
        setDocumentType('');
      }
    };

    return (
      <section className="module-page module-page--wide">
        <header className="module-page__header">
          <div>
            <p className="module-page__eyebrow">Mdulo convenios</p>
            <h2>Convenios y acuerdos</h2>
            <p>Controla el workflow, checklist documental y recordatorios crticos.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/">
            Volver al dashboard
          </Link>
        </header>
        <DataTable
          caption="Convenios"
          data={collections.convenios}
          columns={convenioColumns}
          actions={convenioActions}
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
            <span>Por renovar (60 das)</span>
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
              <p className="module-page__eyebrow">Filtros rpidos</p>
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
                      <p className="detail-placeholder">An no se ha definido el checklist.</p>
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
                            <button type="button" className="button button--link">
                              Descargar
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="detail-placeholder">Sin documentos adjuntos todava.</p>
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
                      <button type="submit" className="button button--primary button--sm">
                        Aadir documento
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
            <p className="module-page__eyebrow">Mdulo estudiantes</p>
            <h2>Listado completo de estudiantes</h2>
            <p>Consulta informacin acadmica, asignaciones y contacto.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/">
            Volver al dashboard
          </Link>
        </header>
        <DataTable
          caption="Estudiantes"
          data={collections.estudiantes}
          columns={estudianteColumns}
          actions={estudianteActions}
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
                        Planificar asignacin
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
                    <h4>Ficha acadmica</h4>
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
                      Ver mdulo
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
                    <p className="student-detail__placeholder">Todava no tiene asignaciones registradas.</p>
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
            <p className="module-page__eyebrow">Mdulo asignaciones</p>
            <h2>Pipeline completo de asignaciones</h2>
            <p>Repasa cada prctica, tutores asignados y estado actual.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/">
            Volver al dashboard
          </Link>
        </header>
        <DataTable
          caption="Asignaciones"
          data={collections.asignaciones}
          columns={asignacionColumns}
          actions={asignacionActions}
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
              <p className="module-page__eyebrow">Filtros rpidos</p>
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
                    <p className="module-page__eyebrow">Asignacin #{selectedAsignacion.id}</p>
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
                  Consulta la ficha completa para visualizar tutores asignados, timeline de hitos y documentacin adjunta.
                </p>
              </>
            ) : (
              <p className="detail-placeholder">Selecciona una asignacin para revisar su detalle.</p>
            )}
          </div>
        </section>

        <section className="kanban">
          <header className="kanban__header">
            <h3>Pipeline visual</h3>
            <p>Visualiza el pipeline completo y accede rpido a cada tutor o empresa.</p>
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
  const dashboardElement = collections ? (
    <>
            <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">Todo tu programa en una sola plataforma</p>
          <h1>
            Gestion integral de practicas
            <span className="hero__highlight hero__highlight--amber"> sencilla </span>
            y
            <span className="hero__highlight hero__highlight--cyan"> eficiente</span>.
          </h1>
          <p className="hero__description">
            Coordina empresas, convenios y estudiantes desde un panel oscuro inspirado en Odoo.
            Sigue cada asignacion con trazabilidad y planifica nuevas experiencias en segundos.
          </p>
          <div className="hero__actions">
            <button
              type="button"
              className="button button--primary button--lg"
              onClick={() => openCreateAsignacion()}
              disabled={!referenceData}
            >
              Planificar nueva asignacion
            </button>
            <Link className="button button--ghost button--lg hero__link" to="/documentacion">
              Explorar documentacion
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
            <p className="module-page__eyebrow">Dashboard analtico</p>
            <h3>Distribucin de asignaciones y actividad</h3>
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
                  style={{
                    height: `${height}%`,
                    animationDelay: `${index * 0.35}s`,
                    animationDuration: `${3 + (index % 3)}s`,
                  }}
                >
                  <span className="analytics-column__value">{item.value}</span>
                </div>
                <span className="analytics-column__label">{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="module-links">
        {moduleQuickLinks.map((module) => (
          <article key={module.id} className="module-link-card">
            <p className="module-link-card__label">{module.label}</p>
            <strong className="module-link-card__value">{module.total}</strong>
            <p className="module-link-card__description">{module.description}</p>
            <Link className="button button--ghost button--sm module-link-card__cta" to={module.path}>
              Abrir mdulo
            </Link>
          </article>
        ))}
      </section>

      <section className="student-cards">
        <div className="student-cards__header">
          <div>
            <h3>Perfiles de estudiantes</h3>
            <p>Resumen rpido del estado acadmico y asignaciones activas.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/estudiantes">
            Ver mdulo completo
          </Link>
        </div>
        {studentPreview.length > 0 ? (
          <div className="student-cards__grid">
            {studentPreview.map((estudiante) => {
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
        ) : (
          <p className="detail-placeholder">An no hay estudiantes registrados.</p>
        )}
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
                Informacin acadmica
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
                        <p>{formatDate(asignacion.fechaInicio)}  {formatDate(asignacion.fechaFin)}</p>
                        <div className="student-detail__links">
                          <Link to={`/empresas/${asignacion.empresa.id}`} className="link">
                            Gestionar empresa
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="student-detail__placeholder">Todava no tiene asignaciones registradas.</p>
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

   </>
  ) : (
    <div className="app__alert app__alert--info">Cargando datos del backend...</div>
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
            const canApprove = solicitud.estado === 'email_verificado';
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  const profileElement = (
    <section className="module-page">
      <header className="module-page__header">
        <div>
          <p className="module-page__eyebrow">Perfil</p>
          <h2>Administrador</h2>
          <p>Configuracion basica del usuario interno. La autenticacion real llegara en una iteracion posterior.</p>
        </div>
      </header>
      <div className="profile-card">
        <p>
          Usa tu cuenta institucional para gestionar las asignaciones y convenios. Cuando se active el login, aqui
          podras actualizar tus datos y rotar credenciales.
        </p>
      </div>
    </section>
  );

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
                      <button
                        type="button"
                        key={solicitud.id}
                        className="notification-item"
                        onClick={openSolicitudesPage}
                      >
                        <span className="notification-item__title">{solicitud.nombreEmpresa}</span>
                        <span className="notification-item__meta">
                          {SOLICITUD_ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}
                        </span>
                      </button>
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
            <Link to="/login" className="button button--ghost button--sm" onClick={closeNotifications}>Iniciar sesion</Link>
            <Link to="/perfil" className="topbar__profile" onClick={closeNotifications}>
              <span className="topbar__profile-icon">&#128100;</span>
              <span className="topbar__profile-label">Perfil</span>
            </Link>
          </div>
        </div>
      </header>

      {error && <div className="app__alert app__alert--error">{error}</div>}
      {loading && <div className="app__alert app__alert--info">Cargando datos...</div>}

      <Routes>
        <Route path="/" element={dashboardElement} />
        <Route path="/empresas" element={<EmpresasOverviewPage />} />
        <Route path="/empresas/:empresaId" element={<EmpresaManagementPage />} />
        <Route path="/convenios" element={<ConveniosOverviewPage />} />
        <Route path="/convenios/:convenioId" element={<ConvenioManagementPage />} />
        <Route path="/estudiantes" element={<EstudiantesOverviewPage />} />
        <Route path="/asignaciones" element={<AsignacionesOverviewPage />} />
        <Route path="/asignaciones/:asignacionId" element={<AsignacionManagementPage />} />
        <Route path="/documentacion" element={<DocumentationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/solicitudes" element={solicitudesElement} />
        <Route path="/perfil" element={profileElement} />
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
          title={asignacionModal.mode === 'create' ? 'Crear asignacin' : 'Editar asignacin'}
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






