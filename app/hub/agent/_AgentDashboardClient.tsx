'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentMetricsGrid } from '@/components/agent/Dashboard/AgentMetricsGrid';
import { RecentClientsTable } from '@/components/agent/Dashboard/RecentClientsTable';
import { UpcomingBookingsTable } from '@/components/agent/Dashboard/UpcomingBookingsTable';
import { BarChart3, Users, Calendar, Receipt } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Добавить клиента', href: '/hub/agent/clients', icon: Users },
  { label: 'Создать бронирование', href: '/hub/agent/bookings', icon: Calendar },
  { label: 'Создать ваучер', href: '/hub/agent/vouchers', icon: Receipt },
  { label: 'Комиссионные', href: '/hub/agent/commissions', icon: BarChart3 },
];

export default function AgentDashboardClient() {
  const router = useRouter();
  const [period, setPeriod] = useState('30');

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Агентская панель</h1>
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
      <AgentMetricsGrid period={period} />

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentClientsTable />
        <UpcomingBookingsTable />
      </div>

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
