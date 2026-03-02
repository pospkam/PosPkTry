import { type ReactNode } from 'react';

type BadgeVariant = 'pending' | 'success' | 'danger' | 'info';

interface DSBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  pending: 'bg-[var(--warning)]/15 text-[var(--warning)]',
  success: 'bg-[var(--success)]/15 text-[var(--success)]',
  danger:  'bg-[var(--danger)]/15 text-[var(--danger)]',
  info:    'bg-[var(--accent-muted)] text-[var(--accent)]',
};

/**
 * DSBadge -- бейдж статуса дизайн-системы.
 * Варианты: pending (warning), success, danger, info (accent).
 */
export function DSBadge({ variant = 'info', children, className = '' }: DSBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        rounded-full px-3 py-1
        text-xs font-medium
        ${VARIANT_CLASSES[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
