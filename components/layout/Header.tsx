'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Moon, UserCircle, ShoppingCart } from 'lucide-react';
import { useScrollY } from '@/hooks/useScrollY';
import { useTheme } from '@/contexts/ThemeContext';
import { useCart } from '@/contexts/CartContext';
import Logo from '@/components/shared/Logo';

const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

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
        padding: '12px 16px',
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
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
      }} className="hidden md:flex">
        {[
          { href: '/marketplace/tours', label: 'Туры' },
          { href: '/routes',            label: 'Маршруты' },
          { href: '/map',               label: 'Карта' },
          { href: '/operators',         label: 'Операторы' },
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

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Cart */}
        <Link
          href="/hub/tourist/cart"
          aria-label="Корзина"
          style={{
            position: 'relative',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          <ShoppingCart size={18} />
          {count > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '16px',
              height: '16px',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}>
              {count}
            </span>
          )}
        </Link>

        {/* User / ЛК */}
        <Link
          href="/profile"
          aria-label="Личный кабинет"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          <UserCircle size={18} />
        </Link>
      </div>
    </header>
  );
}
