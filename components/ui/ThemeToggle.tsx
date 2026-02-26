'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ThemeToggle -- кнопка переключения светлой/тёмной темы.
 * Читает и пишет в localStorage['kh-theme'].
 * Lucide React иконки: Sun (тёмная -> светлая), Moon (светлая -> тёмная).
 * Touch target: min-h-[44px] min-w-[44px].
 */
export function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      className="
        min-h-[44px] min-w-[44px] p-2
        rounded-[var(--radius-md)]
        bg-[var(--bg-hover)] border border-[var(--border)]
        text-[var(--text-secondary)]
        hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]
        transition-all duration-200
        flex items-center justify-center
      "
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
