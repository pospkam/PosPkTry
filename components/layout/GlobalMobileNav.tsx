'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Compass, Map, Sparkles, ShieldAlert, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const NAV = [
  { icon: House,      label: 'Главная',    href: '/'             },
  { icon: Compass,    label: 'Места',      href: '/routes?kind=place' },
  { icon: Map,        label: 'Карта',      href: '/map'          },
  { icon: Sparkles,   label: 'Хаб',        href: '/kuzmich/hub'  },
  { icon: ShieldAlert, label: 'SOS',       href: '/safety'       },
];

export function GlobalMobileNav() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

  // Hide on map page
  if (pathname === '/map') return null;

  return (
    <nav
      className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl"
    >
      {NAV.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href.split('?')[0]);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
              isActive 
                ? 'bg-[var(--accent)] text-white' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            {isActive && <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>}
          </Link>
        );
      })}

      <div className="w-px h-4 bg-[var(--border)] mx-1" />

      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-10 h-10 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        aria-label={isDark ? 'Светлая тема' : 'Темная тема'}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </nav>
  );
}
