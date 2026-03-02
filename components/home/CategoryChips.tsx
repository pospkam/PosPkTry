'use client';

import Link from 'next/link';
import { Mountain, Waves, Fish, Wind, Footprints, Zap, Sailboat, LucideIcon } from 'lucide-react';

interface Category {
  id: string;
  label: string;
  Icon: LucideIcon;
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
    <section aria-label="Категории туров" className="pt-4 pb-2">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-[15px] font-bold text-white">Категории</h2>
        <Link href="/tours" className="text-sm font-medium text-[var(--accent)]">
          Все
        </Link>
      </div>

      <div
        className="scrollbar-hide flex overflow-x-auto gap-2.5 px-4 pb-2"
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
                'flex flex-col items-center justify-center gap-1.5 w-[66px] h-[74px] flex-shrink-0 rounded-2xl transition-all',
                isActive
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]'
                  : 'bg-white/8 border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80',
              ].join(' ')}
            >
              <cat.Icon
                size={22}
                strokeWidth={1.8}
                className={isActive ? 'text-[var(--accent)]' : 'text-white/60'}
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
