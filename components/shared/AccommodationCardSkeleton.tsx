'use client';

import React from 'react';

/**
 * AccommodationCardSkeleton — скелетон карточки размещения (glassmorphism, a11y)
 * @returns {JSX.Element}
 * @remarks
 * - Accessibility: role="status", aria-label для skeleton-блоков, семантика для скелетонов
 * - UX: анимация pulse, адаптивность
 */
export const AccommodationCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden animate-pulse" role="status" aria-label="Загрузка карточки размещения">
      {/* Изображение skeleton */}
      <div className="h-56 w-full bg-[var(--border)]" aria-label="Загрузка изображения" />
      {/* Контент skeleton */}
      <div className="p-5">
        {/* Название */}
        <div className="h-6 bg-[var(--border)] rounded w-3/4 mb-2" aria-label="Загрузка названия" />
        <div className="h-4 bg-[var(--border)] rounded w-1/2 mb-4" aria-label="Загрузка подзаголовка" />
        {/* Описание */}
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-[var(--border)] rounded w-full" aria-label="Загрузка описания" />
          <div className="h-3 bg-[var(--border)] rounded w-5/6" aria-label="Загрузка описания" />
        </div>
        {/* Удобства */}
        <div className="flex gap-2 mb-4">
          <div className="h-6 bg-[var(--border)] rounded w-16" aria-label="Загрузка удобства" />
          <div className="h-6 bg-[var(--border)] rounded w-16" aria-label="Загрузка удобства" />
          <div className="h-6 bg-[var(--border)] rounded w-16" aria-label="Загрузка удобства" />
        </div>
        {/* Низ */}
        <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
          <div className="h-8 bg-[var(--border)] rounded w-20" aria-label="Загрузка цены" />
          <div className="h-10 bg-[var(--border)] rounded w-24" aria-label="Загрузка кнопки" />
        </div>
        {/* Кнопка */}
        <div className="h-12 bg-[var(--border)] rounded-lg w-full mt-4" aria-label="Загрузка кнопки" />
      </div>
    </div>
  );
};

// AccommodationCardSkeleton — используй именованный импорт: { AccommodationCardSkeleton }



