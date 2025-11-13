import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  caption: string;
  columns: Array<TableColumn<T>>;
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T>({ caption, columns, data, emptyMessage = 'No hay datos disponibles.' }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="data-table__empty">
        <h3>{caption}</h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="data-table__wrapper">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`align-${column.align ?? 'left'}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const identifier = (item as { id?: string | number }).id;
            const fallbackId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `row-${Math.random().toString(36).slice(2)}`;

            return (
              <tr key={identifier ?? fallbackId}>
              {columns.map((column) => (
                <td key={column.key} className={`align-${column.align ?? 'left'}`}>
                  {column.render(item)}
                </td>
              ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
