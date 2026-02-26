'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Mountain, AlertTriangle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const NAV_LINKS = [
  { href: '/tours', label: 'Туры' },
  { href: '/search', label: 'Поиск' },
  { href: '/safety', label: 'Безопасность' },
  { href: '/eco', label: 'Экология' },
  { href: '/ai-assistant', label: 'AI' },
] as const;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg-secondary)]/80 border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Mountain className="w-6 h-6 text-[var(--accent)]" />
          <span className="font-bold text-[var(--text-primary)] text-lg hidden sm:inline">
            Kamchatour Hub
          </span>
          <span className="font-bold text-[var(--text-primary)] text-lg sm:hidden">
            KH
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="
                px-3 py-2 rounded-[var(--radius-md)]
                text-sm text-[var(--text-secondary)]
                hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]
                transition-colors duration-200
              "
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* SOS */}
          <Link
            href="/safety"
            className="
              bg-[var(--danger)] text-white
              rounded-full px-4 py-2 text-sm font-bold
              min-h-[44px] flex items-center gap-1.5
              hover:opacity-90 transition-opacity
            "
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">SOS</span>
          </Link>

          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            className="
              md:hidden min-h-[44px] min-w-[44px] p-2
              rounded-[var(--radius-md)]
              text-[var(--text-secondary)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-hover)] transition-colors
              flex items-center justify-center
            "
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <nav className="md:hidden border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 space-y-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="
                block px-3 py-3 rounded-[var(--radius-md)]
                text-[var(--text-primary)] text-base
                hover:bg-[var(--bg-hover)] transition-colors
                min-h-[44px] flex items-center
              "
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/hub/tourist"
            onClick={() => setMenuOpen(false)}
            className="
              block px-3 py-3 rounded-[var(--radius-md)]
              text-[var(--accent)] text-base font-medium
              hover:bg-[var(--accent-muted)] transition-colors
              min-h-[44px] flex items-center
            "
          >
            Личный кабинет
          </Link>
        </nav>
      )}
    </header>
  );
}
