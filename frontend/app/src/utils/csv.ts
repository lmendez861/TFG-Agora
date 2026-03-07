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

export function downloadCsv(filename: string, rows: CsvRow[], delimiter = ';'): void {
  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map((header) => escapeCell(header, delimiter)).join(delimiter),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header], delimiter)).join(delimiter)),
  ];

  const content = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
