import React from 'react';

/**
 * Пример нового компонента KamButton для Kamchatour Hub
 * - TypeScript, Tailwind CSS, доступность, responsive, dark mode
 * - Экспорт default и named
 */
export interface KamButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  ariaLabel?: string;
}

export function KamButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  ariaLabel,
}: KamButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 disabled:opacity-50 transition-all"
    >
      {children}
    </button>
  );
}

export default KamButton;
