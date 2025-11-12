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
  icon = '📋',
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={clsx(
      'flex flex-col items-center justify-center py-12 px-6',
      'bg-white/5 border border-white/10 rounded-2xl',
      className
    )}>
      <div className="text-6xl mb-4">
        {typeof icon === 'string' ? icon : icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-white/70 text-center mb-6 max-w-md">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-premium-gold text-premium-black rounded-xl font-bold hover:bg-premium-gold/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

