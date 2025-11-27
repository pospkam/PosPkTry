'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { AgentNav } from '@/components/agent/AgentNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';

export default function AgentCommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const response = await fetch('/api/agent/commissions');
      const result = await response.json();
      if (result.success) {
        setCommissions(result.data.commissions);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'bookingId',
      header: 'Бронирование',
      render: (c: any) => <div className="font-mono text-white/70 text-sm">{c.bookingId}</div>
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (c: any) => (
        <div className="font-bold text-white">
          {c.amount?.toLocaleString('ru-RU')} ₽
        </div>
      )
    },
    {
      key: 'rate',
      header: 'Ставка',
      render: (c: any) => <div className="text-white/70">{c.rate}%</div>
    },
    {
      key: 'status',
      header: 'Статус',
      render: (c: any) => <StatusBadge status={c.status} />
    },
    {
      key: 'createdAt',
      header: 'Дата',
      render: (c: any) => (
        <div className="text-white/70 text-sm">
          {new Date(c.createdAt).toLocaleDateString('ru-RU')}
        </div>
      )
    }
  ];

  return (
    <Protected roles={['agent']}>
      <main className="min-h-screen bg-transparent text-white">
        <AgentNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-white mb-6">
            Комиссионные
          </h1>

          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/25 border border-white/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {stats.totalPaid?.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-white/60 text-sm">Выплачено</div>
              </div>
              <div className="bg-white/25 border border-white/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {stats.totalPending?.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-white/60 text-sm">Ожидает</div>
              </div>
              <div className="bg-white/25 border border-white/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {stats.totalAll?.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-white/60 text-sm">Всего</div>
              </div>
            </div>
          )}

          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable data={commissions} columns={columns} emptyMessage="Нет комиссионных" />
          )}
        </div>
      </main>
    </Protected>
  );
}

