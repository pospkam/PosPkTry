'use client';

import React from 'react';
import { DataTable, Column } from '@/components/admin/shared';
import { TourStats } from '@/types/operator';

interface TopToursTableProps {
  tours: TourStats[];
}

export function TopToursTable({ tours }: TopToursTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const columns: Column<TourStats>[] = [
    {
      key: 'tourName',
      title: 'Название тура',
      render: (tour) => (
        <span className="font-semibold text-white">{tour.tourName}</span>
      )
    },
    {
      key: 'bookingsCount',
      title: 'Бронирований',
      sortable: true,
      render: (tour) => (
        <div className="flex items-center">
          <span className="text-2xl mr-2">📅</span>
          <span className="font-semibold text-white">{tour.bookingsCount}</span>
        </div>
      )
    },
    {
      key: 'revenue',
      title: 'Выручка',
      sortable: true,
      render: (tour) => (
        <span className="font-semibold text-premium-gold">
          {formatCurrency(tour.revenue)}
        </span>
      )
    },
    {
      key: 'averageRating',
      title: 'Рейтинг',
      sortable: true,
      render: (tour) => (
        <div className="flex items-center">
          <span className="text-yellow-400 mr-1">★</span>
          <span className="text-white">{tour.averageRating.toFixed(1)}</span>
          <span className="text-white/50 text-xs ml-1">
            ({tour.reviewCount})
          </span>
        </div>
      )
    },
    {
      key: 'completionRate',
      title: 'Завершено',
      sortable: true,
      render: (tour) => (
        <div className="flex items-center">
          <div className="w-full bg-white/10 rounded-full h-2 mr-2" style={{ width: '100px' }}>
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${tour.completionRate}%` }}
            />
          </div>
          <span className="text-white/80 text-sm">{tour.completionRate.toFixed(0)}%</span>
        </div>
      )
    }
  ];

  return <DataTable columns={columns} data={tours} />;
}



