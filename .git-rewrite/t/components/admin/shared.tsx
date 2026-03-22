'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ===============================
// TYPES
// ===============================

export interface Column<T> {
  key: keyof T | 'actions';
  header?: string;
  title?: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

// ===============================
// DATA TABLE
// ===============================

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id: string }>({ columns, data, onRowClick }: DataTableProps<T>) {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--bg-card)] border-b border-[var(--border)]">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-4 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider"
              >
                {col.header || col.title || String(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`hover:bg-[var(--bg-hover)] transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                  {col.render ? col.render(item) : String(item[col.key as keyof T] || '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===============================
// PAGINATION
// ===============================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const maxVisible = 7;
  
  let visiblePages = pages;
  if (totalPages > maxVisible) {
    const start = Math.max(0, currentPage - Math.floor(maxVisible / 2) - 1);
    const end = Math.min(totalPages, start + maxVisible);
    visiblePages = pages.slice(start, end);
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="text-sm text-[var(--text-muted)]">
        Страница {currentPage} из {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              page === currentPage
                ? 'bg-[var(--accent)] text-[var(--bg-card)] shadow-lg'
                : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ===============================
// METRIC CARD
// ===============================

export interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string | React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  change?: number;
  loading?: boolean;
}

export function MetricCard({ title, value, subtitle, icon, trend, change, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 animate-pulse">
        <div className="h-4 bg-[var(--bg-hover)] rounded mb-3 w-3/4"></div>
        <div className="h-8 bg-[var(--bg-hover)] rounded mb-2 w-1/2"></div>
      </div>
    );
  }
  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[var(--text-muted)] text-sm font-medium">{title}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-[var(--text-primary)] mb-2">{value}</div>
      {subtitle && <div className="text-[var(--text-muted)] text-sm">{subtitle}</div>}
      {(trend || change !== undefined) && (
        <div className={`flex items-center gap-1 text-sm mt-3 ${trend === 'up' ? 'text-[var(--success)]' : trend === 'down' ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : trend === 'down' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          {change !== undefined && <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>}
        </div>
      )}
    </div>
  );
}

// ===============================
// SEARCH BAR
// ===============================

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
}

export function SearchBar({ placeholder = 'Поиск...', onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--accent)]" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value === '') onSearch('');
        }}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
      />
    </form>
  );
}

// ===============================
// STATUS BADGE
// ===============================

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'error' | 'info' | string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30',
    success: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30',
    inactive: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    pending: 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30',
  };

  const labels = {
    active: 'Активен',
    success: 'Верифицирован',
    inactive: 'Неактивен',
    pending: 'Ожидает',
  };

  const safeStatus = status as keyof typeof styles;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[safeStatus] || 'bg-gray-500/20 text-gray-400 border-gray-500/40'}`}>
      {labels[safeStatus as keyof typeof labels] || status}
    </span>
  );
}

// ===============================
// LOADING SPINNER
// ===============================

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin`}></div>
      {message && <p className="mt-4 text-[var(--text-muted)] font-medium">{message}</p>}
    </div>
  );
}

// EmptyState — re-export from dedicated file
export { EmptyState } from './shared/EmptyState';
export type { EmptyStateProps } from './shared/EmptyState';
