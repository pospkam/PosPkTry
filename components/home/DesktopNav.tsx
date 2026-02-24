'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { Search, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * DesktopNav — горизонтальная навигация для десктопа (>= 1024px).
 * Скрывается на мобильных устройствах через `hidden lg:flex`.
 * Glassmorphism стиль, навигационные ссылки + поиск + переключатель темы.
 */

const NAV_LINKS = [
  { href: '/', label: 'Главная' },
  { href: '/tours', label: 'Туры' },
  { href: '/search', label: 'Поиск' },
  { href: '/map', label: 'Карта' },
  { href: '/accommodations', label: 'Жильё' },
  { href: '/profile', label: 'Профиль' },
];

export function DesktopNav() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <nav
      aria-label="Десктопная навигация"
      className="hidden lg:flex items-center justify-between w-full h-16 px-8 bg-white/80 dark:bg-[#0D1B2A]/90 backdrop-blur-xl border-b border-white/20 dark:border-white/10 sticky top-0 z-50"
    >
      {/* Логотип */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-kh-accent to-kh-cyan flex items-center justify-center">
          <span className="text-white font-bold text-sm">KH</span>
        </div>
        <span className="text-lg font-bold text-kh-text dark:text-white">
          Kamchatour
        </span>
      </Link>

      {/* Ссылки навигации */}
      <div className="flex items-center gap-1">
        {NAV_LINKS.map(link => {
          const active = link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-kh-accent/10 text-kh-accent dark:bg-kh-cyan/10 dark:text-kh-cyan'
                  : 'text-kh-muted dark:text-gray-400 hover:text-kh-text dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5',
              ].join(' ')}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Поиск + тема */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative" aria-label="Поиск">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-kh-muted dark:text-gray-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск туров..."
            className="pl-9 pr-4 py-2 w-56 rounded-full bg-black/5 dark:bg-white/10 border border-transparent focus:border-kh-accent dark:focus:border-kh-cyan text-sm text-kh-text dark:text-white placeholder-kh-muted dark:placeholder-gray-500 focus:outline-none transition-all"
          />
        </form>

        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
          className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-kh-muted dark:text-gray-400 hover:text-kh-text dark:hover:text-white transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
}
