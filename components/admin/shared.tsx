'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

// ===============================
// TYPES
// ===============================

export interface Column<T> {
  key: keyof T | 'actions';
  header?: string;
  title?: string;
  sortable?: boolean;
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
    <div className="backdrop-blur-xl bg-gradient-to-br from-[#2C1810]/60 to-[#1a2634]/60 rounded-2xl border border-[#CD853F]/40 overflow-hidden">
      <table className="w-full">
        <thead className="bg-[#2C1810]/40 border-b border-[#CD853F]/30">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-6 py-4 text-left text-xs font-bold text-[#E8D4B0] uppercase tracking-wider"
              >
                {col.header || col.title || String(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CD853F]/20">
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`hover:bg-[#2C1810]/40 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col, idx) => (
                <td key={idx} className="px-6 py-4 text-sm text-white/90">
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
      <div className="text-sm text-[#E8D4B0]">
        Страница {currentPage} из {totalPages}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-[#2C1810]/40 border border-[#CD853F]/40 text-[#E8D4B0] hover:bg-[#2C1810]/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              page === currentPage
                ? 'bg-gradient-to-r from-[#DC143C] to-[#FF4500] text-white shadow-lg'
                : 'bg-[#2C1810]/40 border border-[#CD853F]/40 text-[#E8D4B0] hover:bg-[#2C1810]/60'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-[#2C1810]/40 border border-[#CD853F]/40 text-[#E8D4B0] hover:bg-[#2C1810]/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
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
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#CD853F]" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value === '') onSearch('');
        }}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 bg-[#2C1810]/40 border border-[#CD853F]/40 rounded-xl text-white placeholder-[#E8D4B0]/50 focus:outline-none focus:border-[#FF4500] focus:ring-2 focus:ring-[#FF4500]/20 transition-all"
      />
    </form>
  );
}

// ===============================
// STATUS BADGE
// ===============================

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'success';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: 'bg-[#6B8E23]/20 text-[#9ACD32] border-[#6B8E23]/40',
    success: 'bg-[#6B8E23]/20 text-[#9ACD32] border-[#6B8E23]/40',
    inactive: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    pending: 'bg-[#FF4500]/20 text-[#FF6347] border-[#FF4500]/40',
  };

  const labels = {
    active: 'Активен',
    success: 'Верифицирован',
    inactive: 'Неактивен',
    pending: 'Ожидает',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ===============================
// LOADING SPINNER
// ===============================

interface LoadingSpinnerProps {
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
      <div className={`${sizeClasses[size]} border-4 border-[#CD853F]/30 border-t-[#FF4500] rounded-full animate-spin`}></div>
      {message && <p className="mt-4 text-[#E8D4B0] font-medium">{message}</p>}
    </div>
  );
}

// ===============================
// EMPTY STATE
// ===============================

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      {description && <p className="text-[#E8D4B0]/70 text-center mb-6">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-to-r from-[#DC143C] to-[#FF4500] text-white rounded-xl font-bold hover:shadow-xl hover:shadow-[#DC143C]/50 transition-all transform hover:scale-105"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
