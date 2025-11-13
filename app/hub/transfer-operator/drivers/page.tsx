'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { TransferOperatorNav } from '@/components/transfer-operator/TransferOperatorNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/transfer-operator/drivers');
      const result = await response.json();
      if (result.success) {
        setDrivers(result.data.drivers);
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
      header: 'Водитель',
      render: (d: any) => (
        <div>
          <div className="font-medium text-white">{d.firstName} {d.lastName}</div>
          <div className="text-white/60 text-sm">{d.phone}</div>
        </div>
      )
    },
    {
      key: 'rating',
      header: 'Рейтинг',
      render: (d: any) => (
        <div className="flex items-center gap-1">
          <span>⭐</span>
          <span className="text-premium-gold">{d.rating?.toFixed(1)}</span>
        </div>
      )
    },
    {
      key: 'totalTrips',
      header: 'Поездок',
      render: (d: any) => <div className="text-white">{d.totalTrips}</div>
    },
    {
      key: 'status',
      header: 'Статус',
      render: (d: any) => <StatusBadge status={d.status} />
    },
    {
      key: 'licenseExpiry',
      header: 'Лицензия до',
      render: (d: any) => (
        <div className="text-white/70 text-sm">
          {new Date(d.licenseExpiry).toLocaleDateString('ru-RU')}
        </div>
      )
    }
  ];

  return (
    <Protected roles={['transfer_operator']}>
      <main className="min-h-screen bg-premium-black text-white">
        <TransferOperatorNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-premium-gold mb-6">
            Водители
          </h1>
          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable data={drivers} columns={columns} emptyMessage="Нет водителей" />
          )}
        </div>
      </main>
    </Protected>
  );
}

