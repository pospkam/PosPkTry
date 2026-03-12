'use client';

import React, { useState } from 'react';
import { FinanceMetricsGrid } from '@/components/admin/Finance/FinanceMetricsGrid';
import { RevenueChart } from '@/components/admin/Finance/RevenueChart';
import { PayoutsManager } from '@/components/admin/Finance/PayoutsManager';
import { DollarSign, BarChart, Banknote } from 'lucide-react';

type TabType = 'overview' | 'payouts';

export default function AdminFinanceClient() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState('30');

  const tabs = [
    { id: 'overview' as TabType, name: 'Обзор', icon: BarChart },
    { id: 'payouts' as TabType, name: 'Выплаты', icon: Banknote },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <DollarSign className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Финансы</h1>
        </div>
        {activeTab === 'overview' && (
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="7">7 дней</option>
            <option value="30">30 дней</option>
            <option value="90">90 дней</option>
            <option value="365">Год</option>
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <FinanceMetricsGrid period={period} />
          <RevenueChart period={period} />
        </div>
      )}

      {activeTab === 'payouts' && <PayoutsManager />}
    </div>
  );
}
