'use client';

import { Protected } from '@/components/auth/Protected';
import { AgentNav } from '@/components/agent/AgentNav';
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
      render: (v: Voucher) => <div className="font-mono text-white">{v.code}</div>,
    },
    {
      key: 'name',
      header: 'Название',
      render: (v: Voucher) => <div className="text-white">{v.name}</div>,
    },
    {
      key: 'discountValue',
      header: 'Скидка',
      render: (v: Voucher) => (
        <div className="text-green-400">
          {v.discountType === 'percentage' ? `${v.discountValue}%` : `${v.discountValue} ₽`}
        </div>
      ),
    },
    {
      key: 'usedCount',
      header: 'Использовано',
      render: (v: Voucher) => (
        <div className="text-white/70">
          {v.usedCount} {v.usageLimit ? `/ ${v.usageLimit}` : ''}
        </div>
      ),
    },
    {
      key: 'validTo',
      header: 'Действует до',
      render: (v: Voucher) => (
        <div className="text-white/70">{new Date(v.validTo).toLocaleDateString('ru-RU')}</div>
      ),
    },
  ];

  return (
    <Protected roles={['agent']}>
      <main className="min-h-screen bg-transparent text-white">
        <AgentNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-white mb-6">Ваучеры</h1>
          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable<Voucher> data={list} columns={columns} emptyMessage="Нет ваучеров" />
          )}
        </div>
      </main>
    </Protected>
  );
}

