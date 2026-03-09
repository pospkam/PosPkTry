'use client';

import { Protected } from '@/components/auth/Protected';
import { TransferOperatorNav } from '@/components/transfer-operator/TransferOperatorNav';
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
          <div className="font-medium text-white">{v.name}</div>
          <div className="text-white/60 text-sm">{v.licensePlate}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Тип',
      render: (v: Vehicle) => <div className="capitalize text-white">{v.type}</div>,
    },
    {
      key: 'capacity',
      header: 'Вместимость',
      render: (v: Vehicle) => <div className="text-white">{v.capacity} мест</div>,
    },
    {
      key: 'status',
      header: 'Статус',
      render: (v: Vehicle) => <StatusBadge status={v.status} />,
    },
    {
      key: 'location',
      header: 'Локация',
      render: (v: Vehicle) => <div className="text-white/70">{v.location}</div>,
    },
  ];

  return (
    <Protected roles={['transfer', 'operator', 'admin']}>
      <main className="min-h-screen bg-transparent text-white">
        <TransferOperatorNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-white mb-6">Транспортные средства</h1>
          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable<Vehicle> data={list} columns={columns} emptyMessage="Нет транспорта" />
          )}
        </div>
      </main>
    </Protected>
  );
}

