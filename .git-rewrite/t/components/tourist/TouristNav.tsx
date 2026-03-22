'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Home, Calendar, Heart, Star, User, MapPin, LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Главная', path: '/hub/tourist', icon: Home },
  { name: 'Мои бронирования', path: '/hub/tourist/bookings', icon: Calendar },
  { name: 'Избранное', path: '/hub/tourist/favorites', icon: Heart },
  { name: 'Мои отзывы', path: '/hub/tourist/reviews', icon: Star },
  { name: 'Профиль', path: '/hub/tourist/profile', icon: User },
];

export function TouristNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/hub/tourist" className="text-2xl font-bold text-[var(--accent)]">
            Мой кабинет
          </Link>

          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path || 
                (item.path !== '/hub/tourist' && pathname?.startsWith(item.path));
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm',
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/routes"
              className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--accent)] rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Найти тур
            </Link>
            <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
              <User className="w-6 h-6 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
