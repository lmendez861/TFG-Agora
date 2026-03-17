import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCsvContent } from '../src/utils/csv.ts';

test('buildCsvContent serializa cabeceras y filas con BOM UTF-8', () => {
  const content = buildCsvContent([
    { empresa: 'Agora Labs', plazas: 3, activo: true },
    { empresa: 'Centro Norte', plazas: 1, activo: false },
  ]);

  assert.ok(content.startsWith('\uFEFF'));
  assert.equal(
    content,
    '\uFEFFempresa;plazas;activo\r\nAgora Labs;3;true\r\nCentro Norte;1;false',
  );
});

test('buildCsvContent escapa delimitadores, saltos de linea y comillas', () => {
  const content = buildCsvContent([
    {
      titulo: 'Convenio "Dual"',
      observaciones: 'Linea 1\nLinea 2',
      contacto: 'empresa@example.com;extra',
    },
  ]);

  assert.equal(
    content,
    '\uFEFFtitulo;observaciones;contacto\r\n"Convenio ""Dual""";"Linea 1\nLinea 2";"empresa@example.com;extra"',
  );
});

test('buildCsvContent devuelve cadena vacia si no hay filas', () => {
  assert.equal(buildCsvContent([]), '');
});
