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
      className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-ocean text-white font-semibold shadow-md hover:bg-ocean/80 focus:outline-none focus:ring-2 focus:ring-ocean/40 disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}

export default KamButton;
