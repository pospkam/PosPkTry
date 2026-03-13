'use client';

import React from 'react';
import { DataTable, StatusBadge, Column } from '@/components/admin/shared';
import { OperatorBooking } from '@/types/operator';

interface RecentBookingsTableProps {
  bookings: OperatorBooking[];
  onViewDetails?: (booking: OperatorBooking) => void;
}

export function RecentBookingsTable({ bookings, onViewDetails }: RecentBookingsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'pending';
    }
  };

  const columns: Column<OperatorBooking>[] = [
    {
      key: 'id',
      title: 'ID',
      width: '100px',
      render: (booking) => (
        <span className="text-[var(--text-muted)] font-mono text-xs">
          #{booking.id.substring(0, 8)}
        </span>
      )
    },
    {
      key: 'tourName',
      title: 'Тур',
      render: (booking) => (
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{booking.tourName}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {new Date(booking.date).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      )
    },
    {
      key: 'userName',
      title: 'Клиент',
      render: (booking) => (
        <div>
          <p className="text-[var(--text-primary)]">{booking.userName}</p>
          <p className="text-xs text-[var(--text-muted)]">{booking.userEmail}</p>
        </div>
      )
    },
    {
      key: 'guestsCount',
      title: 'Гости',
      render: (booking) => (
        <span className="text-[var(--text-secondary)]">
          <span className="text-xl mr-1"></span>
          {booking.guestsCount}
        </span>
      )
    },
    {
      key: 'totalPrice',
      title: 'Сумма',
      render: (booking) => (
        <span className="font-semibold text-[var(--accent)]">
          {formatCurrency(booking.totalPrice)}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Статус',
      render: (booking) => (
        <StatusBadge status={getStatusType(booking.status) as any} />
      )
    },
    {
      key: 'createdAt',
      title: 'Дата заказа',
      render: (booking) => (
        <span className="text-[var(--text-muted)] text-sm">
          {new Date(booking.createdAt).toLocaleDateString('ru-RU')}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (booking) => (
        <button
          onClick={() => onViewDetails && onViewDetails(booking)}
          className="px-3 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg text-xs font-medium transition-colors"
        >
          Детали
        </button>
      )
    }
  ];

  return <DataTable columns={columns} data={bookings} />;
}



