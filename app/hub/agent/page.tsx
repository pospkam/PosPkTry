'use client';

import React, { useState } from 'react';
import { Protected } from '@/components/Protected';
import { AgentNav } from '@/components/agent/AgentNav';
import { AgentMetricsGrid } from '@/components/agent/Dashboard/AgentMetricsGrid';
import { RecentClientsTable } from '@/components/agent/Dashboard/RecentClientsTable';
import { UpcomingBookingsTable } from '@/components/agent/Dashboard/UpcomingBookingsTable';
import { LoadingSpinner } from '@/components/admin/shared';

export default function AgentDashboard() {
  const [period, setPeriod] = useState('30');

  return (
    <Protected roles={['agent']}>
      <main className="min-h-screen bg-transparent text-white">
        <AgentNav />

        {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-white">
                  Агентская панель
                </h1>
                <p className="text-white/70 mt-1">
                  Управление клиентами, бронированиями и комиссиями
                </p>
              </div>

              {/* Period selector */}
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
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="space-y-6">
            {/* Metrics */}
            <AgentMetricsGrid period={period} />

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentClientsTable />
              <UpcomingBookingsTable />
            </div>

            {/* Quick Actions */}
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Быстрые действия</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => window.location.href = '/hub/agent/clients'}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
                >
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-sm font-semibold">Добавить клиента</p>
                </button>
                <button
                  onClick={() => window.location.href = '/hub/agent/bookings'}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
                >
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm font-semibold">Создать бронирование</p>
                </button>
                <button
                  onClick={() => window.location.href = '/hub/agent/vouchers'}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
                >
                  <div className="text-3xl mb-2">🎫</div>
                  <p className="text-sm font-semibold">Создать ваучер</p>
                </button>
                <button
                  onClick={() => window.location.href = '/hub/agent/commissions'}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
                >
                  <div className="text-3xl mb-2">💰</div>
                  <p className="text-sm font-semibold">Комиссионные</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Protected>
  );
}