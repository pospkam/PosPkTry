'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, MapPin, Map, UserCircle, type LucideIcon } from 'lucide-react';

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
  { href: '/',        label: 'Home',  Icon: Home,     pathKey: '/' },
  { href: '/search',  label: 'Search',    Icon: Search,   pathKey: '/search' },
  { href: '/map',     label: 'Map',    Icon: MapPin,   pathKey: '/map' },
  { href: '/favorites', label: 'Favorites', Icon: Map, pathKey: '/favorites' },
  { href: '/profile', label: 'Profille',  Icon: UserCircle, pathKey: '/profile' },
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
      className="fixed bottom-0 left-0 right-0 z-50 max-w-[768px] mx-auto lg:hidden"
    >
      <div className="flex items-center justify-around h-20 bg-white/10 backdrop-blur-2xl border-t border-white/20 px-2 pb-2">
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
                  ? 'text-white'
                  : 'text-white/60',
              ].join(' ')}
            >
              <item.Icon size={26} strokeWidth={active ? 2.5 : 2} />
              <span className={['text-[11px] leading-tight', active ? 'font-bold' : 'font-medium'].join(' ')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
