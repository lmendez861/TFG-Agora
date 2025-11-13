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

export interface ApiCollections {
  empresas: EmpresaSummary[];
  estudiantes: EstudianteSummary[];
  convenios: ConvenioSummary[];
  asignaciones: AsignacionSummary[];
}
