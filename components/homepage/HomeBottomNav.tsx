'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Heart, Sparkles, House } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const FO = "var(--font-outfit,'Outfit',system-ui,sans-serif)";

const NAV_ITEMS = [
  { icon: House,    label: undefined,   href: '/'                  },
  { icon: Compass,  label: 'Туры',      href: '/marketplace' },
  { icon: Sparkles, label: 'Кузьмич',   href: '/ai-assistant'      },
  { icon: Heart,    label: undefined,   href: '/profile'           },
];

export function HomeBottomNav() {
  const { isDark } = useTheme();

  return (
    <nav
      className="lg:hidden"
      style={{
        position: 'fixed',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px',
        borderRadius: '100px',
        fontFamily: FO,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 -1px 0 var(--border)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href + (item.label ?? '')}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: item.label ? '7px 16px' : '7px 12px',
              borderRadius: '100px',
              background: 'transparent',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: 500,
              transition: 'background 0.2s, color 0.2s, transform 0.15s',
            }}
            onMouseDown={(e) => { (e.currentTarget.style.transform = 'scale(0.92)'); }}
            onMouseUp={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
            onTouchStart={(e) => { (e.currentTarget.style.transform = 'scale(0.92)'); }}
            onTouchEnd={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
          >
            <Icon size={20} />
            {item.label && <span>{item.label}</span>}
          </Link>
        );
      })}

    </nav>
  );
}
