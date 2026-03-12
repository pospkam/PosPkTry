'use client';

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
          <div className="font-medium text-[var(--text-primary)]">
            {d.firstName} {d.lastName}
          </div>
          <div className="text-[var(--text-muted)] text-sm">{d.phone}</div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Рейтинг',
      render: (d: Driver) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-[var(--text-primary)]">{d.rating?.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'totalTrips',
      header: 'Поездок',
      render: (d: Driver) => (
        <div className="text-[var(--text-primary)]">{d.totalTrips}</div>
      ),
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
        <div className="text-[var(--text-secondary)] text-sm">
          {new Date(d.licenseExpiry).toLocaleDateString('ru-RU')}
        </div>
      ),
    },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Водители</h1>
      {loading ? (
        <LoadingSpinner message="Загрузка..." />
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <DataTable<Driver> data={list} columns={columns} emptyMessage="Нет водителей" />
        </div>
      )}
    </div>
  );
}
