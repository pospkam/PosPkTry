'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TransferOperatorMetricsGrid } from '@/components/transfer-operator/Dashboard/TransferOperatorMetricsGrid';
import { Bus, UserPlus, ClipboardList, BarChart3 } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Добавить транспорт', href: '/hub/transfer-operator/vehicles', icon: Bus },
  { label: 'Добавить водителя', href: '/hub/transfer-operator/drivers', icon: UserPlus },
  { label: 'Создать трансфер', href: '/hub/transfer-operator/transfers', icon: Bus },
  { label: 'Заявки', href: '/hub/transfer-operator/requests', icon: ClipboardList },
];

export default function TransferOperatorDashboardClient() {
  const router = useRouter();
  const [period, setPeriod] = useState('30');

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Панель транспортного оператора</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--text-muted)]">Период:</span>
          <select
            value={period} onChange={e => setPeriod(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="7">7 дней</option>
            <option value="30">30 дней</option>
            <option value="90">90 дней</option>
            <option value="365">Год</option>
          </select>
        </div>
      </div>

      {/* Metrics */}
      <TransferOperatorMetricsGrid period={period} />

      {/* Quick Actions */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Быстрые действия</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <button key={action.href}
                onClick={() => router.push(action.href)}
                className="flex flex-col items-center gap-2 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors text-center">
                <Icon className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-secondary)]">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
