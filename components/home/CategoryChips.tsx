'use client';

import Link from 'next/link';
import { VolcanoIcon, BearIcon, FishIcon, TwoHikersIcon, HikerIcon, HelicopterIcon, RaftingIcon } from './CustomIcons';

/**
 * CategoryChips — категории туров (iOS light theme).
 * Белые квадратные карточки с кастомными иконками и тёмными подписями.
 */

interface Category {
  id: string;
  label: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  href: string;
}

import React from 'react';

const CATEGORIES: Category[] = [
  { id: 'volcanoes', label: 'Volcanoe',    Icon: VolcanoIcon,  href: '/tours?category=volcanoes' },
  { id: 'bears',    label: 'Bears',    Icon: BearIcon,        href: '/tours?category=bears' },
  { id: 'fishing',  label: 'Fishing',    Icon: FishIcon,       href: '/tours?category=fishing' },
  { id: 'thermal',  label: 'Springm',      Icon: TwoHikersIcon,      href: '/tours?category=thermal' },
  { id: 'hiking',   label: 'Hiking',   Icon: HikerIcon, href: '/tours?category=hiking' },
  { id: 'flights',  label: 'Helicopter',  Icon: HelicopterIcon,       href: '/tours?category=helicopter' },
  { id: 'rafting',  label: 'Rafting',   Icon: RaftingIcon,   href: '/tours?category=rafting' },
];

interface CategoryChipsProps {
  activeCategory?: string;
  onCategoryClick?: (categoryId: string) => void;
}

export function CategoryChips({ activeCategory }: CategoryChipsProps) {
  return (
    <section aria-label="Категории туров" className="pt-4 pb-2 lg:py-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 lg:px-0 mb-4 lg:mb-5">
        <h2 className="text-2xl lg:text-xl font-medium text-white drop-shadow-sm lg:drop-shadow-none">Затерора</h2>
        <Link href="/tours" className="text-lg font-medium text-white/90 hover:underline flex items-center gap-1">
          Мын. <span className="text-xl">›</span>
        </Link>
      </div>

      {/* Горизонтальный скролл на мобилке, flex-wrap на десктопе */}
      <div
        className="scrollbar-hide flex overflow-x-auto lg:overflow-x-visible lg:flex-wrap gap-3 lg:gap-3 px-4 lg:px-0 pb-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="list"
      >
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id || (cat.id === 'volcanoes' && !activeCategory); // Делаем первый активным для демо
          return (
            <div key={cat.id} className="flex flex-col items-center gap-2">
              <Link
                href={cat.href}
                role="listitem"
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex flex-col items-center justify-center gap-1 w-[72px] h-[72px] lg:w-[90px] lg:h-[90px] flex-shrink-0 lg:flex-shrink rounded-[20px] transition-all',
                  isActive
                    ? 'bg-white text-black shadow-lg'
                    : 'bg-white/20 backdrop-blur-md text-black border border-white/10',
                ].join(' ')}
              >
                <cat.Icon
                  width={28}
                  height={28}
                  className="text-black"
                />
                <span className="text-[11px] font-semibold leading-tight text-center text-black">
                  {cat.label}
                </span>
              </Link>
              <span className="text-[13px] font-medium text-white drop-shadow-sm">
                {cat.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
