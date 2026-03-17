import assert from 'node:assert/strict';
import test from 'node:test';
import { getCsvExportPath } from '../src/services/api.ts';

test('getCsvExportPath resuelve la ruta base de una exportacion CSV', () => {
  assert.equal(getCsvExportPath('empresas'), '/export/empresas.csv');
  assert.equal(getCsvExportPath('solicitudes-empresa'), '/export/empresa-solicitudes.csv');
});

test('getCsvExportPath serializa filtros booleanos y numericos', () => {
  assert.equal(
    getCsvExportPath('tutores-profesionales', {
      activo: true,
      empresaId: 3,
      ignorar: undefined,
      vacio: '',
    }),
    '/export/tutores-profesionales.csv?activo=true&empresaId=3',
  );
});
