'use client';

import React, { useState } from 'react';
import { Protected } from '@/components/Protected';
import { TransferOperatorNav } from '@/components/transfer-operator/TransferOperatorNav';
import { TransferOperatorMetricsGrid } from '@/components/transfer-operator/Dashboard/TransferOperatorMetricsGrid';
import { LoadingSpinner } from '@/components/admin/shared';
import { Bus, UserPlus, ClipboardList } from 'lucide-react';

export default function TransferOperatorDashboardClient() {
  const [period, setPeriod] = useState('30');

  return (
    <Protected roles={['transfer', 'operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <TransferOperatorNav />

      {/* Header */}
        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-black text-white">
                  Панель транспортного оператора
                </h1>
                <p className="text-white/70 mt-1">
                  Управление транспортом, водителями и трансферами
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
            <TransferOperatorMetricsGrid period={period} />

            {/* Quick Actions */}
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Быстрые действия</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => window.location.href = '/hub/transfer-operator/vehicles'}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
                >
                  <Bus className="w-8 h-8 mb-2" />
                  <p className="text-sm font-semibold">Добавить транспорт</p>
                </button>
              <button
                  onClick={() => window.location.href = '/hub/transfer-operator/drivers'}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
                >
                  <UserPlus className="w-8 h-8 mb-2" />
                  <p className="text-sm font-semibold">Добавить водителя</p>
              </button>
                <button
                  onClick={() => window.location.href = '/hub/transfer-operator/transfers'}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
                >
                  <Bus className="w-8 h-8 mb-2" />
                  <p className="text-sm font-semibold">Создать трансфер</p>
                        </button>
                <button
                  onClick={() => window.location.href = '/hub/transfer-operator/requests'}
                  className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center"
                >
                  <ClipboardList className="w-8 h-8 mb-2" />
                  <p className="text-sm font-semibold">Заявки</p>
                        </button>
                      </div>
              </div>
            </div>
          </div>
      </main>
    </Protected>
  );
}