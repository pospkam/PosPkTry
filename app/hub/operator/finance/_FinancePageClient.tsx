'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, LoadingSpinner, EmptyState, Column } from '@/components/admin/shared';
import { FinanceData, Transaction } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Clock, CheckCircle, Percent, LucideIcon } from 'lucide-react';

const SELECT = 'px-3.5 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors';

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
}

function MetricCard({ title, value, icon: Icon, iconColor, bgColor }: MetricCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-[var(--text-primary)] mb-1">{value}</div>
      <div className="text-sm text-[var(--text-muted)]">{title}</div>
    </div>
  );
}

export default function FinancePageClient() {
  const { user } = useAuth();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const operatorId = user?.id;

  useEffect(() => {
    fetchFinanceData();
  }, [period]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operator/finance?operatorId=${operatorId}&period=${period}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
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

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      booking: 'Бронирование',
      payout: 'Выплата',
      refund: 'Возврат',
      commission: 'Комиссия'
    };
    return labels[type] || type;
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      title: 'Дата',
      render: (tx) => (
        <span className="text-[var(--text-secondary)]">
          {new Date(tx.date).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'type',
      title: 'Тип',
      render: (tx) => (
        <span className="px-2 py-1 bg-[var(--bg-hover)] rounded-md text-xs text-[var(--text-secondary)]">
          {getTransactionTypeLabel(tx.type)}
        </span>
      )
    },
    {
      key: 'description',
      title: 'Описание',
      render: (tx) => (
        <span className="text-[var(--text-secondary)]">{tx.description}</span>
      )
    },
    {
      key: 'amount',
      title: 'Сумма',
      render: (tx) => (
        <span className={`font-semibold ${
          tx.type === 'refund' || tx.type === 'commission'
            ? 'text-[var(--danger)]'
            : 'text-[var(--success)]'
        }`}>
          {tx.type === 'refund' || tx.type === 'commission' ? '-' : '+'}
          {formatCurrency(tx.amount)}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Статус',
      render: (tx) => (
        <span className={`px-2 py-1 rounded-md text-xs ${
          tx.status === 'completed'
            ? 'bg-[var(--success)]/10 text-[var(--success)]'
            : 'bg-[var(--warning)]/10 text-[var(--warning)]'
        }`}>
          {tx.status === 'completed' ? 'Завершено' : 'В ожидании'}
        </span>
      )
    }
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Финансы</h1>
          <p className="text-[var(--text-muted)] mt-1">Выручка, выплаты и транзакции</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className={SELECT}
        >
          <option value="7">Последние 7 дней</option>
          <option value="30">Последние 30 дней</option>
          <option value="90">Последние 90 дней</option>
          <option value="365">Последний год</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Загрузка данных..." />
        </div>
      ) : !data ? (
        <EmptyState
          icon={<Wallet className="w-12 h-12 text-[var(--text-muted)] opacity-40" />}
          title="Нет данных"
          description="Финансовые данные не найдены"
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Общая выручка"
              value={formatCurrency(data.totalRevenue)}
              icon={Wallet}
              iconColor="text-[var(--accent)]"
              bgColor="bg-[var(--accent)]/10"
            />
            <MetricCard
              title="Ожидают выплаты"
              value={formatCurrency(data.pendingPayouts)}
              icon={Clock}
              iconColor="text-[var(--warning)]"
              bgColor="bg-[var(--warning)]/10"
            />
            <MetricCard
              title="Выплачено"
              value={formatCurrency(data.completedPayouts)}
              icon={CheckCircle}
              iconColor="text-[var(--success)]"
              bgColor="bg-[var(--success)]/10"
            />
            <MetricCard
              title="Комиссия платформы"
              value={formatCurrency(data.commission)}
              icon={Percent}
              iconColor="text-[var(--text-secondary)]"
              bgColor="bg-[var(--bg-hover)]"
            />
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--accent)]/30 rounded-lg p-6">
            <h3 className="text-[var(--text-muted)] mb-2">Чистый доход</h3>
            <p className="text-4xl font-black text-[var(--text-primary)]">
              {formatCurrency(data.netIncome)}
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-2">
              После вычета комиссии 10%
            </p>
          </div>

          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
              История транзакций
            </h2>
            {data.transactions.length > 0 ? (
              <DataTable columns={columns} data={data.transactions} />
            ) : (
              <EmptyState
                icon={<Wallet className="w-12 h-12 text-[var(--text-muted)] opacity-40" />}
                title="Нет транзакций"
                description="Транзакции появятся здесь"
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
