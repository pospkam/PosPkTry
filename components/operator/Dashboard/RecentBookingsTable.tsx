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
        <span className="text-white/60 font-mono text-xs">
          #{booking.id.substring(0, 8)}
        </span>
      )
    },
    {
      key: 'tourName',
      title: 'Тур',
      render: (booking) => (
        <div>
          <p className="font-semibold text-white">{booking.tourName}</p>
          <p className="text-xs text-white/60">
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
          <p className="text-white">{booking.userName}</p>
          <p className="text-xs text-white/60">{booking.userEmail}</p>
        </div>
      )
    },
    {
      key: 'guestsCount',
      title: 'Гости',
      render: (booking) => (
        <span className="text-white/80">
          <span className="text-xl mr-1"></span>
          {booking.guestsCount}
        </span>
      )
    },
    {
      key: 'totalPrice',
      title: 'Сумма',
      render: (booking) => (
        <span className="font-semibold text-premium-gold">
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
        <span className="text-white/60 text-sm">
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
          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors"
        >
          Детали
        </button>
      )
    }
  ];

  return <DataTable columns={columns} data={bookings} />;
}



