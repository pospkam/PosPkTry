import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface DSButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
  `,
  secondary: `
    border border-[var(--border-strong)] text-[var(--text-primary)]
    hover:bg-[var(--bg-hover)] bg-transparent
  `,
  danger: `
    bg-[var(--danger)] hover:opacity-90 text-white
  `,
  ghost: `
    text-[var(--text-secondary)] hover:text-[var(--text-primary)]
    hover:bg-[var(--bg-hover)] bg-transparent
  `,
};

/**
 * DSButton -- кнопка дизайн-системы с 4 вариантами.
 * Touch target: min-h-[44px], закруглённая на var(--radius-md).
 */
export function DSButton({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: DSButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        min-h-[44px] px-4
        rounded-[var(--radius-md)]
        text-sm font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
