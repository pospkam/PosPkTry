'use client';

import Link from 'next/link';
import { Mountain, Waves, Fish, Wind, Footprints, Zap, Sailboat } from 'lucide-react';

/**
 * CategoryChips — категории туров (iOS light theme).
 * Белые квадратные карточки с Lucide иконками и тёмными подписями.
 */

interface Category {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  href: string;
}

import React from 'react';

const CATEGORIES: Category[] = [
  { id: 'volcanoes', label: 'Вулканы',    Icon: Mountain,  href: '/tours?category=volcanoes' },
  { id: 'bears',    label: 'Медведи',    Icon: Zap,        href: '/tours?category=bears' },
  { id: 'fishing',  label: 'Рыбалка',    Icon: Fish,       href: '/tours?category=fishing' },
  { id: 'thermal',  label: 'Термы',      Icon: Waves,      href: '/tours?category=thermal' },
  { id: 'hiking',   label: 'Треккинг',   Icon: Footprints, href: '/tours?category=hiking' },
  { id: 'flights',  label: 'Вертолёт',  Icon: Wind,       href: '/tours?category=helicopter' },
  { id: 'rafting',  label: 'Рафтинг',   Icon: Sailboat,   href: '/tours?category=rafting' },
];

interface CategoryChipsProps {
  activeCategory?: string;
  onCategoryClick?: (categoryId: string) => void;
}

export function CategoryChips({ activeCategory }: CategoryChipsProps) {
  return (
    <section aria-label="Категории туров" className="pt-6 pb-2">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Категории</h2>
        <Link href="/tours" className="text-sm font-medium text-[#4A7FD4] dark:text-[#7EB3FF]">
          Все →
        </Link>
      </div>

      {/* Горизонтальный скролл */}
      <div
        className="scrollbar-hide flex overflow-x-auto gap-3 px-4 pb-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="list"
      >
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <Link
              key={cat.id}
              href={cat.href}
              role="listitem"
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex flex-col items-center justify-center gap-2 w-16 h-[72px] flex-shrink-0 rounded-2xl shadow-sm transition-all',
                isActive
                  ? 'bg-[#4A7FD4] text-white shadow-md'
                  : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200',
              ].join(' ')}
            >
              <cat.Icon
                size={22}
                strokeWidth={1.8}
                className={isActive ? 'text-white' : 'text-gray-800 dark:text-gray-100'}
              />
              <span className="text-[10px] font-medium leading-tight text-center">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
