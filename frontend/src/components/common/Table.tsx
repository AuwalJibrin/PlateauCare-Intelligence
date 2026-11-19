import React from 'react';
import { TableSkeleton } from './LoadingSkeleton';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  emptySubtitle?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtitle = 'There are no items to display matching the current criteria.',
  className = '',
  onRowClick,
}: TableProps<T>): React.ReactElement {
  if (isLoading) {
    return <TableSkeleton rows={5} columns={columns.length} />;
  }

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`w-full overflow-hidden border border-slate-200/80 rounded-xl bg-white shadow-2xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-medium text-xs uppercase tracking-wider">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={`py-3.5 px-4 font-semibold select-none ${
                    alignClasses[column.align || 'left']
                  } ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                    <div className="w-12 h-12 mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
                    <p className="text-xs text-slate-500 mt-1">{emptySubtitle}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`py-3.5 px-4 text-slate-700 ${
                        alignClasses[column.align || 'left']
                      } ${column.className || ''}`}
                    >
                      {column.render
                        ? column.render(row, index)
                        : (row as Record<string, unknown>)[column.key] !== undefined
                        ? String((row as Record<string, unknown>)[column.key])
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;

