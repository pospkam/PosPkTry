'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '../shared/DataTable';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { StatusBadge } from '../shared/StatusBadge';
import toast from 'react-hot-toast';

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
    } catch {
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
        toast.success('Выплата создана успешно');
      } else {
        toast.error(`Ошибка: ${result.error}`);
      }
    } catch {
      toast.error('Ошибка при создании выплаты');
    }
  };

  const columns = [
    {
      key: 'partnerName',
      header: 'Партнер',
      render: (payout: Payout) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{payout.partnerName}</div>
          <div className="text-[var(--text-muted)] text-sm">{payout.partnerEmail}</div>
        </div>
      )
    },
    {
      key: 'serviceName',
      header: 'Услуга',
      render: (payout: Payout) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{payout.serviceName}</div>
          <div className="text-[var(--text-muted)] text-sm capitalize">{payout.bookingType}</div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (payout: Payout) => (
        <div className="font-medium text-[var(--accent)]">
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
        <div className="text-[var(--text-muted)] text-sm">
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
      <div className="bg-[var(--danger)]/8 border border-[var(--danger)]/15 rounded-lg p-6 text-center">
        <p className="text-[var(--danger)] text-sm mb-4">Ошибка загрузки данных</p>
        <button
          onClick={fetchPayouts}
          className="px-4 py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/15 text-[var(--danger)] text-xs font-medium rounded-lg transition-colors"
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-mono text-[var(--text-primary)]">{stats.totalPayouts}</div>
            <div className="text-[var(--text-muted)] text-xs">Всего выплат</div>
          </div>
          <div className="bg-[var(--success)]/8 border border-[var(--success)]/15 rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-mono text-[var(--success)]">{stats.completedPayouts}</div>
            <div className="text-[var(--text-muted)] text-xs">Выполнено</div>
          </div>
          <div className="bg-[var(--warning)]/8 border border-[var(--warning)]/15 rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-mono text-[var(--warning)]">{stats.pendingPayouts}</div>
            <div className="text-[var(--text-muted)] text-xs">Ожидают</div>
          </div>
          <div className="bg-[var(--accent)]/8 border border-[var(--accent)]/15 rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-mono text-[var(--accent)]">
              {stats.totalPaid.toLocaleString('ru-RU')} &#8381;
            </div>
            <div className="text-[var(--text-muted)] text-xs">Выплачено</div>
          </div>
          <div className="bg-[var(--warning)]/8 border border-[var(--warning)]/15 rounded-lg p-4 text-center">
            <div className="text-xl font-bold font-mono text-[var(--warning)]">
              {stats.pendingAmount.toLocaleString('ru-RU')} &#8381;
            </div>
            <div className="text-[var(--text-muted)] text-xs">Ожидают выплаты</div>
          </div>
        </div>
      )}

      {/* Таблица выплат */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Выплаты партнерам</h3>
          <button
            onClick={fetchPayouts}
            className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg transition-colors"
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

