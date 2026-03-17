import type { ApiCollections } from '../types';

export interface DashboardStat {
  label: string;
  value: string | number;
}

export interface DashboardMetric {
  label: string;
  value: number;
}

export function buildDashboardStats(collections: ApiCollections): DashboardStat[] {
  const horasPlanificadas = collections.asignaciones.reduce((total, asignacion) => {
    return total + (asignacion.horasTotales ?? 0);
  }, 0);

  return [
    { label: 'Empresas registradas', value: collections.empresas.length },
    { label: 'Estudiantes registrados', value: collections.estudiantes.length },
    { label: 'Convenios registrados', value: collections.convenios.length },
    { label: 'Asignaciones registradas', value: collections.asignaciones.length },
    { label: 'Horas totales planificadas', value: horasPlanificadas.toLocaleString('es-ES') },
  ];
}

export function buildDashboardAnalytics(collections: ApiCollections): DashboardMetric[] {
  const empresasActivas = collections.empresas.filter((empresa) => empresa.estadoColaboracion === 'activa').length;
  const estudiantesEnPracticas = collections.estudiantes.filter((estudiante) => estudiante.estado === 'en_practicas').length;
  const conveniosVigentes = collections.convenios.filter((convenio) =>
    convenio.estado.toLowerCase().includes('vig'),
  ).length;
  const asignacionesEnCurso = collections.asignaciones.filter((asignacion) =>
    asignacion.estado.toLowerCase() === 'en_curso',
  ).length;

  return [
    { label: 'Empresas registradas', value: collections.empresas.length },
    { label: 'Empresas activas', value: empresasActivas },
    { label: 'Estudiantes registrados', value: collections.estudiantes.length },
    { label: 'Estudiantes en practicas', value: estudiantesEnPracticas },
    { label: 'Convenios registrados', value: collections.convenios.length },
    { label: 'Convenios vigentes', value: conveniosVigentes },
    { label: 'Asignaciones registradas', value: collections.asignaciones.length },
    { label: 'Asignaciones en curso', value: asignacionesEnCurso },
  ];
}

export function getDashboardBaseRecordCount(collections: ApiCollections): number {
  return collections.empresas.length
    + collections.estudiantes.length
    + collections.convenios.length
    + collections.asignaciones.length;
}
