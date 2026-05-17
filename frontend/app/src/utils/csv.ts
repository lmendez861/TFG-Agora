/**
 * Comentario de mantenimiento Agora.
 * Proposito: Utilidad de frontend: contiene transformaciones puras compartidas por componentes y tests.
 * Relaciones: Conecta con modulos locales: ./download.ts.
 */
import { downloadBlobFile } from './download.ts';

export type CsvRowValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvRowValue>;

/**
 * Resume la responsabilidad de escapeCell dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function escapeCell(value: CsvRowValue, delimiter: string): string {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  const normalized = String(value);
  if (
    normalized.includes('"')
    || normalized.includes('\n')
    || normalized.includes('\r')
    || normalized.includes(delimiter)
  ) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

/**
 * Construye una estructura derivada que sera enviada a otra capa del sistema.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function buildCsvContent(rows: CsvRow[], delimiter = ';'): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map((header) => escapeCell(header, delimiter)).join(delimiter),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header], delimiter)).join(delimiter)),
  ];

  return `\uFEFF${lines.join('\r\n')}`;
}

/**
 * Resume la responsabilidad de downloadCsv dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function downloadCsv(filename: string, rows: CsvRow[], delimiter = ';'): void {
  const content = buildCsvContent(rows, delimiter);
  if (!content) {
    return;
  }

  downloadBlobFile(filename, new Blob([content], { type: 'text/csv;charset=utf-8;' }));
}
