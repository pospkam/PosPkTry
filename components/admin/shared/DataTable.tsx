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
      const aValue = (a as any)[sortKey];
      const bValue = (b as any)[sortKey];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  if (loading) {
    return (
      <div className={clsx('bg-white/5 border border-white/10 rounded-2xl overflow-hidden', className)}>
        <div className="animate-pulse">
          <div className="h-12 bg-white/5 border-b border-white/10"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 border-b border-white/5"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={clsx(
        'bg-white/5 border border-white/10 rounded-2xl p-12 text-center',
        className
      )}>
        <p className="text-white/70">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={clsx(
      'bg-white/5 border border-white/10 rounded-2xl overflow-hidden',
      className
    )}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key, column.sortable)}
                  className={clsx(
                    'px-6 py-4 text-left text-sm font-bold text-white/90',
                    column.sortable && 'cursor-pointer hover:bg-white/5 transition-colors',
                    column.width
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.header}</span>
                    {column.sortable && sortKey === column.key && (
                      <span className="text-premium-gold">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={clsx(
                  'border-b border-white/5',
                  onRowClick && 'cursor-pointer hover:bg-white/5 transition-colors',
                  index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                )}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-white/80">
                    {column.render
                      ? column.render(item)
                      : String((item as any)[column.key] ?? '-')}
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

