'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Moon, UserCircle } from 'lucide-react';
import { useScrollY } from '@/hooks/useScrollY';
import { useTheme } from '@/contexts/ThemeContext';
import Logo from '@/components/shared/Logo';

const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

export function Header() {
  const scrollY = useScrollY();
  const scrolled = scrollY > 60;
  const { isDark, toggleTheme } = useTheme();

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
        transition: 'background 0.3s, backdrop-filter 0.3s, box-shadow 0.3s',
        background: scrolled ? 'var(--kh-header-bg)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        boxShadow: scrolled ? '0 1px 0 var(--kh-border)' : 'none',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        aria-label="KamchatourHub"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--kh-text)',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <Logo size={24} />
      </Link>

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
            color: 'var(--kh-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User / ЛК */}
        <Link
          href="/profile"
          aria-label="Личный кабинет"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--kh-surface)',
            border: '1px solid var(--kh-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--kh-text-dim)',
            textDecoration: 'none',
          }}
        >
          <UserCircle size={18} />
        </Link>
      </div>
    </header>
  );
}
