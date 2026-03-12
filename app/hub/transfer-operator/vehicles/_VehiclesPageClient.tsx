'use client';

import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  type: string;
  capacity: number;
  status: string;
  location: string;
}

interface VehiclesApiResponse {
  vehicles: Vehicle[];
}

export default function VehiclesPageClient() {
  const { data: vehicles, loading } = useApiFetch<VehiclesApiResponse, Vehicle[]>(
    '/api/transfer-operator/vehicles',
    (d) => d?.vehicles ?? [],
  );

  const list = vehicles ?? [];

  const columns = [
    {
      key: 'name',
      header: 'Транспорт',
      render: (v: Vehicle) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{v.name}</div>
          <div className="text-[var(--text-muted)] text-sm">{v.licensePlate}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Тип',
      render: (v: Vehicle) => (
        <div className="capitalize text-[var(--text-primary)]">{v.type}</div>
      ),
    },
    {
      key: 'capacity',
      header: 'Вместимость',
      render: (v: Vehicle) => (
        <div className="text-[var(--text-primary)]">{v.capacity} мест</div>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (v: Vehicle) => <StatusBadge status={v.status} />,
    },
    {
      key: 'location',
      header: 'Локация',
      render: (v: Vehicle) => (
        <div className="text-[var(--text-secondary)]">{v.location}</div>
      ),
    },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Транспортные средства</h1>
      {loading ? (
        <LoadingSpinner message="Загрузка..." />
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <DataTable<Vehicle> data={list} columns={columns} emptyMessage="Нет транспорта" />
        </div>
      )}
    </div>
  );
}
