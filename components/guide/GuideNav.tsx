'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Home, Calendar, Users, DollarSign, User, Star, LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/hub/guide', icon: Home },
  { name: 'Расписание', path: '/hub/guide/schedule', icon: Calendar },
  { name: 'Мои группы', path: '/hub/guide/groups', icon: Users },
  { name: 'Заработок', path: '/hub/guide/earnings', icon: DollarSign },
  { name: 'Отзывы', path: '/hub/guide/reviews', icon: Star },
  { name: 'Профиль', path: '/hub/guide/profile', icon: User },
];

export function GuideNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/5 border-b border-white/10 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/hub/guide" className="text-2xl font-black text-premium-gold">
            Кабинет гида
          </Link>

          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path ||
                (item.path !== '/hub/guide' && pathname?.startsWith(item.path));
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

          <div className="flex items-center">
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <User className="w-6 h-6 text-white/70" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
