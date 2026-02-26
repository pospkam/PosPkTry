import { ReactNode } from 'react';

/**
 * PageWrapper -- обёртка контента страницы.
 * Устанавливает фоновый цвет, текст, min-height.
 * Добавляет нижний padding на мобильных для MobileNav (64px).
 */
export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        bg-[var(--bg-primary)] text-[var(--text-primary)]
        min-h-screen transition-colors duration-300
        pb-16 md:pb-0
      "
    >
      {children}
    </div>
  );
}
