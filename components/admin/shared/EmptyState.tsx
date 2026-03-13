'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center py-12 px-6',
      'bg-[var(--bg-card)] border border-[var(--border)] rounded-lg',
      className
    )}>
      {icon && (
        <div className="mb-4">
          {typeof icon === 'string' ? <span className="text-6xl">{icon}</span> : icon}
        </div>
      )}
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{title}</h3>
      {description && (
        <p className="text-[var(--text-muted)] text-center mb-6 max-w-md">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-[var(--accent)] text-[var(--bg-card)] rounded-lg font-bold hover:opacity-90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

