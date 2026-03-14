'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Home, Map, Shield, Bus, Menu, X, Route, Users, LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Главная',      path: '/',              icon: Home   },
  { name: 'Маршруты',     path: '/routes',         icon: Route  },
  { name: 'Карта',        path: '/map',             icon: Map    },
  { name: 'Партнёры',     path: '/operators',       icon: Users  },
  { name: 'Трансферы',    path: '/hub/transfer',   icon: Bus    },
  { name: 'Безопасность', path: '/hub/safety',     icon: Shield },
];

/**
 * PublicNav — публичная навигация Kamchatour Hub
 * Desktop (md+): полная строка со ссылками + кнопки Войти/Регистрация
 * Mobile (<md):  логотип + кнопка-гамбургер → раскрывающееся меню
 */
export function PublicNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav
      className="bg-[var(--bg-card)] border-b border-[var(--border)] sticky top-0 z-40"
      aria-label="Главная навигация"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Логотип */}
          <Link href="/" className="text-2xl font-bold text-[var(--accent)] shrink-0">
            KamHub
          </Link>

          {/* Desktop: ссылки */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.name}
                  className={clsx(
                    'px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm',
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop: кнопки auth */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm"
            >
              Войти
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 bg-[var(--accent)] hover:opacity-80 text-[var(--bg-card)] rounded-lg transition-colors text-sm font-medium"
            >
              Регистрация
            </Link>
          </div>

          {/* Mobile: гамбургер */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen
              ? <X className="w-6 h-6" aria-hidden="true" />
              : <Menu className="w-6 h-6" aria-hidden="true" />
            }
          </button>
        </div>
      </div>

      {/* Mobile: раскрывающееся меню */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <div className="space-y-1 mb-3">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--bg-card)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="flex gap-3 pt-3 border-t border-[var(--border)]">
            <Link
              href="/auth/login"
              onClick={() => setIsMenuOpen(false)}
              className="flex-1 px-4 py-2 text-center text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg transition-colors text-sm"
            >
              Войти
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setIsMenuOpen(false)}
              className="flex-1 px-4 py-2 text-center bg-[var(--accent)] hover:opacity-80 text-[var(--bg-card)] rounded-lg transition-colors text-sm font-medium"
            >
              Регистрация
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
