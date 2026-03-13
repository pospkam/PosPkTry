'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Inbox, type LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  const IconComponent = typeof icon === 'function' ? icon as LucideIcon : null;

  return (
    <div className={clsx(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 px-4' : 'py-16 px-6',
      className,
    )}>
      {/* Icon */}
      <div className={clsx(
        'rounded-lg bg-[var(--bg-hover)] flex items-center justify-center mb-4',
        compact ? 'w-10 h-10' : 'w-12 h-12',
      )}>
        {IconComponent ? (
          <IconComponent className={clsx(
            'text-[var(--text-muted)]',
            compact ? 'w-5 h-5' : 'w-6 h-6',
          )} />
        ) : icon ? (
          <>{icon}</>
        ) : (
          <Inbox className={clsx(
            'text-[var(--text-muted)]',
            compact ? 'w-5 h-5' : 'w-6 h-6',
          )} />
        )}
      </div>

      {/* Title */}
      <h3 className={clsx(
        'font-semibold text-[var(--text-primary)]',
        compact ? 'text-sm mb-1' : 'text-base mb-1.5',
      )}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={clsx(
          'text-[var(--text-muted)] max-w-xs',
          compact ? 'text-xs' : 'text-sm',
          action ? 'mb-4' : '',
        )}>
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <button
          onClick={action.onClick}
          className={clsx(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors',
            action.variant === 'secondary'
              ? 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:opacity-90',
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
