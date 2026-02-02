'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Home, Map, Car, Tent, Shield, Gift, Hotel, Bus, LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Главная', path: '/', icon: Home },
  { name: 'Туры', path: '/hub/tours', icon: Map },
  { name: 'Трансферы', path: '/hub/transfer', icon: Bus },
  { name: 'Авто', path: '/hub/cars', icon: Car },
  { name: 'Снаряжение', path: '/hub/gear', icon: Tent },
  { name: 'Жильё', path: '/hub/stay', icon: Hotel },
  { name: 'Сувениры', path: '/hub/souvenirs', icon: Gift },
  { name: 'Безопасность', path: '/hub/safety', icon: Shield },
];

export function PublicNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/5 border-b border-white/10 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-black text-premium-gold">
            KamHub
          </Link>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={clsx(
                    'px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm',
                    isActive
                      ? 'bg-premium-gold text-premium-black'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/auth/login" 
              className="px-4 py-2 text-white/70 hover:text-white transition-colors text-sm"
            >
              Войти
            </Link>
            <Link 
              href="/auth/register" 
              className="px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black rounded-lg transition-colors text-sm font-medium"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
