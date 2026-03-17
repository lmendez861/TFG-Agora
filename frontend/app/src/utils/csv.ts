import { downloadBlobFile } from './download.ts';

export type CsvRowValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvRowValue>;

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

export function downloadCsv(filename: string, rows: CsvRow[], delimiter = ';'): void {
  const content = buildCsvContent(rows, delimiter);
  if (!content) {
    return;
  }

  downloadBlobFile(filename, new Blob([content], { type: 'text/csv;charset=utf-8;' }));
}
