'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '../shared/DataTable';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { StatusBadge } from '../shared/StatusBadge';

interface Payout {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  bookingId: string;
  bookingType: string;
  serviceName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

interface PayoutStats {
  totalPayouts: number;
  completedPayouts: number;
  pendingPayouts: number;
  totalPaid: number;
  pendingAmount: number;
}

export function PayoutsManager() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/finance/payouts');
      const result = await response.json();

      if (result.success) {
        setPayouts(result.data.payouts);
        setStats(result.data.stats);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayout = async (bookingId: string, partnerId: string, amount: number) => {
    try {
      const response = await fetch('/api/admin/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          partnerId,
          amount: amount * 0.15, // 15% комиссия
          description: `Комиссия за бронирование ${bookingId}`
        })
      });

      const result = await response.json();

      if (result.success) {
        fetchPayouts(); // Обновляем список
        alert('Выплата создана успешно');
      } else {
        alert(`Ошибка: ${result.error}`);
      }
    } catch (err) {
      console.error('Error creating payout:', err);
      alert('Ошибка при создании выплаты');
    }
  };

  const columns = [
    {
      key: 'partnerName',
      header: 'Партнер',
      render: (payout: Payout) => (
        <div>
          <div className="font-medium text-white">{payout.partnerName}</div>
          <div className="text-white/60 text-sm">{payout.partnerEmail}</div>
        </div>
      )
    },
    {
      key: 'serviceName',
      header: 'Услуга',
      render: (payout: Payout) => (
        <div>
          <div className="font-medium text-white">{payout.serviceName}</div>
          <div className="text-white/60 text-sm capitalize">{payout.bookingType}</div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (payout: Payout) => (
        <div className="font-medium text-premium-gold">
          {payout.amount.toLocaleString('ru-RU')} {payout.currency}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Статус',
      render: (payout: Payout) => (
        <StatusBadge status={payout.status} />
      )
    },
    {
      key: 'createdAt',
      header: 'Создано',
      render: (payout: Payout) => (
        <div className="text-white/70 text-sm">
          {new Date(payout.createdAt).toLocaleDateString('ru-RU')}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner message="Загрузка выплат..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
        <p className="text-red-400 mb-4">Ошибка загрузки данных</p>
        <button
          onClick={fetchPayouts}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика выплат */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalPayouts}</div>
            <div className="text-white/60 text-sm">Всего выплат</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.completedPayouts}</div>
            <div className="text-white/60 text-sm">Выполнено</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pendingPayouts}</div>
            <div className="text-white/60 text-sm">Ожидают</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {stats.totalPaid.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-white/60 text-sm">Выплачено</div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {stats.pendingAmount.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-white/60 text-sm">Ожидают выплаты</div>
          </div>
        </div>
      )}

      {/* Таблица выплат */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Выплаты партнерам</h3>
          <button
            onClick={fetchPayouts}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Обновить
          </button>
        </div>

        <DataTable
          data={payouts}
          columns={columns}
          emptyMessage="Нет выплат для отображения"
        />
      </div>
    </div>
  );
}

