'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { AdminNav } from '@/components/admin/AdminNav';
import { LoadingSpinner } from '@/components/admin/shared';
import { MetricsGrid } from '@/components/admin/Dashboard/MetricsGrid';
import { RecentActivities } from '@/components/admin/Dashboard/RecentActivities';
import { SimpleChart } from '@/components/admin/Dashboard/SimpleChart';
import { DashboardData } from '@/types/admin';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/dashboard?period=${period}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <Protected roles={['admin']}>
      <main className="min-h-screen bg-premium-black text-white">
        <AdminNav />
        
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-premium-gold">
                  Админ-панель
                </h1>
                <p className="text-white/70 mt-1">
                  Управление платформой KamHub
                </p>
              </div>

              {/* Period selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white/70">Период:</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
                >
                  <option value="7">7 дней</option>
                  <option value="30">30 дней</option>
                  <option value="90">90 дней</option>
                  <option value="365">Год</option>
                </select>
                <button
                  onClick={fetchDashboardData}
                  className="px-4 py-2 bg-premium-gold text-premium-black rounded-xl font-bold hover:bg-premium-gold/90 transition-colors"
                >
                  🔄 Обновить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка данных..." />
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">!</div>
              <h3 className="text-lg font-bold text-red-400 mb-2">Ошибка загрузки</h3>
              <p className="text-white/70">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="mt-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <MetricsGrid metrics={data.metrics} />

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart
                  title="Выручка по месяцам"
                  data={data.charts.revenueByMonth.map(point => ({
                    label: point.date,
                    value: point.value
                  }))}
                  type="line"
                  valueFormatter={formatCurrency}
                />

                <SimpleChart
                  title="Бронирования по категориям"
                  data={data.charts.bookingsByCategory.map(cat => ({
                    label: cat.category,
                    value: cat.value,
                    color: cat.color
                  }))}
                  type="bar"
                  valueFormatter={(v) => v.toString()}
                />
              </div>

              {/* Top Tours */}
              {data.charts.topTours.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Топ туры</h3>
                  <div className="space-y-3">
                    {data.charts.topTours.map((tour, index) => (
                      <div
                        key={tour.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 rounded-full bg-premium-gold text-premium-black flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{tour.title}</p>
                            <p className="text-sm text-white/60">
                              {tour.bookings} бронирований
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-premium-gold">
                            {formatCurrency(tour.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activities */}
              <RecentActivities activities={data.recentActivities} />

              {/* Quick Actions */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Быстрые действия</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center">
                    <div className="text-3xl mb-2"> </div>
                    <p className="text-sm font-semibold">Пользователи</p>
                  </button>
                  <button className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center">
                    <div className="text-3xl mb-2"> </div>
                    <p className="text-sm font-semibold">Туры</p>
                  </button>
                  <button className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center">
                    <div className="text-3xl mb-2"> </div>
                    <p className="text-sm font-semibold">Транзакции</p>
                  </button>
                  <button className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-center">
                    <div className="text-3xl mb-2">⚙</div>
                    <p className="text-sm font-semibold">Настройки</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}
