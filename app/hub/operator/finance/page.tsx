'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { OperatorNav } from '@/components/operator/OperatorNav';
import { DataTable, LoadingSpinner, EmptyState, Column } from '@/components/admin/shared';
import { FinanceData, Transaction } from '@/types/operator';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Clock, CheckCircle, Percent, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
}

function MetricCard({ title, value, icon: Icon, iconColor, bgColor }: MetricCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-sm text-white/60">{title}</div>
    </div>
  );
}

export default function FinancePage() {
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
        <span className="text-white/80">
          {new Date(tx.date).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'type',
      title: 'Тип',
      render: (tx) => (
        <span className="px-2 py-1 bg-white/10 rounded-lg text-xs">
          {getTransactionTypeLabel(tx.type)}
        </span>
      )
    },
    {
      key: 'description',
      title: 'Описание',
      render: (tx) => (
        <span className="text-white/80">{tx.description}</span>
      )
    },
    {
      key: 'amount',
      title: 'Сумма',
      render: (tx) => (
        <span className={`font-semibold ${
          tx.type === 'refund' || tx.type === 'commission' 
            ? 'text-red-400' 
            : 'text-green-400'
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
        <span className={`px-2 py-1 rounded-lg text-xs ${
          tx.status === 'completed' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {tx.status === 'completed' ? 'Завершено' : 'В ожидании'}
        </span>
      )
    }
  ];

  return (
    <Protected roles={['operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <OperatorNav />

        <div className="bg-white/15 border-b border-white/15 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-white">Финансы</h1>
                <p className="text-white/70 mt-1">Выручка, выплаты и транзакции</p>
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-premium-gold"
              >
                <option value="7" className="bg-gray-900">Последние 7 дней</option>
                <option value="30" className="bg-gray-900">Последние 30 дней</option>
                <option value="90" className="bg-gray-900">Последние 90 дней</option>
                <option value="365" className="bg-gray-900">Последний год</option>
              </select>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" message="Загрузка данных..." />
            </div>
          ) : !data ? (
            <EmptyState
              icon={<Wallet className="w-12 h-12 text-white/30" />}
              title="Нет данных"
              description="Финансовые данные не найдены"
            />
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Общая выручка"
                  value={formatCurrency(data.totalRevenue)}
                  icon={Wallet}
                  iconColor="text-premium-gold"
                  bgColor="bg-premium-gold/20"
                />
                <MetricCard
                  title="Ожидают выплаты"
                  value={formatCurrency(data.pendingPayouts)}
                  icon={Clock}
                  iconColor="text-amber-400"
                  bgColor="bg-amber-500/20"
                />
                <MetricCard
                  title="Выплачено"
                  value={formatCurrency(data.completedPayouts)}
                  icon={CheckCircle}
                  iconColor="text-green-400"
                  bgColor="bg-green-500/20"
                />
                <MetricCard
                  title="Комиссия платформы"
                  value={formatCurrency(data.commission)}
                  icon={Percent}
                  iconColor="text-purple-400"
                  bgColor="bg-purple-500/20"
                />
              </div>

              <div className="bg-gradient-to-r from-premium-gold/20 to-premium-gold/10 border border-premium-gold/30 rounded-2xl p-6">
                <h3 className="text-white/70 mb-2">Чистый доход</h3>
                <p className="text-4xl font-black text-white">
                  {formatCurrency(data.netIncome)}
                </p>
                <p className="text-white/60 text-sm mt-2">
                  После вычета комиссии 10%
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4">
                  История транзакций
                </h2>
                {data.transactions.length > 0 ? (
                  <DataTable columns={columns} data={data.transactions} />
                ) : (
                  <EmptyState
                    icon={<Wallet className="w-12 h-12 text-white/30" />}
                    title="Нет транзакций"
                    description="Транзакции появятся здесь"
                  />
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </Protected>
  );
}
