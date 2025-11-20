export interface EmpresaSummary {
  id: number;
  nombre: string;
  sector: string | null;
  ciudad: string | null;
  estadoColaboracion: string;
  conveniosActivos: number;
  tutoresProfesionales: number;
  contactos: number;
  asignaciones: {
    total: number;
    enCurso: number;
  };
}

export interface EmpresaDetail {
  id: number;
  nombre: string;
  sector: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  estadoColaboracion: string | null;
  fechaAlta: string;
  observaciones: string | null;
}

export interface EmpresaPayload {
  nombre: string;
  sector?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  telefono?: string;
  email?: string;
  web?: string;
  estadoColaboracion?: string;
  fechaAlta?: string;
  observaciones?: string;
}

export interface EstudianteSummary {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  grado: string | null;
  curso: string | null;
  estado: string;
  asignaciones: {
    total: number;
    enCurso: number;
  };
}

export interface EstudianteAssignment {
  id: number;
  empresa: string;
  estado: string;
  modalidad: string;
  fechaInicio: string;
  fechaFin: string | null;
}

export interface EstudianteDetail {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string | null;
  grado: string | null;
  curso: string | null;
  expediente: string | null;
  estado: string;
  asignaciones: EstudianteAssignment[];
}

export interface EstudiantePayload {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono?: string;
  grado?: string;
  curso?: string;
  expediente?: string;
  estado?: string;
}

export interface ConvenioSummary {
  id: number;
  titulo: string;
  empresa: {
    id: number;
    nombre: string;
  };
  tipo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  asignacionesAsociadas: number;
}

export interface ConvenioDetail {
  id: number;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  documentoUrl: string | null;
  observaciones: string | null;
  empresa: {
    id: number;
    nombre: string;
  };
  workflow: ConvenioWorkflow;
  checklist: ConvenioChecklistItemDetail[];
  documents: ConvenioDocumentRecord[];
  alerts: ConvenioAlert[];
}

export interface ConvenioPayload {
  empresaId: number;
  titulo: string;
  tipo: string;
  descripcion?: string;
  estado?: string;
  fechaInicio: string;
  fechaFin?: string | null;
  documentoUrl?: string;
  observaciones?: string;
}

export interface ConvenioWorkflowEvent {
  id: number;
  estado: string;
  comentario: string | null;
  registradoEn: string;
}

export interface ConvenioWorkflow {
  current: string;
  steps: string[];
  history: ConvenioWorkflowEvent[];
}

export interface ConvenioChecklistItemDetail {
  id: number;
  label: string;
  completed: boolean;
  createdAt: string;
}

export interface ConvenioDocumentRecord {
  id: number;
  name: string;
  type: string | null;
  url: string | null;
  uploadedAt: string;
}

export interface ConvenioAlert {
  id: number;
  message: string;
  level: string;
  active: boolean;
  createdAt: string;
}

export interface ConvenioExtras {
  workflow: ConvenioWorkflow;
  checklist: ConvenioChecklistItemDetail[];
  documents: ConvenioDocumentRecord[];
  alerts: ConvenioAlert[];
}

export interface AsignacionSummary {
  id: number;
  estado: string;
  modalidad: string;
  horasTotales: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  empresa: {
    id: number;
    nombre: string;
  };
  estudiante: {
    id: number;
    nombre: string;
    apellido: string;
  };
}

export interface AsignacionDetail {
  id: number;
  estado: string;
  modalidad: string;
  horasTotales: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  empresa: {
    id: number;
    nombre: string;
  };
  convenio: {
    id: number;
    titulo: string;
  };
  estudiante: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  tutorAcademico: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  tutorProfesional: {
    id: number;
    nombre: string;
    email: string | null;
  } | null;
}

export interface AsignacionPayload {
  estudianteId: number;
  empresaId: number;
  convenioId: number;
  tutorAcademicoId: number;
  tutorProfesionalId?: number | null;
  fechaInicio: string;
  fechaFin?: string | null;
  modalidad: string;
  horasTotales?: number | null;
  estado: string;
}

export interface TutorAcademicoSummary {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  departamento: string | null;
  especialidad: string | null;
  activo: boolean;
}

export interface TutorProfesionalSummary {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  activo: boolean;
  empresa: {
    id: number;
    nombre: string;
  };
}

export interface ApiCollections {
  empresas: EmpresaSummary[];
  estudiantes: EstudianteSummary[];
  convenios: ConvenioSummary[];
  asignaciones: AsignacionSummary[];
}

export type EmpresaSolicitudEstado = 'pendiente' | 'email_verificado' | 'aprobada' | 'rechazada';

export interface EmpresaSolicitudSummary {
  id: number;
  nombreEmpresa: string;
  cif: string | null;
  sector: string | null;
  ciudad: string | null;
  web: string | null;
  contacto: {
    nombre: string;
    email: string;
    telefono: string | null;
  };
  estado: EmpresaSolicitudEstado;
  creadaEn: string;
  emailVerificadoEn: string | null;
  aprobadoEn: string | null;
  motivoRechazo: string | null;
}
