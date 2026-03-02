import { type HTMLAttributes, type ReactNode } from 'react';

interface DSCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * DSCard -- карточка дизайн-системы.
 * Фон, рамка, тень, ховер -- всё через CSS variables.
 */
export function DSCard({ className = '', children, ...rest }: DSCardProps) {
  return (
    <div
      className={`
        bg-[var(--bg-card)] border border-[var(--border)]
        rounded-[var(--radius-lg)]
        shadow-[var(--shadow-sm)]
        hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]
        transition-all duration-200
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}
