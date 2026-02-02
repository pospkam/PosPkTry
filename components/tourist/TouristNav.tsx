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
    <nav className="bg-white/5 border-b border-white/10 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/hub/tourist" className="text-2xl font-black text-premium-gold">
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
                      ? 'bg-premium-gold text-premium-black'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
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
              href="/tours" 
              className="px-4 py-2 bg-premium-gold/20 hover:bg-premium-gold/30 text-premium-gold rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Найти тур
            </Link>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <User className="w-6 h-6 text-white/70" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
