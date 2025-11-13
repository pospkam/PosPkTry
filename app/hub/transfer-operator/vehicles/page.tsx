'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { TransferOperatorNav } from '@/components/transfer-operator/TransferOperatorNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/transfer-operator/vehicles');
      const result = await response.json();
      if (result.success) {
        setVehicles(result.data.vehicles);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Транспорт',
      render: (v: any) => (
        <div>
          <div className="font-medium text-white">{v.name}</div>
          <div className="text-white/60 text-sm">{v.licensePlate}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Тип',
      render: (v: any) => <div className="capitalize text-premium-gold">{v.type}</div>
    },
    {
      key: 'capacity',
      header: 'Вместимость',
      render: (v: any) => <div className="text-white">{v.capacity} мест</div>
    },
    {
      key: 'status',
      header: 'Статус',
      render: (v: any) => <StatusBadge status={v.status} />
    },
    {
      key: 'location',
      header: 'Локация',
      render: (v: any) => <div className="text-white/70">{v.location}</div>
    }
  ];

  return (
    <Protected roles={['transfer_operator']}>
      <main className="min-h-screen bg-premium-black text-white">
        <TransferOperatorNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-premium-gold mb-6">
            Транспортные средства
          </h1>
          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable data={vehicles} columns={columns} emptyMessage="Нет транспорта" />
          )}
        </div>
      </main>
    </Protected>
  );
}

