'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Check, AlertTriangle, X, Info, Clock, Circle, LucideIcon } from 'lucide-react';

export type StatusType = 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'pending' 
  | 'active' 
  | 'inactive'
  | 'prospect';

export interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string; icon: LucideIcon }> = {
  success: {
    color: 'text-[var(--success)]',
    bgColor: 'bg-[var(--success)]/15',
    label: 'Успешно',
    icon: Check
  },
  warning: {
    color: 'text-[var(--warning)]',
    bgColor: 'bg-[var(--warning)]/15',
    label: 'Внимание',
    icon: AlertTriangle
  },
  error: {
    color: 'text-[var(--danger)]',
    bgColor: 'bg-[var(--danger)]/15',
    label: 'Ошибка',
    icon: X
  },
  info: {
    color: 'text-[var(--ocean)]',
    bgColor: 'bg-[var(--ocean)]/15',
    label: 'Инфо',
    icon: Info
  },
  pending: {
    color: 'text-[var(--warning)]',
    bgColor: 'bg-[var(--warning)]/15',
    label: 'Ожидает',
    icon: Clock
  },
  active: {
    color: 'text-[var(--success)]',
    bgColor: 'bg-[var(--success)]/15',
    label: 'Активен',
    icon: Circle
  },
  inactive: {
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--bg-hover)]',
    label: 'Неактивен',
    icon: Circle
  },
  prospect: {
    color: 'text-[var(--ocean)]',
    bgColor: 'bg-[var(--ocean)]/15',
    label: 'Потенциальный',
    icon: Info
  }
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--bg-hover)]',
    label: status,
    icon: Circle
  };
  const displayLabel = label || config.label;
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        'inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold',
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className={clsx(
        'w-3 h-3',
        status === 'inactive' && 'fill-current'
      )} />
      <span>{displayLabel}</span>
    </span>
  );
}

