'use client';

import { Protected } from '@/components/auth/Protected';
import { AgentNav } from '@/components/agent/AgentNav';
import { DataTable } from '@/components/admin/shared/DataTable';
import { LoadingSpinner } from '@/components/admin/shared/LoadingSpinner';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { useApiFetch } from '@/hooks/use-api-fetch';

interface AgentBooking {
  id: string;
  clientName: string;
  clientEmail: string;
  tourName: string;
  tourDate: string;
  totalPrice: number;
  agentCommission: number;
  status: string;
}

interface AgentBookingsApiResponse {
  bookings: AgentBooking[];
}

export default function AgentBookingsPageClient() {
  const { data: bookings, loading } = useApiFetch<AgentBookingsApiResponse, AgentBooking[]>(
    '/api/agent/bookings',
    (d) => d?.bookings ?? [],
  );

  const list = bookings ?? [];

  const columns = [
    {
      key: 'clientName',
      header: 'Клиент',
      render: (booking: AgentBooking) => (
        <div>
          <div className="font-medium text-white">{booking.clientName}</div>
          <div className="text-white/60 text-sm">{booking.clientEmail}</div>
        </div>
      ),
    },
    {
      key: 'tourName',
      header: 'Тур',
      render: (booking: AgentBooking) => <div className="text-white">{booking.tourName}</div>,
    },
    {
      key: 'tourDate',
      header: 'Дата',
      render: (booking: AgentBooking) => (
        <div className="text-white/70">
          {new Date(booking.tourDate).toLocaleDateString('ru-RU')}
        </div>
      ),
    },
    {
      key: 'totalPrice',
      header: 'Сумма',
      render: (booking: AgentBooking) => (
        <div className="font-medium text-white">{booking.totalPrice?.toLocaleString('ru-RU')} ₽</div>
      ),
    },
    {
      key: 'agentCommission',
      header: 'Комиссия',
      render: (booking: AgentBooking) => (
        <div className="font-medium text-green-400">
          {booking.agentCommission?.toLocaleString('ru-RU')} ₽
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (booking: AgentBooking) => <StatusBadge status={booking.status} />,
    },
  ];

  return (
    <Protected roles={['agent']}>
      <main className="min-h-screen bg-transparent text-white">
        <AgentNav />
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-black text-white mb-6">Бронирования</h1>
          {loading ? (
            <LoadingSpinner message="Загрузка..." />
          ) : (
            <DataTable<AgentBooking> data={list} columns={columns} emptyMessage="Нет бронирований" />
          )}
        </div>
      </main>
    </Protected>
  );
}
