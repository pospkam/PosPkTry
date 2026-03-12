'use client';

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
          <div className="font-medium text-[var(--text-primary)]">{booking.clientName}</div>
          <div className="text-[var(--text-muted)] text-sm">{booking.clientEmail}</div>
        </div>
      ),
    },
    {
      key: 'tourName',
      header: 'Тур',
      render: (booking: AgentBooking) => (
        <div className="text-[var(--text-primary)]">{booking.tourName}</div>
      ),
    },
    {
      key: 'tourDate',
      header: 'Дата',
      render: (booking: AgentBooking) => (
        <div className="text-[var(--text-secondary)]">
          {new Date(booking.tourDate).toLocaleDateString('ru-RU')}
        </div>
      ),
    },
    {
      key: 'totalPrice',
      header: 'Сумма',
      render: (booking: AgentBooking) => (
        <div className="font-medium text-[var(--text-primary)]">
          {booking.totalPrice?.toLocaleString('ru-RU')} ₽
        </div>
      ),
    },
    {
      key: 'agentCommission',
      header: 'Комиссия',
      render: (booking: AgentBooking) => (
        <div className="font-medium text-[var(--success)]">
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
    <div className="p-5 lg:p-6 space-y-5">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Бронирования</h1>
      {loading ? (
        <LoadingSpinner message="Загрузка..." />
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <DataTable<AgentBooking>
            data={list}
            columns={columns}
            emptyMessage="Нет бронирований"
          />
        </div>
      )}
    </div>
  );
}
