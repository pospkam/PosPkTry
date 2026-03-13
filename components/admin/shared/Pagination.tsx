'use client';

import React from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Всегда показываем первую страницу
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    // Показываем страницы вокруг текущей
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    // Всегда показываем последнюю страницу
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <div className="text-sm text-[var(--text-muted)]">
        Страница {currentPage} из {totalPages}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1',
            currentPage === 1
              ? 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          )}
        >
          <ChevronLeft className="w-4 h-4" /> Назад
        </button>

        <div className="flex items-center space-x-1">
          {getPageNumbers().map((page, pageIndex) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${pageIndex}`} className="px-3 py-2 text-[var(--text-muted)]">
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  currentPage === page
                    ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1',
            currentPage === totalPages
              ? 'bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          )}
        >
          Вперёд <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

