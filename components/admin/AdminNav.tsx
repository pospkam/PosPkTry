'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { BarChart3, Users, Mountain, Handshake, MessageCircle, Banknote, Settings, User, LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/hub/admin', icon: BarChart3 },
  { name: 'Пользователи', path: '/hub/admin/users', icon: Users },
  { name: 'Туры', path: '/hub/admin/content/tours', icon: Mountain },
  { name: 'Партнёры', path: '/hub/admin/content/partners', icon: Handshake },
  { name: 'Отзывы', path: '/hub/admin/content/reviews', icon: MessageCircle },
  { name: 'Финансы', path: '/hub/admin/finance', icon: Banknote },
  { name: 'Настройки', path: '/hub/admin/settings', icon: Settings },
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
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={clsx(
                    'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2',
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

          {/* User Menu */}
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


