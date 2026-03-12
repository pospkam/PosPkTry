'use client';

import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface Voucher {
  id: string;
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usedCount: number;
  usageLimit: number | null;
  validTo: string;
}

interface VouchersApiResponse {
  vouchers: Voucher[];
}

export default function AgentVouchersPageClient() {
  const { data: vouchers, loading } = useApiFetch<VouchersApiResponse, Voucher[]>(
    '/api/agent/vouchers',
    (d) => d?.vouchers ?? [],
  );

  const list = vouchers ?? [];

  const columns = [
    {
      key: 'code',
      header: 'Код',
      render: (v: Voucher) => (
        <div className="font-mono text-[var(--text-primary)]">{v.code}</div>
      ),
    },
    {
      key: 'name',
      header: 'Название',
      render: (v: Voucher) => <div className="text-[var(--text-primary)]">{v.name}</div>,
    },
    {
      key: 'discountValue',
      header: 'Скидка',
      render: (v: Voucher) => (
        <div className="text-[var(--success)]">
          {v.discountType === 'percentage' ? `${v.discountValue}%` : `${v.discountValue} ₽`}
        </div>
      ),
    },
    {
      key: 'usedCount',
      header: 'Использовано',
      render: (v: Voucher) => (
        <div className="text-[var(--text-secondary)]">
          {v.usedCount} {v.usageLimit ? `/ ${v.usageLimit}` : ''}
        </div>
      ),
    },
    {
      key: 'validTo',
      header: 'Действует до',
      render: (v: Voucher) => (
        <div className="text-[var(--text-secondary)]">
          {new Date(v.validTo).toLocaleDateString('ru-RU')}
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Ваучеры</h1>
      {loading ? (
        <LoadingSpinner message="Загрузка..." />
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <DataTable<Voucher> data={list} columns={columns} emptyMessage="Нет ваучеров" />
        </div>
      )}
    </div>
  );
}
