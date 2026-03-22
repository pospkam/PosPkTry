'use client';

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
      render: (c: Commission) => (
        <div className="font-mono text-[var(--text-secondary)] text-sm">{c.bookingId}</div>
      ),
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (c: Commission) => (
        <div className="font-bold text-[var(--text-primary)]">
          {c.amount?.toLocaleString('ru-RU')} ₽
        </div>
      ),
    },
    {
      key: 'rate',
      header: 'Ставка',
      render: (c: Commission) => (
        <div className="text-[var(--text-secondary)]">{c.rate}%</div>
      ),
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
        <div className="text-[var(--text-secondary)] text-sm">
          {new Date(c.createdAt).toLocaleDateString('ru-RU')}
        </div>
      ),
    },
  ];

  const s = stats ?? EMPTY_STATS;

  return (
    <div className="p-5 lg:p-6 space-y-5">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Комиссионные</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[var(--success)]">
            {s.totalPaid.toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[var(--text-muted)] text-sm mt-1">Выплачено</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[var(--warning)]">
            {s.totalPending.toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[var(--text-muted)] text-sm mt-1">Ожидает</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {s.totalAll.toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[var(--text-muted)] text-sm mt-1">Всего</div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Загрузка..." />
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <DataTable<Commission>
            data={commissions}
            columns={columns}
            emptyMessage="Нет комиссионных"
          />
        </div>
      )}
    </div>
  );
}
