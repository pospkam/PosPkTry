'use client';

/**
 * ThemeContext -- управление светлой/темной темой.
 *
 * Тема применяется двумя способами для совместимости:
 *   1. Атрибут data-theme="dark"|"light" на <html> -- для CSS variables
 *   2. Класс `dark` на <html> -- для Tailwind darkMode: 'class'
 *
 * Сохраняется в localStorage['kh-theme'].
 * Дефолт: dark.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  isDark: true,
});

function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kh-theme') as Theme | null;
    const initial: Theme = saved ?? 'dark';
    setTheme(initial);
    applyThemeToDOM(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyThemeToDOM(theme);
    localStorage.setItem('kh-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
