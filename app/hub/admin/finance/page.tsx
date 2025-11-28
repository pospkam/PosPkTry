'use client';

import React, { useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { AdminNav } from '@/components/admin/AdminNav';
import { FinanceMetricsGrid } from '@/components/admin/Finance/FinanceMetricsGrid';
import { RevenueChart } from '@/components/admin/Finance/RevenueChart';
import { PayoutsManager } from '@/components/admin/Finance/PayoutsManager';

type TabType = 'overview' | 'payouts';

export default function AdminFinance() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState('30');

  const tabs = [
    { id: 'overview' as TabType, name: 'Обзор', icon: '📊' },
    { id: 'payouts' as TabType, name: 'Выплаты', icon: '💸' },
  ];

  return (
    <AdminProtected>
      <main className="min-h-screen bg-transparent text-white">
        <AdminNav />

        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-white">
                  Финансовое управление
                </h1>
                <p className="text-white/70 mt-1">
                  Доходы, выплаты и финансовая аналитика
                </p>
              </div>

              {/* Period selector (только для overview) */}
              {activeTab === 'overview' && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-white/70">Период:</span>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="7">7 дней</option>
                    <option value="30">30 дней</option>
                    <option value="90">90 дней</option>
                    <option value="365">Год</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/15 border-b border-white/15">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-premium-gold text-premium-black border-b-2 border-white/15'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics */}
              <FinanceMetricsGrid period={period} />

              {/* Revenue Chart */}
              <RevenueChart period={period} />
            </div>
          )}

          {activeTab === 'payouts' && (
            <PayoutsManager />
          )}
        </div>
      </main>
    </AdminProtected>
  );
}

