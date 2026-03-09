'use client';

import { Protected } from '@/components/auth/Protected';
import { AgentNav } from '@/components/agent/AgentNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface Commission {
  id: string;
  bookingId: string;
  amount: number;
  rate: number;
  status: string;
  createdAt: string;
}

interface CommissionStats {
  totalPaid: number;
  totalPending: number;
  totalAll: number;
}

interface CommissionsApiResponse {
  commissions: Commission[];
  stats: CommissionStats;
}

interface CommissionsData {
  commissions: Commission[];
  stats: CommissionStats | null;
}

const EMPTY_STATS: CommissionStats = { totalPaid: 0, totalPending: 0, totalAll: 0 };

export default function AgentCommissionsPageClient() {
  const { data, loading } = useApiFetch<CommissionsApiResponse, CommissionsData>(
    '/api/agent/commissions',
    (d) => ({
      commissions: d?.commissions ?? [],
      stats: d?.stats ?? null,
    }),
  );

  const commissions = data?.commissions ?? [];
  const stats = data?.stats ?? null;

  const columns = [
    {
      key: 'bookingId',
      header: 'Бронирование',
      render: (c: Commission) => <div className="font-mono text-white/70 text-sm">{c.bookingId}</div>,
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (c: Commission) => (
        <div className="font-bold text-white">{c.amount?.toLocaleString('ru-RU')} ₽</div>
      ),
    },
    {
      key: 'rate',
      header: 'Ставка',
      render: (c: Commission) => <div className="text-white/70">{c.rate}%</div>,
    },
    {
      key: 'status',
      header: 'Статус',
      render: (c: Commission) => <StatusBadge status={c.status} />,
    },
    {
      key: 'createdAt',
      header: 'Дата',
      render: (c: Commission) => (
        <div className="text-white/70 text-sm">
          {new Date(c.createdAt).toLocaleDateString('ru-RU')}
        </div>
      ),
    },
  ];

  const s = stats ?? EMPTY_STATS;

  return (
    <Protected roles={['agent']}>
      <main className="min-h-screen bg-transparent text-white">
        <AgentNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-white mb-6">Комиссионные</h1>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/15 border border-white/15 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {s.totalPaid.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-white/60 text-sm">Выплачено</div>
            </div>
            <div className="bg-white/15 border border-white/15 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {s.totalPending.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-white/60 text-sm">Ожидает</div>
            </div>
            <div className="bg-white/15 border border-white/15 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {s.totalAll.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-white/60 text-sm">Всего</div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable<Commission> data={commissions} columns={columns} emptyMessage="Нет комиссионных" />
          )}
        </div>
      </main>
    </Protected>
  );
}
