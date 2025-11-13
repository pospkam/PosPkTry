'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

interface NavItem {
  name: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/hub/admin', icon: '' },
  { name: 'Пользователи', path: '/hub/admin/users', icon: '' },
  { name: 'Туры', path: '/hub/admin/content/tours', icon: '' },
  { name: 'Партнёры', path: '/hub/admin/content/partners', icon: '' },
  { name: 'Отзывы', path: '/hub/admin/content/reviews', icon: '' },
  { name: 'Финансы', path: '/hub/admin/finance', icon: '' },
  { name: 'Настройки', path: '/hub/admin/settings', icon: '' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/5 border-b border-white/10 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/hub/admin" className="text-2xl font-black text-premium-gold">
            Admin Panel
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-medium transition-all duration-200',
                    isActive
                      ? 'bg-premium-gold text-premium-black'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <span className="text-2xl">👤</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}


