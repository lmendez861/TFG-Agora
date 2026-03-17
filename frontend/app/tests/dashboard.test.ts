import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDashboardAnalytics,
  buildDashboardStats,
  getDashboardBaseRecordCount,
} from '../src/utils/dashboard.ts';
import type { ApiCollections } from '../src/types.ts';

const collections: ApiCollections = {
  empresas: [
    {
      id: 1,
      nombre: 'Alpha',
      sector: 'Tech',
      ciudad: 'Madrid',
      estadoColaboracion: 'activa',
      conveniosActivos: 2,
      tutoresProfesionales: 1,
      contactos: 1,
      asignaciones: { total: 2, enCurso: 1 },
    },
    {
      id: 2,
      nombre: 'Beta',
      sector: 'Health',
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
      apellido: 'Lopez',
      dni: '12345678A',
      email: 'ana@example.com',
      grado: 'DAM',
      curso: '2',
      estado: 'en_practicas',
      asignaciones: { total: 1, enCurso: 1 },
    },
    {
      id: 2,
      nombre: 'Luis',
      apellido: 'Perez',
      dni: '87654321B',
      email: 'luis@example.com',
      grado: 'DAW',
      curso: '2',
      estado: 'disponible',
      asignaciones: { total: 0, enCurso: 0 },
    },
  ],
  convenios: [
    {
      id: 1,
      titulo: 'Convenio 1',
      empresa: { id: 1, nombre: 'Alpha' },
      tipo: 'curricular',
      estado: 'vigente',
      fechaInicio: '2025-01-01',
      fechaFin: null,
      asignacionesAsociadas: 1,
    },
    {
      id: 2,
      titulo: 'Convenio 2',
      empresa: { id: 2, nombre: 'Beta' },
      tipo: 'curricular',
      estado: 'borrador',
      fechaInicio: '2025-02-01',
      fechaFin: null,
      asignacionesAsociadas: 0,
    },
  ],
  asignaciones: [
    {
      id: 1,
      estado: 'en_curso',
      modalidad: 'presencial',
      horasTotales: 200,
      fechaInicio: '2025-01-10',
      fechaFin: null,
      empresa: { id: 1, nombre: 'Alpha' },
      estudiante: { id: 1, nombre: 'Ana', apellido: 'Lopez' },
    },
    {
      id: 2,
      estado: 'planificada',
      modalidad: 'remota',
      horasTotales: 100,
      fechaInicio: '2025-02-10',
      fechaFin: null,
      empresa: { id: 2, nombre: 'Beta' },
      estudiante: { id: 2, nombre: 'Luis', apellido: 'Perez' },
    },
  ],
};

test('buildDashboardStats usa totales reales de las colecciones', () => {
  assert.deepEqual(buildDashboardStats(collections), [
    { label: 'Empresas registradas', value: 2 },
    { label: 'Estudiantes registrados', value: 2 },
    { label: 'Convenios registrados', value: 2 },
    { label: 'Asignaciones registradas', value: 2 },
    { label: 'Horas totales planificadas', value: '300' },
  ]);
});

test('buildDashboardAnalytics incluye totales y estados operativos actuales', () => {
  assert.deepEqual(buildDashboardAnalytics(collections), [
    { label: 'Empresas registradas', value: 2 },
    { label: 'Empresas activas', value: 1 },
    { label: 'Estudiantes registrados', value: 2 },
    { label: 'Estudiantes en practicas', value: 1 },
    { label: 'Convenios registrados', value: 2 },
    { label: 'Convenios vigentes', value: 1 },
    { label: 'Asignaciones registradas', value: 2 },
    { label: 'Asignaciones en curso', value: 1 },
  ]);
});

test('getDashboardBaseRecordCount suma solo las colecciones base', () => {
  assert.equal(getDashboardBaseRecordCount(collections), 8);
});
