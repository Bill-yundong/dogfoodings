import React from 'react';
import { classNames } from '@/utils/formatters';

interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  className?: string;
  rowClassName?: string | ((row: T) => string);
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  loading = false,
  emptyText = '暂无数据',
  className = '',
  rowClassName = '',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={classNames('overflow-x-auto wms-scrollbar', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-wms-border">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={classNames(
                  'px-4 py-3 text-left text-xs font-medium text-wms-subtext uppercase tracking-wider',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.width && `w-${col.width}`
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-wms-border/50">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-wms-subtext">
                  <div className="w-4 h-4 border-2 border-wms-primary border-t-transparent rounded-full animate-spin" />
                  加载中...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-wms-subtext">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={classNames(
                  'transition-colors hover:bg-wms-bg/50',
                  onRowClick && 'cursor-pointer',
                  typeof rowClassName === 'function' ? rowClassName(row) : rowClassName
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={classNames(
                      'px-4 py-3 text-sm text-wms-text',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : (row[col.key as keyof T] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
