'use client';

import React, { useState, useEffect } from 'react';
import { Protected } from '@/components/Protected';
import { AgentNav } from '@/components/agent/AgentNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';

export default function AgentBookingsPageClient() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/agent/bookings');
      const result = await response.json();
      if (result.success) {
        setBookings(result.data.bookings);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'clientName',
      header: 'Клиент',
      render: (booking: any) => (
        <div>
          <div className="font-medium text-white">{booking.clientName}</div>
          <div className="text-white/60 text-sm">{booking.clientEmail}</div>
        </div>
      )
    },
    {
      key: 'tourName',
      header: 'Тур',
      render: (booking: any) => (
        <div className="text-white">{booking.tourName}</div>
      )
    },
    {
      key: 'tourDate',
      header: 'Дата',
      render: (booking: any) => (
        <div className="text-white/70">
          {new Date(booking.tourDate).toLocaleDateString('ru-RU')}
        </div>
      )
    },
    {
      key: 'totalPrice',
      header: 'Сумма',
      render: (booking: any) => (
        <div className="font-medium text-white">
          {booking.totalPrice?.toLocaleString('ru-RU')} ₽
        </div>
      )
    },
    {
      key: 'agentCommission',
      header: 'Комиссия',
      render: (booking: any) => (
        <div className="font-medium text-green-400">
          {booking.agentCommission?.toLocaleString('ru-RU')} ₽
        </div>
      )
    },
    {
      key: 'status',
      header: 'Статус',
      render: (booking: any) => <StatusBadge status={booking.status} />
    }
  ];

  return (
    <Protected roles={['agent']}>
      <main className="min-h-screen bg-transparent text-white">
        <AgentNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-white mb-6">
            Бронирования
          </h1>
          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable data={bookings} columns={columns} emptyMessage="Нет бронирований" />
          )}
        </div>
      </main>
    </Protected>
  );
}

