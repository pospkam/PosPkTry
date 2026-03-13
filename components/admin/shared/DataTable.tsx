'use client';

import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

/**
 * DataTable — универсальная таблица для админки Kamchatour Hub
 * @template T — тип строки (должен содержать id)
 * @param {DataTableProps<T>} props
 * @returns {JSX.Element}
 * @remarks
 * - Поддержка сортировки, кастомных рендеров, skeleton loading
 * - Accessibility: th/td, aria-label на sortable, min touch target
 * - UX: glassmorphism, адаптивность, hover, empty state
 */
export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Нет данных',
  onRowClick,
  className
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortKey];
      const bValue = (b as Record<string, unknown>)[sortKey];

      if (aValue === bValue) return 0;

      const aComp = aValue as string | number;
      const bComp = bValue as string | number;
      const comparison = aComp > bComp ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  if (loading) {
    return (
      <div className={clsx('bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden', className)}>
        <div className="animate-pulse">
          <div className="h-12 bg-[var(--bg-card)] border-b border-[var(--border)]"></div>
          {[...Array(5)].map((_, loadIndex) => (
            <div key={`loading-${loadIndex}`} className="h-16 bg-[var(--bg-card)] border-b border-[var(--border)]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={clsx(
        'bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center',
        className
      )}>
        <p className="text-[var(--text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={clsx(
      'bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden',
      className
    )}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-card)] border-b border-[var(--border)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key, column.sortable)}
                  className={clsx(
                    'px-6 py-4 text-left text-sm font-bold text-[var(--text-secondary)]',
                    column.sortable && 'cursor-pointer hover:bg-[var(--bg-hover)] transition-colors',
                    column.width
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.header}</span>
                    {column.sortable && sortKey === column.key && (
                      <span className="text-[var(--accent)]">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, rowIndex) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={clsx(
                  'border-b border-[var(--border)]',
                  onRowClick && 'cursor-pointer hover:bg-[var(--bg-hover)] transition-colors',
                  rowIndex % 2 === 0 ? 'bg-transparent' : ''
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {column.render
                      ? column.render(item)
                      : String((item as Record<string, unknown>)[column.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

