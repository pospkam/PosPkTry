'use client';

import { Protected } from '@/components/auth/Protected';
import { TransferOperatorNav } from '@/components/transfer-operator/TransferOperatorNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { Star } from 'lucide-react';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  rating: number;
  totalTrips: number;
  status: string;
  licenseExpiry: string;
}

interface DriversApiResponse {
  drivers: Driver[];
}

export default function DriversPageClient() {
  const { data: drivers, loading } = useApiFetch<DriversApiResponse, Driver[]>(
    '/api/transfer-operator/drivers',
    (d) => d?.drivers ?? [],
  );

  const list = drivers ?? [];

  const columns = [
    {
      key: 'name',
      header: 'Водитель',
      render: (d: Driver) => (
        <div>
          <div className="font-medium text-white">{d.firstName} {d.lastName}</div>
          <div className="text-white/60 text-sm">{d.phone}</div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Рейтинг',
      render: (d: Driver) => (
        <div className="flex items-center gap-1">
          <span><Star className="w-4 h-4" /></span>
          <span className="text-white">{d.rating?.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'totalTrips',
      header: 'Поездок',
      render: (d: Driver) => <div className="text-white">{d.totalTrips}</div>,
    },
    {
      key: 'status',
      header: 'Статус',
      render: (d: Driver) => <StatusBadge status={d.status} />,
    },
    {
      key: 'licenseExpiry',
      header: 'Лицензия до',
      render: (d: Driver) => (
        <div className="text-white/70 text-sm">
          {new Date(d.licenseExpiry).toLocaleDateString('ru-RU')}
        </div>
      ),
    },
  ];

  return (
    <Protected roles={['transfer', 'operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <TransferOperatorNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-white mb-6">Водители</h1>
          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable<Driver> data={list} columns={columns} emptyMessage="Нет водителей" />
          )}
        </div>
      </main>
    </Protected>
  );
}

