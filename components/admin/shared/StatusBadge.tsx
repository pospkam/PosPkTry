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
  | 'inactive';

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { color: string; bgColor: string; label: string; icon: LucideIcon }> = {
  success: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Успешно',
    icon: Check
  },
  warning: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Внимание',
    icon: AlertTriangle
  },
  error: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Ошибка',
    icon: X
  },
  info: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Инфо',
    icon: Info
  },
  pending: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Ожидает',
    icon: Clock
  },
  active: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Активен',
    icon: Circle
  },
  inactive: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Неактивен',
    icon: Circle
  }
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
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

