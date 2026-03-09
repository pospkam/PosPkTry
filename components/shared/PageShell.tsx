'use client';

import { Sun, Moon, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import BottomNav from '@/components/shared/BottomNav';
import Link from 'next/link';

interface PageShellProps {
  title: string;
  activePath?: string;
  children: React.ReactNode;
}

export default function PageShell({ title, activePath = '/', children }: PageShellProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.15)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)", fontSize: '1.4rem', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
            KH
          </Link>
          <h1 className="text-lg font-bold text-white hidden sm:block">{title}</h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-white/70 hover:text-white transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/profile" className="text-white/70 hover:text-white transition-colors" aria-label="Личный кабинет">
              <User size={20} />
            </Link>
          </div>
        </div>
      </header>
      {children}
      <BottomNav activePath={activePath} />
    </div>
  );
}
