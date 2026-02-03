'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Home, Mountain, Calendar, CalendarDays, DollarSign, Users, FileText, Settings, User, Link2, LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/hub/operator', icon: Home },
  { name: 'Мои туры', path: '/hub/operator/tours', icon: Mountain },
  { name: 'Бронирования', path: '/hub/operator/bookings', icon: Calendar },
  { name: 'Календарь', path: '/hub/operator/calendar', icon: CalendarDays },
  { name: 'Финансы', path: '/hub/operator/finance', icon: DollarSign },
  { name: 'Клиенты', path: '/hub/operator/clients', icon: Users },
  { name: 'Интеграции', path: '/hub/operator/integrations', icon: Link2 },
  { name: 'Отчёты', path: '/hub/operator/reports', icon: FileText },
];

export function OperatorNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/5 border-b border-white/10 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/hub/operator" className="text-2xl font-black text-premium-gold">
            Operator Panel
          </Link>

          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path ||
                (item.path !== '/hub/operator' && pathname?.startsWith(item.path));
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

          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Настройки
            </button>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <User className="w-6 h-6 text-white/70" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}



