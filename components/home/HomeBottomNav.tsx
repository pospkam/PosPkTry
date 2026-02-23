'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, MapPin, BookOpen, User, type LucideIcon } from 'lucide-react';

/**
 * HomeBottomNav — плавающая pill-навигация (iOS light theme).
 * Rounded pill, frosted glass, fixed bottom-4.
 */

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  pathKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',        label: 'Главная',  Icon: Home,     pathKey: '/' },
  { href: '/search',  label: 'Поиск',    Icon: Search,   pathKey: '/search' },
  { href: '/map',     label: 'Карта',    Icon: MapPin,   pathKey: '/map' },
  { href: '/tours',   label: 'Туры',     Icon: BookOpen, pathKey: '/tours' },
  { href: '/profile', label: 'Профиль',  Icon: User,     pathKey: '/profile' },
];

export function HomeBottomNav() {
  const pathname = usePathname();

  const isActive = (item: NavItem): boolean => {
    if (item.pathKey === '/') return pathname === '/';
    return pathname.startsWith(item.pathKey);
  };

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed bottom-4 left-4 right-4 z-50 max-w-[720px] mx-auto"
    >
      <div className="flex items-center justify-around h-16 bg-[#8B9AC0]/50 dark:bg-[#0D1B2A]/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-black/15 dark:shadow-black/40 border border-white/20 dark:border-white/10 px-2">
        {NAV_ITEMS.map(item => {
          const active = isActive(item);
          return (
            <Link
              key={item.pathKey}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                active
                  ? 'text-white dark:text-[#7EB3FF]'
                  : 'text-white/50 dark:text-gray-500',
              ].join(' ')}
            >
              <item.Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
              <span className={['text-[10px] leading-tight', active ? 'font-semibold' : 'font-normal'].join(' ')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
