'use client';

import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ArrowUp, ArrowDown, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  title?: string;
  total?: number;
  dense?: boolean;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Нет данных',
  emptyDescription,
  onRowClick,
  className,
  title,
  total,
  dense = false,
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

  const cellPx = dense ? 'px-3' : 'px-4';
  const cellPy = dense ? 'py-2' : 'py-3';
  const headerPy = dense ? 'py-2' : 'py-2.5';
  const textSize = dense ? 'text-[11px]' : 'text-xs';

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className={clsx('bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden', className)}>
        {title && (
          <div className={`${cellPx} py-3 border-b border-[var(--border)]`}>
            <div className="h-4 w-32 bg-[var(--bg-hover)] rounded animate-pulse" />
          </div>
        )}
        <div className="animate-pulse">
          <div className="h-9 bg-[var(--bg-card)] border-b border-[var(--border)]" />
          {[...Array(5)].map((_, i) => (
            <div key={`skel-${i}`} className="h-10 bg-[var(--bg-card)] border-b border-[var(--border)]">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-3 w-20 bg-[var(--bg-hover)] rounded" />
                <div className="h-3 flex-1 bg-[var(--bg-hover)] rounded" />
                <div className="h-3 w-16 bg-[var(--bg-hover)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (data.length === 0) {
    return (
      <div className={clsx('bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden', className)}>
        {title && (
          <div className={`${cellPx} py-3 border-b border-[var(--border)] flex items-center justify-between`}>
            <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
          </div>
        )}
        <div className="py-12 text-center">
          <Inbox className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2.5 opacity-40" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">{emptyMessage}</p>
          {emptyDescription && (
            <p className="text-xs text-[var(--text-muted)] mt-1">{emptyDescription}</p>
          )}
        </div>
      </div>
    );
  }

  const displayTotal = total ?? data.length;

  return (
    <div className={clsx('bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden', className)}>
      {/* Header bar */}
      {(title || total !== undefined) && (
        <div className={`${cellPx} py-3 border-b border-[var(--border)] flex items-center justify-between`}>
          {title && (
            <span className="text-xs font-semibold text-[var(--text-primary)]">{title}</span>
          )}
          <span className="text-[10px] text-[var(--text-muted)] font-mono ml-auto">
            {displayTotal} {displayTotal === 1 ? 'запись' : displayTotal < 5 ? 'записи' : 'записей'}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-[1]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={clsx(
                    cellPx, headerPy,
                    'text-[10px] uppercase tracking-[0.06em] font-semibold text-[var(--text-muted)]',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.sortable && 'cursor-pointer select-none hover:text-[var(--text-secondary)] transition-colors',
                    col.width,
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDirection === 'asc'
                        ? <ArrowUp className="w-3 h-3 text-[var(--accent)]" />
                        : <ArrowDown className="w-3 h-3 text-[var(--accent)]" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sortedData.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={clsx(
                  'transition-colors',
                  onRowClick && 'cursor-pointer',
                  'hover:bg-[var(--bg-hover)]',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      cellPx, cellPy, textSize,
                      'text-[var(--text-secondary)]',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    )}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? '-')}
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
