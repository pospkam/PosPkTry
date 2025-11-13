'use client';

import React from 'react';
import { clsx } from 'clsx';

export type StatusType = 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'pending' 
  | 'active' 
  | 'inactive';

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { color: string; bgColor: string; label: string; icon: string }> = {
  success: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Успешно',
    icon: '✓'
  },
  warning: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Внимание',
    icon: '⚠'
  },
  error: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Ошибка',
    icon: '✕'
  },
  info: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Инфо',
    icon: 'ℹ'
  },
  pending: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Ожидает',
    icon: '⏱'
  },
  active: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Активен',
    icon: '●'
  },
  inactive: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Неактивен',
    icon: '○'
  }
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  return (
    <span
      className={clsx(
        'inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold',
        config.bgColor,
        config.color,
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{displayLabel}</span>
    </span>
  );
}

