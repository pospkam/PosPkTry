'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { AgentNav } from '@/components/agent/AgentNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';

export default function AgentVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const response = await fetch('/api/agent/vouchers');
      const result = await response.json();
      if (result.success) {
        setVouchers(result.data.vouchers);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Код',
      render: (v: any) => <div className="font-mono text-white">{v.code}</div>
    },
    {
      key: 'name',
      header: 'Название',
      render: (v: any) => <div className="text-white">{v.name}</div>
    },
    {
      key: 'discountValue',
      header: 'Скидка',
      render: (v: any) => (
        <div className="text-green-400">
          {v.discountType === 'percentage' ? `${v.discountValue}%` : `${v.discountValue} ₽`}
        </div>
      )
    },
    {
      key: 'usedCount',
      header: 'Использовано',
      render: (v: any) => (
        <div className="text-white/70">
          {v.usedCount} {v.usageLimit ? `/ ${v.usageLimit}` : ''}
        </div>
      )
    },
    {
      key: 'validTo',
      header: 'Действует до',
      render: (v: any) => (
        <div className="text-white/70">
          {new Date(v.validTo).toLocaleDateString('ru-RU')}
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
            Ваучеры
          </h1>
          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable data={vouchers} columns={columns} emptyMessage="Нет ваучеров" />
          )}
        </div>
      </main>
    </Protected>
  );
}

