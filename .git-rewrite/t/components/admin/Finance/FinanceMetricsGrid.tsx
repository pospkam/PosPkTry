'use client';

import React, { useState, useEffect } from 'react';
import { MetricCard } from '../shared/MetricCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { Banknote, CreditCard, BarChart3, Users } from 'lucide-react';

interface FinanceMetrics {
  totalTransactions: number;
  totalRevenue: number;
  avgTransaction: number;
  uniqueCustomers: number;
  period: string;
}

interface FinanceMetricsGridProps {
  period?: string;
  type?: string;
}

export function FinanceMetricsGrid({ period = '30', type = 'all' }: FinanceMetricsGridProps) {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [period, type]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period, type });
      const response = await fetch(`/api/admin/finance?${params}`);
      const result = await response.json();

      if (result.success) {
        setMetrics(result.data.metrics);
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
        <LoadingSpinner message="Загрузка финансовых метрик..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--danger)]/8 border border-[var(--danger)]/15 rounded-lg p-6 text-center">
        <p className="text-[var(--danger)] text-sm mb-4">Ошибка загрузки данных</p>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/15 text-[var(--danger)] text-xs font-medium rounded-lg transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Общий доход"
        value={`${metrics.totalRevenue.toLocaleString('ru-RU')} ₽`}
        icon={<Banknote className="w-6 h-6" />}
        trend={metrics.totalRevenue > 0 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Количество транзакций"
        value={metrics.totalTransactions.toString()}
        icon={<CreditCard className="w-6 h-6" />}
        trend={metrics.totalTransactions > 0 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Средний чек"
        value={`${metrics.avgTransaction.toLocaleString('ru-RU')} ₽`}
        icon={<BarChart3 className="w-6 h-6" />}
        trend={metrics.avgTransaction > 1000 ? 'up' : 'neutral'}
      />

      <MetricCard
        title="Уникальных клиентов"
        value={metrics.uniqueCustomers.toString()}
        icon={<Users className="w-6 h-6" />}
        trend={metrics.uniqueCustomers > 0 ? 'up' : 'neutral'}
      />
    </div>
  );
}

