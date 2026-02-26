'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, MapPin, Heart, User } from 'lucide-react';

const TABS = [
  { href: '/', icon: Home, label: 'Главная' },
  { href: '/search', icon: Search, label: 'Поиск' },
  { href: '/map', icon: MapPin, label: 'Карта' },
  { href: '/tours', icon: Heart, label: 'Туры' },
  { href: '/profile', icon: User, label: 'Профиль' },
] as const;

/**
 * MobileNav -- фиксированная нижняя навигация, видна только на мобильных.
 * Скрывается на md+ через md:hidden.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        md:hidden
        backdrop-blur-md bg-[var(--bg-secondary)]/90
        border-t border-[var(--border)]
        h-16
      "
    >
      <div className="flex items-center justify-around h-full px-2">
        {TABS.map(tab => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center justify-center gap-0.5
                min-h-[44px] min-w-[44px] px-2 py-1
                rounded-[var(--radius-sm)]
                text-xs transition-colors duration-200
                ${isActive
                  ? 'text-lava'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }
              `}
            >
              <Icon className="w-6 h-6" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
