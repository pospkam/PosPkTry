'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface DailyRevenue {
  date: string;
  transactions: number;
  revenue: number;
}

interface RevenueChartProps {
  period?: string;
  type?: string;
}

export function RevenueChart({ period = '30', type = 'all' }: RevenueChartProps) {
  const [dailyData, setDailyData] = useState<DailyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRevenueData();
  }, [period, type]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period, type });
      const response = await fetch(`/api/admin/finance?${params}`);
      const result = await response.json();

      if (result.success) {
        setDailyData(result.data.dailyRevenue);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner message="Загрузка данных о доходах..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--danger)]/8 border border-[var(--danger)]/15 rounded-lg p-6 text-center">
        <p className="text-[var(--danger)] text-sm mb-4">Ошибка загрузки данных</p>
        <button
          onClick={fetchRevenueData}
          className="px-4 py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/15 text-[var(--danger)] text-xs font-medium rounded-lg transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  // Простая визуализация без внешних библиотек
  const maxRevenue = Math.max(...dailyData.map(d => d.revenue));
  const maxTransactions = Math.max(...dailyData.map(d => d.transactions));

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-6">Динамика доходов</h3>

      {dailyData.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-muted)] mb-4">Нет данных за выбранный период</p>
          <button
            onClick={fetchRevenueData}
            className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg transition-colors"
          >
            Обновить
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Легенда */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[var(--accent)] rounded"></div>
              <span className="text-[var(--text-muted)]">Доход (₽)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[var(--ocean)] rounded"></div>
              <span className="text-[var(--text-muted)]">Транзакции</span>
            </div>
          </div>

          {/* График */}
          <div className="relative">
            <div className="flex items-end justify-between h-64 gap-1">
              {dailyData.slice(-14).map((day, dayIdx) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  {/* Столбец дохода */}
                  <div className="relative w-full flex flex-col items-center">
                    <div
                      className="w-full bg-[var(--accent)] rounded-t transition-all duration-300 hover:opacity-80"
                      style={{
                        height: maxRevenue > 0 ? `${(day.revenue / maxRevenue) * 100}%` : '0%',
                        minHeight: day.revenue > 0 ? '4px' : '0px'
                      }}
                      title={`Доход: ${day.revenue.toLocaleString('ru-RU')} ₽`}
                    />
                    {/* Количество транзакций */}
                    <div
                      className="w-3/4 bg-[var(--ocean)] rounded-t opacity-70"
                      style={{
                        height: maxTransactions > 0 ? `${(day.transactions / maxTransactions) * 60}%` : '0%',
                        minHeight: day.transactions > 0 ? '2px' : '0px'
                      }}
                      title={`Транзакций: ${day.transactions}`}
                    />
                  </div>

                  {/* Дата */}
                  <span className="text-xs text-[var(--text-muted)] mt-2 transform -rotate-45 origin-top-left">
                    {new Date(day.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            {/* Сетка */}
            <div className="absolute inset-0 pointer-events-none">
              {[0, 25, 50, 75, 100].map((percent) => (
                <div
                  key={percent}
                  className="absolute w-full border-t border-[var(--border)]"
                  style={{ bottom: `${percent}%` }}
                >
                  <span className="absolute -left-8 -top-2 text-xs text-[var(--text-muted)]">
                    {percent === 0 ? '0' : `${Math.round(maxRevenue * percent / 100).toLocaleString('ru-RU')}₽`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Сводка */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
            <div className="text-center">
              <p className="text-lg font-bold font-mono text-[var(--accent)]">
                {dailyData.reduce((sum, day) => sum + day.revenue, 0).toLocaleString('ru-RU')} ₽
              </p>
              <p className="text-[var(--text-muted)] text-xs">Общий доход</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold font-mono text-[var(--accent)]">
                {dailyData.reduce((sum, day) => sum + day.transactions, 0)}
              </p>
              <p className="text-[var(--text-muted)] text-xs">Всего транзакций</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

