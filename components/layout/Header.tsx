'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Moon, UserCircle, ShoppingCart } from 'lucide-react';
import { useScrollY } from '@/hooks/useScrollY';
import { useTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';
import { GeoToggle } from '@/components/geo/GeoToggle';
import Logo from '@/components/shared/Logo';

const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

/* Shared style for 32px round icon buttons */
const iconBtn: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'color 0.2s, background 0.2s',
  flexShrink: 0,
};

export function Header() {
  const scrollY = useScrollY();
  const scrolled = scrollY > 60;
  const { isDark, toggleTheme } = useTheme();
  const { count } = useCart();

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 12px 10px',
        fontFamily: FO,
        transition: 'background 0.3s, box-shadow 0.3s',
        background: scrolled ? 'var(--bg-card)' : 'transparent',
        boxShadow: scrolled ? '0 1px 0 var(--border)' : 'none',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        aria-label="KamchatourHub"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <Logo size={24} />
      </Link>

      {/* Center nav — desktop only */}
      <nav style={{
        alignItems: 'center',
        gap: '4px',
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
      }} className="hidden lg:flex">
        {[
          { href: '/marketplace', label: 'Туры' },
          { href: '/hub/fishing', label: 'Рыбалка' },
          { href: '/routes',      label: 'Маршруты' },
          { href: '/collections', label: 'Подборки' },
          { href: '/map',         label: 'Карта' },
          { href: '/operators',   label: 'Операторы' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontFamily: FO,
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.2s, background 0.2s',
            }}
            className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Right side — icon buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {/* Я на Камчатке */}
        <GeoToggle />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
          style={iconBtn}
          className="hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Cart */}
        <Link
          href="/cart"
          aria-label="Корзина"
          style={{ ...iconBtn, position: 'relative' }}
          className="hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <ShoppingCart size={18} />
          {count > 0 && (
            <span style={{
              position: 'absolute',
              top: '0px',
              right: '0px',
              minWidth: '14px',
              height: '14px',
              borderRadius: '7px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
              lineHeight: 1,
            }}>
              {count}
            </span>
          )}
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          aria-label="Личный кабинет"
          style={iconBtn}
          className="hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <UserCircle size={18} />
        </Link>
      </div>
    </header>
  );
}
