'use client';

import Image from 'next/image';
import { Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

function MoonIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeLinecap="round" />
    </svg>
  );
}

/**
 * HomeHeader — шапка главного экрана Kamchatour Hub.
 *
 * Расположение: логотип KH слева, аватар пользователя с именем справа.
 * Стилизован под glassmorphism поверх Hero-секции (без фонового блока —
 * прозрачный, чтобы показывать volcano background).
 *
 * TODO: заменить хардкоженное имя "Kuzmich" на данные из AuthContext
 */

interface HomeHeaderProps {
  /** Имя пользователя, отображается под аватаром (например, из сессии) */
  username?: string;
  /** URL аватара пользователя */
  avatarUrl?: string;
}

export function HomeHeader({
  username = 'Kuzmich',
  avatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face',
}: HomeHeaderProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-4 pt-12 pb-4 relative z-10">
      {/* Аватар + название */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg relative flex-shrink-0">
          <Image
            src={avatarUrl}
            alt={`Аватар ${username}`}
            fill
            sizes="56px"
            className="object-cover"
            priority
          />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl leading-tight drop-shadow-md">
            Kamchatour Hub
          </h1>
          <p className="text-white/80 text-sm font-medium drop-shadow">{username}</p>
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="flex items-center gap-2">
        {/* Переключатель темы */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
          className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Настройки */}
        <button
          aria-label="Настройки"
          className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
